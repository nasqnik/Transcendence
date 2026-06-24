from rest_framework import serializers
from .models import Notification


class NotificationCreateSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField(
        help_text="ID of the user (kid or parent) to notify."
    )
    notification_type = serializers.ChoiceField(
        choices=['task_confirmed', 'task_rejected', 'task_submitted', 'level_up'],
        help_text="Type of notification event.",
    )
    message = serializers.CharField(
        help_text="Human-readable notification message."
    )


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'message', 'is_read', 'created_at']


class NotificationMarkReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(
        help_text="ID of the notification that was marked as read."
    )
    is_read = serializers.BooleanField(
        help_text="Always true after this operation."
    )


class UnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField(
        help_text="Number of unread notifications for the logged-in user."
    )