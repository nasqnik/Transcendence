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
