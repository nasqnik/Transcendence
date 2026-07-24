from django.db.models import Q
from rest_framework import serializers

from .auth_client import assert_active_kid_exists, fetch_kids_by_ids
from .enrichment_clients import fetch_avatars_by_ids, fetch_progress_by_ids
from .models import Friendship
from .presence import online_among


def either_direction_q(a, b):
    return Q(from_kid_id=a, to_kid_id=b) | Q(from_kid_id=b, to_kid_id=a)


def involving_kid_q(kid_id):
    return Q(from_kid_id=kid_id) | Q(to_kid_id=kid_id)


class FriendRequestCreateSerializer(serializers.Serializer):
    to_kid_id = serializers.UUIDField()

    def validate_to_kid_id(self, value):
        me = self.context['request'].user.kid_id
        if value == me:
            raise serializers.ValidationError('You cannot friend yourself.')
        assert_active_kid_exists(value)
        return value

    def validate(self, attrs):
        me = self.context['request'].user.kid_id
        to_kid_id = attrs['to_kid_id']
        exists = Friendship.objects.filter(
            either_direction_q(me, to_kid_id),
            status__in=[
                Friendship.Status.PENDING,
                Friendship.Status.ACCEPTED,
            ],
        ).exists()
        if exists:
            raise serializers.ValidationError(
                'A pending or accepted friendship already exists with this kid.'
            )
        return attrs

    def create(self, validated_data):
        me = self.context['request'].user.kid_id
        return Friendship.objects.create(
            from_kid_id=me,
            to_kid_id=validated_data['to_kid_id'],
            status=Friendship.Status.PENDING,
        )


class FriendshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friendship
        fields = (
            'id',
            'from_kid_id',
            'to_kid_id',
            'status',
            'created_at',
            'responded_at',
        )
        read_only_fields = fields


class FriendAvatarSerializer(serializers.Serializer):
    base_character = serializers.CharField()
    equipped_hat = serializers.UUIDField(allow_null=True)
    equipped_outfit = serializers.UUIDField(allow_null=True)
    equipped_accessory = serializers.UUIDField(allow_null=True)
    equipped_background = serializers.UUIDField(allow_null=True)


class FriendStatSerializer(serializers.Serializer):
    category = serializers.CharField()
    level = serializers.IntegerField()
    xp_percent = serializers.IntegerField()


class FriendListItemSerializer(serializers.Serializer):
    kid_id = serializers.UUIDField()
    friendship_id = serializers.UUIDField()
    is_online = serializers.BooleanField()
    friends_since = serializers.DateTimeField()
    name = serializers.CharField()
    username = serializers.CharField()
    bio = serializers.CharField(allow_blank=True)
    avatar = FriendAvatarSerializer(allow_null=True)
    main_level = serializers.IntegerField()
    overall_xp = serializers.IntegerField()
    stats = FriendStatSerializer(many=True)


def serialize_friends_for(kid_id):
    rows = Friendship.objects.filter(
        involving_kid_q(kid_id),
        status=Friendship.Status.ACCEPTED,
    )
    items = []
    friend_ids = []
    for row in rows:
        other = row.to_kid_id if row.from_kid_id == kid_id else row.from_kid_id
        friend_ids.append(other)
        items.append({
            'kid_id': other,
            'friendship_id': row.id,
            'friends_since': row.responded_at or row.created_at,
            'is_online': False,
            'name': '',
            'username': '',
            'bio': '',
            'avatar': None,
            'main_level': 0,
            'overall_xp': 0,
            'stats': [],
        })

    online = online_among(friend_ids)
    identities = fetch_kids_by_ids(friend_ids)
    progress = fetch_progress_by_ids(friend_ids)
    avatars = fetch_avatars_by_ids(friend_ids)

    for item in items:
        kid_key = str(item['kid_id'])
        item['is_online'] = kid_key in online

        identity = identities.get(kid_key)
        if identity:
            item['name'] = identity['name']
            item['username'] = identity['username']
            item['bio'] = identity['bio']

        prog = progress.get(kid_key)
        if prog:
            item['main_level'] = prog['main_level']
            item['overall_xp'] = prog['overall_xp']
            item['stats'] = prog['stats']

        avatar = avatars.get(kid_key)
        if avatar:
            item['avatar'] = avatar

    return FriendListItemSerializer(items, many=True).data
