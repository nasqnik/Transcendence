from rest_framework import serializers
from .models import Notification

class NotificationCreateSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField()
    notification_type = serializers.ChoiceField(choices=[
        'task_confirmed',
        'task_rejected',
        'task_submitted',
        'level_up',
    ])
    message = serializers.CharField()

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'message', 'is_read', 'created_at']


