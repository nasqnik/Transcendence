from unittest.mock import patch
from uuid import uuid4

import requests
from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from common.actors import KidActor
from .engine import (
    apply_completion,
    get_or_create_kid_profile,
    mark_rewards_seen,
    pending_rewards,
)
from .models import CompletionEvent, KidProfile, KidStat

# The economy the assertions below are written against, pinned so tuning the
# real defaults doesn't silently rewrite what these tests claim to prove.
ECONOMY = {
    'STAT_XP_PER_LEVEL': 50,
    'OVERALL_XP_PER_STAT_LEVEL': 50,
    'MAIN_XP_PER_LEVEL': 100,
    'COINS_PER_STAT_LEVEL': 50,
    'STARTER_COINS': 50,
}


class EngineTestCase(TestCase):
    """Base that stops apply_completion from calling the other services."""

    def setUp(self):
        patcher = patch('gamification.engine.requests.post')
        self.requests_post = patcher.start()
        self.addCleanup(patcher.stop)


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


@override_settings(**ECONOMY)
class MultiCategoryCompletionTests(EngineTestCase):
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

    def test_honesty_is_a_real_stat_category(self):
        kid_id = uuid4()
        apply_completion(
            kid_id=kid_id,
            completion_id=uuid4(),
            category_points=[
                {'category': 'health', 'points': 10},
                {'category': 'honesty', 'points': 10},
            ],
        )
        honesty = KidStat.objects.get(kid_id=kid_id, category='honesty')
        self.assertEqual(honesty.xp_percent, 10)
        self.assertEqual(honesty.level, 0)


@override_settings(**ECONOMY)
class CategoryLevelCoinsTests(EngineTestCase):
    def test_completing_a_category_awards_coins_and_overall_xp(self):
        kid_id = uuid4()
        apply_completion(
            kid_id=kid_id,
            completion_id=uuid4(),
            category_points=[{'category': 'health', 'points': 50}],
        )
        stat = KidStat.objects.get(kid_id=kid_id, category='health')
        self.assertEqual(stat.level, 1)
        self.assertEqual(stat.xp_percent, 0)
        profile = KidProfile.objects.get(kid_id=kid_id)
        self.assertEqual(profile.coins, 100)
        self.assertEqual(profile.overall_xp, 50)
        self.assertEqual(profile.main_level, 0)

    def test_main_level_up_grants_no_extra_coins(self):
        kid_id = uuid4()
        apply_completion(
            kid_id=kid_id,
            completion_id=uuid4(),
            category_points=[
                {'category': 'health', 'points': 50},
                {'category': 'learning', 'points': 50},
            ],
        )
        profile = KidProfile.objects.get(kid_id=kid_id)
        self.assertEqual(profile.main_level, 1)
        self.assertEqual(profile.overall_xp, 0)
        self.assertEqual(profile.coins, 150)


@override_settings(**ECONOMY)
class CategoryLevelNotificationTests(EngineTestCase):
    @patch('gamification.engine.notify_kid')
    def test_category_completion_notifies_kid(self, notify_kid):
        apply_completion(
            kid_id=uuid4(),
            completion_id=uuid4(),
            category_points=[{'category': 'health', 'points': 50}],
        )
        notify_kid.assert_called_once()
        message = notify_kid.call_args.args[1]
        self.assertIn('Health', message)
        self.assertIn('50 coins', message)

    @patch('gamification.engine.notify_kid')
    def test_partial_progress_does_not_notify(self, notify_kid):
        apply_completion(
            kid_id=uuid4(),
            completion_id=uuid4(),
            category_points=[{'category': 'health', 'points': 10}],
        )
        notify_kid.assert_not_called()


@override_settings(**ECONOMY)
class RewardSummaryTests(EngineTestCase):
    def test_summary_reports_award_and_resulting_totals(self):
        kid_id = uuid4()
        completion_id = uuid4()
        summary = apply_completion(
            kid_id=kid_id,
            completion_id=completion_id,
            category_points=[{'category': 'health', 'points': 50}],
        )
        self.assertEqual(summary['completion_id'], str(completion_id))
        self.assertEqual(summary['coins_awarded'], 50)
        self.assertEqual(
            summary['stat_level_ups'],
            [{'category': 'health', 'level': 1}],
        )
        self.assertEqual(summary['coins_total'], 100)
        self.assertEqual(summary['overall_xp'], 50)

    def test_partial_progress_awards_nothing(self):
        summary = apply_completion(
            kid_id=uuid4(),
            completion_id=uuid4(),
            category_points=[{'category': 'health', 'points': 10}],
        )
        self.assertEqual(summary['coins_awarded'], 0)
        self.assertEqual(summary['stat_level_ups'], [])

    def test_replay_reports_original_award_without_paying_twice(self):
        kid_id = uuid4()
        completion_id = uuid4()
        points = [{'category': 'health', 'points': 50}]
        first = apply_completion(
            kid_id=kid_id,
            completion_id=completion_id,
            category_points=points,
        )
        second = apply_completion(
            kid_id=kid_id,
            completion_id=completion_id,
            category_points=points,
        )
        self.assertEqual(second['coins_awarded'], first['coins_awarded'])
        self.assertEqual(second['stat_level_ups'], first['stat_level_ups'])
        self.assertEqual(KidProfile.objects.get(kid_id=kid_id).coins, 100)


