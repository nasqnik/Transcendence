from django.db.models import Q
from rest_framework import serializers

from .auth_client import assert_active_kid_exists
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


class FriendListItemSerializer(serializers.Serializer):
    kid_id = serializers.UUIDField()
    friendship_id = serializers.UUIDField()
    is_online = serializers.BooleanField()
    friends_since = serializers.DateTimeField()


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
        })
    online = online_among(friend_ids)
    for item in items:
        item['is_online'] = str(item['kid_id']) in online
    return FriendListItemSerializer(items, many=True).data
