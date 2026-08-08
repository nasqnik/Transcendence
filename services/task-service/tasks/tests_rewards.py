from unittest.mock import Mock, patch
from uuid import uuid4

import requests
from django.test import TestCase

from tasks.models import Task, TaskCategoryReward, TaskCompletion
from tasks.notifications import push_completion_confirmed
from tasks.serializers import TaskCompletionSerializer

REWARD = {
    'completion_id': 'ignored',
    'coins_awarded': 50,
    'stat_level_ups': [{'category': 'health', 'level': 1}],
    'coins_total': 100,
    'overall_xp': 50,
    'main_level': 0,
}


class RewardPassThroughTests(TestCase):
    def setUp(self):
        kid_id = uuid4()
        self.task = Task.objects.create(
            kid_id=kid_id,
            created_by=kid_id,
            title='Brush teeth',
        )
        self.completion = TaskCompletion.objects.create(
            task=self.task,
            kid_id=kid_id,
            status=TaskCompletion.Status.CONFIRMED,
        )

    def _add_reward_row(self):
        TaskCategoryReward.objects.create(
            task=self.task,
            category='health',
            points_value=50,
        )

    @patch('tasks.notifications.requests.post')
    def test_returns_summary_from_gamification(self, post):
        self._add_reward_row()
        post.return_value = Mock(json=Mock(return_value=REWARD))

        self.assertEqual(push_completion_confirmed(self.completion), REWARD)

    @patch('tasks.notifications.requests.post')
    def test_returns_none_when_gamification_is_unreachable(self, post):
        self._add_reward_row()
        post.side_effect = requests.RequestException('boom')

        self.assertIsNone(push_completion_confirmed(self.completion))

    @patch('tasks.notifications.requests.post')
    def test_returns_none_on_empty_body(self, post):
        """Older gamification builds answer 204 with nothing in the body."""
        self._add_reward_row()
        post.return_value = Mock(json=Mock(side_effect=ValueError))

        self.assertIsNone(push_completion_confirmed(self.completion))

    @patch('tasks.notifications.requests.post')
    def test_task_without_category_rewards_is_not_pushed(self, post):
        self.assertIsNone(push_completion_confirmed(self.completion))
        post.assert_not_called()

    @patch('tasks.notifications.requests.post')
    def test_auto_confirm_does_not_award_honesty(self, post):
        self._add_reward_row()
        TaskCategoryReward.objects.create(
            task=self.task,
            category='learning',
            points_value=10,
        )
        post.return_value = Mock(json=Mock(return_value=REWARD))

        push_completion_confirmed(self.completion, award_honesty=False)

        payload = post.call_args.kwargs['json']
        categories = [item['category'] for item in payload['category_points']]
        self.assertEqual(set(categories), {'health', 'learning'})
        self.assertNotIn('honesty', categories)

    @patch('tasks.notifications.requests.post')
    def test_parent_confirm_adds_honesty_equal_to_task_points(self, post):
        self._add_reward_row()
        TaskCategoryReward.objects.create(
            task=self.task,
            category='learning',
            points_value=10,
        )
        post.return_value = Mock(json=Mock(return_value=REWARD))

        push_completion_confirmed(self.completion, award_honesty=True)

        payload = post.call_args.kwargs['json']
        points_by_category = {
            item['category']: item['points']
            for item in payload['category_points']
        }
        self.assertEqual(points_by_category['health'], 50)
        self.assertEqual(points_by_category['learning'], 10)
        self.assertEqual(points_by_category['honesty'], 60)


class CompletionSerializerRewardTests(TestCase):
    def setUp(self):
        kid_id = uuid4()
        task = Task.objects.create(
            kid_id=kid_id,
            created_by=kid_id,
            title='Brush teeth',
        )
        self.completion = TaskCompletion.objects.create(task=task, kid_id=kid_id)

    def test_reward_is_null_by_default(self):
        data = TaskCompletionSerializer(self.completion).data
        self.assertIsNone(data['reward'])

    def test_reward_is_exposed_when_the_request_earned_one(self):
        self.completion.reward_summary = REWARD
        data = TaskCompletionSerializer(self.completion).data
        self.assertEqual(data['reward'], REWARD)