@override_settings(**ECONOMY)
class PendingRewardsTests(EngineTestCase):
    def test_award_is_pending_until_marked_seen(self):
        kid_id = uuid4()
        apply_completion(
            kid_id=kid_id,
            completion_id=uuid4(),
            category_points=[{'category': 'health', 'points': 50}],
        )
        self.assertEqual(pending_rewards(kid_id).count(), 1)

        mark_rewards_seen(kid_id)
        self.assertEqual(pending_rewards(kid_id).count(), 0)

    def test_completions_that_awarded_nothing_are_not_pending(self):
        kid_id = uuid4()
        apply_completion(
            kid_id=kid_id,
            completion_id=uuid4(),
            category_points=[{'category': 'health', 'points': 10}],
        )
        self.assertEqual(pending_rewards(kid_id).count(), 0)

    def test_marking_one_reward_leaves_the_others_pending(self):
        kid_id = uuid4()
        first = uuid4()
        apply_completion(
            kid_id=kid_id,
            completion_id=first,
            category_points=[{'category': 'health', 'points': 50}],
        )
        apply_completion(
            kid_id=kid_id,
            completion_id=uuid4(),
            category_points=[{'category': 'learning', 'points': 50}],
        )
        mark_rewards_seen(kid_id, completion_ids=[first])
        remaining = pending_rewards(kid_id)
        self.assertEqual(remaining.count(), 1)
        self.assertEqual(remaining.first().stat_level_ups[0]['category'], 'learning')


@override_settings(**ECONOMY)
class RewardsApiTests(EngineTestCase):
    def setUp(self):
        super().setUp()
        self.kid_id = uuid4()
        self.client = APIClient()
        self.client.force_authenticate(
            user=KidActor(kid_id=self.kid_id, username='dev_kid')
        )

    def _award(self, category='health'):
        apply_completion(
            kid_id=self.kid_id,
            completion_id=uuid4(),
            category_points=[{'category': category, 'points': 50}],
        )

    def test_pending_endpoint_returns_unseen_award(self):
        self._award()
        response = self.client.get(reverse('kid-rewards-pending'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['coins_awarded'], 50)
        self.assertEqual(
            response.data[0]['stat_level_ups'],
            [{'category': 'health', 'level': 1}],
        )

    def test_seen_endpoint_clears_the_feed(self):
        self._award()
        response = self.client.post(reverse('kid-rewards-seen'), {}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['marked_seen'], 1)

        response = self.client.get(reverse('kid-rewards-pending'))
        self.assertEqual(response.data, [])

    def test_kid_only_sees_their_own_rewards(self):
        apply_completion(
            kid_id=uuid4(),
            completion_id=uuid4(),
            category_points=[{'category': 'health', 'points': 50}],
        )
        response = self.client.get(reverse('kid-rewards-pending'))
        self.assertEqual(response.data, [])

    def test_pending_requires_a_kid(self):
        response = APIClient().get(reverse('kid-rewards-pending'))
        self.assertIn(response.status_code, (401, 403))


@override_settings(**ECONOMY)
class InternalCompletionApiTests(EngineTestCase):
    def test_ingest_returns_the_reward_summary(self):
        kid_id = uuid4()
        response = APIClient().post(
            reverse('internal-completions'),
            {
                'completion_id': str(uuid4()),
                'kid_id': str(kid_id),
                'category_points': [{'category': 'health', 'points': 50}],
            },
            format='json',
            headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['coins_awarded'], 50)
        self.assertEqual(response.data['coins_total'], 100)
        self.assertEqual(CompletionEvent.objects.filter(kid_id=kid_id).count(), 1)


@override_settings(
    NOTIFICATION_INTERNAL_URL='http://notification-service:8000',
    ANALYTICS_INTERNAL_URL='http://analytics-service:8000',
    INTERNAL_SERVICE_TOKEN='test-internal-token',
)
class NotifyHttpErrorTests(TestCase):
    """4xx/5xx from internal POSTs must be logged, not silently ignored."""

    @patch('gamification.engine.requests.post')
    def test_notify_kid_logs_http_error(self, mock_post):
        from gamification.engine import notify_kid

        mock_post.return_value.raise_for_status.side_effect = requests.HTTPError(
            '400 Client Error'
        )
        with self.assertLogs('gamification.engine', level='WARNING') as logs:
            notify_kid(uuid4(), 'You leveled up.')
        self.assertTrue(
            any('Failed to notify kid' in r.getMessage() for r in logs.records)
        )

    @patch('gamification.engine.requests.post')
    def test_analytics_push_logs_http_error(self, mock_post):
        from gamification.engine import apply_completion

        # First post is analytics after the award; make it fail with HTTPError.
        mock_post.return_value.raise_for_status.side_effect = requests.HTTPError(
            '500 Server Error'
        )
        with self.assertLogs('gamification.engine', level='WARNING') as logs:
            apply_completion(
                kid_id=uuid4(),
                completion_id=uuid4(),
                category_points=[{'category': 'health', 'points': 10}],
            )
        self.assertTrue(
            any('Failed to push completion' in r.getMessage() for r in logs.records)
        )
        # XP still saved even when analytics fails.
        self.assertEqual(CompletionEvent.objects.count(), 1)
