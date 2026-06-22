from django.db import models
from uuid import uuid4

NOTIFICATION_TYPES = [
    ('task_confirmed', 'Task Confirmed'),
    ('task_rejected', 'Task Rejected'),
    ('task_submitted', 'Task Submitted'),
    ('level_up', 'Level Up'),
]

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    recipient_id = models.UUIDField(db_index=True)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']