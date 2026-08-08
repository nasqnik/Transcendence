from django.db import models
from uuid import uuid4
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings

# Create your models here.

CATEGORY_CHOICES = [
    ('health', 'Health'),
    ('learning', 'Learning'),
    ('responsibility', 'Responsibility'),
    ('creativity', 'Creativity'),
    # Not assigned on tasks / by AI. Awarded by task-service when a parent
    # confirms a pending completion (points = sum of that task's rewards).
    ('honesty', 'Honesty'),
]

class KidProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    kid_id = models.UUIDField(unique=True, db_index=True)
    main_level = models.PositiveIntegerField(default=0)
    overall_xp = models.PositiveIntegerField(default=0)
    coins = models.PositiveIntegerField(default=0)
    # auto_now_add=True → set once when the object is created.
    created_at = models.DateTimeField(auto_now_add=True)
    # auto_now=True → updated automatically every time save() is called.
    updated_at = models.DateTimeField(auto_now=True)


# one row per kid+category
# example: kid_id = 123e4567-e89b-12d3-a456-426614174000, category = 'health', level = 1, xp_percent = 50
class KidStat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    kid_id = models.UUIDField(db_index=True)
    category = models.CharField(max_length=255, choices=CATEGORY_CHOICES)
    level = models.PositiveIntegerField(default=0)
    xp_percent = models.IntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(settings.STAT_XP_PER_LEVEL),
        ]
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['kid_id', 'category'],
                name='unique_kid_category',
            )
        ]

# history of completion events for idempotency, and the reward the kid earned
# from each one so the UI can replay it (coin popup) even if the kid was away
# when a parent confirmed the task.
class CompletionEvent(models.Model):
    completion_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    kid_id = models.UUIDField(db_index=True)
    payload = models.JSONField(default=dict)
    coins_awarded = models.PositiveIntegerField(default=0)
    # [{'category': 'health', 'level': 2}, ...] - one entry per category level-up.
    stat_level_ups = models.JSONField(default=list)
    # Null until the kid's client acknowledges it has shown the reward.
    seen_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['kid_id', 'seen_at']),
        ]