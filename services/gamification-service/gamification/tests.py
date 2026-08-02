from uuid import uuid4

from django.conf import settings
from django.test import TestCase, override_settings

from .engine import apply_completion, get_or_create_kid_profile
from .models import KidProfile, KidStat


class StarterCoinsTests(TestCase):
    def test_new_profile_gets_starter_coins(self):
        kid_id = uuid4()
        profile, created = get_or_create_kid_profile(kid_id=kid_id)
        self.assertTrue(created)
        self.assertEqual(profile.coins, settings.STARTER_COINS)

    def test_existing_profile_keeps_coins(self):
        kid_id = uuid4()
        KidProfile.objects.create(kid_id=kid_id, coins=7)
        profile, created = get_or_create_kid_profile(kid_id=kid_id)
        self.assertFalse(created)
        self.assertEqual(profile.coins, 7)


class MultiCategoryCompletionTests(TestCase):
    @override_settings(
        STAT_XP_PER_LEVEL=50,
        OVERALL_XP_PER_STAT_LEVEL=50,
        MAIN_XP_PER_LEVEL=100,
        COINS_PER_MAIN_LEVEL=50,
        STARTER_COINS=50,
    )
    def test_apply_completion_accepts_multiple_categories(self):
        kid_id = uuid4()
        apply_completion(
            kid_id=kid_id,
            completion_id=uuid4(),
            category_points=[
                {'category': 'health', 'points': 8},
                {'category': 'responsibility', 'points': 3},
            ],
        )
        stats = {
            s.category: s.xp_percent
            for s in KidStat.objects.filter(kid_id=kid_id)
        }
        self.assertEqual(stats['health'], 8)
        self.assertEqual(stats['responsibility'], 3)
        profile = KidProfile.objects.get(kid_id=kid_id)
        self.assertEqual(profile.coins, 50)
