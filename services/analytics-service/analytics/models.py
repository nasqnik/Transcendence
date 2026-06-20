from django.db import models
from uuid import uuid4

# Create your models here.

class ActivityEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    completion_id = models.UUIDField(unique=True, db_index=True)
    kid_id = models.UUIDField(db_index=True)
    payload = models.JSONField(default=list)
    processed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-processed_at']