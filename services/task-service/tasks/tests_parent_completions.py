from uuid import uuid4

from django.test import TestCase
from rest_framework.test import APIClient

from common.actors import ParentActor
from tasks.models import Task, TaskCompletion

COMPLETIONS_URL = '/api/task/completions/'


def make_completion(kid_id):
    task = Task.objects.create(kid_id=kid_id, created_by=kid_id, title='Brush teeth')
    return TaskCompletion.objects.create(task=task, kid_id=kid_id)


class ParentCompletionFilterTests(TestCase):
    """A parent's dashboard is per-kid, so the list has to be narrowable.

    analytics-service builds each kid's completion rate from ?kid_id=; while
    that was ignored, one kid finishing a task moved every sibling's numbers.
    """

    def setUp(self):
        self.kid_a = uuid4()
        self.kid_b = uuid4()
        self.completion_a = make_completion(self.kid_a)
        self.completion_b = make_completion(self.kid_b)

        self.client = APIClient()
        self.client.force_authenticate(
            user=ParentActor(
                user_id=uuid4(),
                username='dev_parent',
                email='dev-parent@localhost',
                kid_ids=(self.kid_a, self.kid_b),
            )
        )
        self.url = COMPLETIONS_URL

    def _kid_ids(self, response):
        return {row['kid_id'] for row in response.data}

    def test_without_the_param_all_guarded_kids_are_listed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._kid_ids(response), {str(self.kid_a), str(self.kid_b)})

    def test_param_narrows_to_one_kid(self):
        response = self.client.get(self.url, {'kid_id': str(self.kid_a)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._kid_ids(response), {str(self.kid_a)})

    def test_sibling_completions_do_not_leak_into_the_other_kid(self):
        response = self.client.get(self.url, {'kid_id': str(self.kid_b)})
        self.assertEqual(self._kid_ids(response), {str(self.kid_b)})

    def test_unguarded_kid_returns_nothing(self):
        response = self.client.get(self.url, {'kid_id': str(uuid4())})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_malformed_kid_id_returns_nothing_rather_than_erroring(self):
        response = self.client.get(self.url, {'kid_id': 'not-a-uuid'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
