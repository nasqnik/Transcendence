from rest_framework import serializers
from .models import AvatarItem, KidAvatar, ParentProfile, RewardPurchase

class AvatarItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvatarItem
        fields = ['id', 'name', 'type', 'image_url', 'coin_cost', 'is_active']

class KidAvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = KidAvatar
        fields = [
            'id', 'kid_id', 'base_character', 'unlocked_items',
            'equipped_hat', 'equipped_outfit',
            'equipped_accessory', 'equipped_background',
            'updated_at',
        ]

class KidAvatarDetailSerializer(serializers.ModelSerializer):
    unlocked_items = serializers.SerializerMethodField()

    class Meta:
        model = KidAvatar
        fields = [
            'id', 'kid_id', 'base_character', 'unlocked_items',
            'equipped_hat', 'equipped_outfit',
            'equipped_accessory', 'equipped_background',
            'updated_at',
        ]

    def get_unlocked_items(self, obj):
        from .models import AvatarItem
        items = AvatarItem.objects.filter(id__in=obj.unlocked_items)
        return AvatarItemSerializer(items, many=True).data


class RewardPurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardPurchase
        fields = ['id', 'kid_id', 'item', 'coins_spent', 'purchased_at']

class PurchaseSerializer(serializers.Serializer):
    item_id = serializers.UUIDField(
        help_text='The UUID of the avatar item to purchase equip.'
    )

class EquipSerializer(serializers.Serializer):
    item_id = serializers.UUIDField(
        help_text='The UUID of the avatar item to equip.'
    )

class UnequipSerializer(serializers.Serializer):
    slot = serializers.ChoiceField(
        choices=['hat', 'outfit', 'accessory', 'background'],
        help_text='Avatar slot to unequip (hat, outfit, accessory, background).'
    )

class PurchaseResourceSerializer(serializers.Serializer):
    detail = serializers.CharField(
        help_text="Success message."
    )
    remaining_coins = serializers.IntegerField(
        help_text="Remaining coins after purchase."
    )

class ParentProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(
        required=False,
        help_text="Parent's profile picture."
    )

    class Meta:
        model = ParentProfile
        fields = ['id', 'parent_id', 'profile_picture', 'updated_at']


class ParentProfileUploadSerializer(serializers.Serializer):
    profile_picture = serializers.ImageField(
        help_text="Image file to upload as profile picture. Max 2MB. Formats: JPEG, PNG, WebP."
    )

    def validate_profile_picture(self, image):
        if image.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Image size should not exceed 2MB.")
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if image.content_type not in allowed_types:
            raise serializers.ValidationError("Invalid image format. Allowed formats: JPEG, PNG, WebP.")
        return image