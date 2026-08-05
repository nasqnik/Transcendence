from rest_framework import serializers
from .models import CATEGORY_CHOICES, KidStat, KidProfile

class CategoryPointSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=CATEGORY_CHOICES)
    points = serializers.IntegerField(min_value=0)

class CompletionIngestSerializer(serializers.Serializer):
    completion_id = serializers.UUIDField()
    kid_id = serializers.UUIDField()
    category_points = CategoryPointSerializer(many=True)

class CoinDeductSerializer(serializers.Serializer):
    kid_id = serializers.UUIDField()
    amount = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=64)

class StatLevelUpSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=CATEGORY_CHOICES)
    level = serializers.IntegerField()


class RewardSummarySerializer(serializers.Serializer):
    """What a single completion earned, plus the totals it resulted in."""
    completion_id = serializers.UUIDField()
    coins_awarded = serializers.IntegerField()
    stat_level_ups = StatLevelUpSerializer(many=True)
    coins_total = serializers.IntegerField()
    overall_xp = serializers.IntegerField()
    main_level = serializers.IntegerField()


class RewardsSeenSerializer(serializers.Serializer):
    completion_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        help_text='Omit to acknowledge every pending reward for the kid.',
    )


class KidStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = KidStat
        fields = ['category', 'level', 'xp_percent']

class KidProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = KidProfile
        fields = ['main_level', 'overall_xp', 'coins']