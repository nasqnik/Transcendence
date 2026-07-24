from django.db import models
from uuid import uuid4

SLOT_CHOICES = [
    ('hat', 'Hat'),
    ('outfit', 'Outfit'),
    ('accessory', 'Accessory'),
    ('background', 'Background'),
]

class AvatarItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50, choices=SLOT_CHOICES)
    image_url = models.TextField()
    coin_cost = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['type', 'name']

    def __str__(self):
        return f"{self.name} ({self.type})"

class KidAvatar(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    kid_id = models.UUIDField(unique=True, db_index=True)
    base_character = models.CharField(max_length=50, default='default')
    unlocked_items = models.JSONField(default=list)
    equipped_hat = models.UUIDField(null=True, blank=True)
    equipped_outfit = models.UUIDField(null=True, blank=True)
    equipped_accessory = models.UUIDField(null=True, blank=True)
    equipped_background = models.UUIDField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KidAvatar for kid_id: {self.kid_id}"

class RewardPurchase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    kid_id = models.UUIDField(db_index=True)
    item = models.ForeignKey(AvatarItem, on_delete=models.PROTECT)
    coins_spent = models.PositiveIntegerField()
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-purchased_at']

    def __str__(self):
        return f"Kid{self.kid_id} purchased {self.item.name} for {self.coins_spent} coins"
    
class ParentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    parent_id = models.UUIDField(unique=True, db_index=True)
    profile_picture = models.ImageField(
        upload_to='parent_avatars/',
        null=True,
        blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ParentProfile for parent_id: {self.parent_id}"