from uuid import uuid4

from django.db import models


class Friendship(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'
        BLOCKED = 'blocked', 'Blocked'

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    from_kid_id = models.UUIDField(db_index=True)
    to_kid_id = models.UUIDField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(from_kid_id=models.F('to_kid_id')),
                name='social_friendship_no_self',
            ),
            models.UniqueConstraint(
                fields=('from_kid_id', 'to_kid_id'),
                name='uniq_friendship_direction',
            ),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.from_kid_id} -> {self.to_kid_id} ({self.status})'
