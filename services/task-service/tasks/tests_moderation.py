from django.test import SimpleTestCase, override_settings

from tasks.ai_evaluation.errors import AIContentBlocked, AIInvalidResponse
from tasks.ai_evaluation.moderation import (
    _parse_moderation_content,
    enforce_task_moderation,
)


class ParseModerationContentTests(SimpleTestCase):
    def test_safe_true(self):
        result = _parse_moderation_content('{"safe": true, "reason": ""}')
        self.assertEqual(result, {'safe': True, 'reason': ''})

    def test_safe_false_with_reason(self):
        result = _parse_moderation_content(
            '{"safe": false, "reason": "Not allowed for kids."}'
        )
        self.assertEqual(
            result,
            {'safe': False, 'reason': 'Not allowed for kids.'},
        )

    def test_invalid_json(self):
        with self.assertRaises(AIInvalidResponse):
            _parse_moderation_content('not-json')

    def test_missing_safe(self):
        with self.assertRaises(AIInvalidResponse):
            _parse_moderation_content('{"reason": "x"}')


@override_settings(
    OPENROUTER_API_KEY='test-key',
    OPENROUTER_MODEL='openai/gpt-4o-mini',
    OPENROUTER_TIMEOUT=5,
)
class EnforceModerationTests(SimpleTestCase):
    def test_blocks_when_unsafe(self):
        from unittest.mock import patch

        with patch(
            'tasks.ai_evaluation.moderation.moderate_task_text',
            return_value={'safe': False, 'reason': 'Please choose another task.'},
        ):
            with self.assertRaises(AIContentBlocked) as ctx:
                enforce_task_moderation('bad title', 'bad desc')
            self.assertEqual(ctx.exception.code, 'content_blocked')
            self.assertIn('another task', ctx.exception.message)

    def test_allows_when_safe(self):
        from unittest.mock import patch

        with patch(
            'tasks.ai_evaluation.moderation.moderate_task_text',
            return_value={'safe': True, 'reason': ''},
        ):
            result = enforce_task_moderation('Read a book', '20 pages')
            self.assertTrue(result['safe'])
