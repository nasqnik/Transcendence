"""AI content moderation for kid task title/description."""

import json

from django.conf import settings
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    OpenAI,
    RateLimitError,
)

from .errors import (
    AIAuthenticationError,
    AIContentBlocked,
    AIInvalidResponse,
    AIRateLimited,
    AIServiceUnavailable,
)

MODERATION_SYSTEM_PROMPT = """
You are a content moderator for a children's task app (ages ~6–14).

Decide if the task title and description are appropriate.

Block (safe=false) when the text includes or clearly asks for:
- sexual / romantic content
- violence against people/animals, weapons used to harm, self-harm
- hate, bullying, harassment, or slurs
- illegal activity or dangerous instructions meant to cause harm
- adult drugs / alcohol abuse
- personal data phishing or scams

Allow (safe=true) normal kid tasks, including:
- chores, schoolwork, sports, hobbies, reading
- cooking and food prep (using kitchen tools like knives to cut fruit/veggies is OK)
- cleaning, helping family, outdoor play

Do NOT block ordinary household activities just because a tool is mentioned
(knife, scissors, oven, etc.) when the context is cooking, crafts, or chores.

Return ONLY valid JSON. No markdown.

{"safe": true, "reason": "short reason"}

If safe is true, reason may be empty or a brief note.
If safe is false, reason must be a short kid-friendly warning
(e.g. "This task is not allowed. Please choose a different one.").
"""


def _get_client():
    return OpenAI(
        base_url='https://openrouter.ai/api/v1',
        api_key=settings.OPENROUTER_API_KEY,
        timeout=settings.OPENROUTER_TIMEOUT,
    )


def _raise_ai_error(exc):
    if isinstance(exc, RateLimitError):
        raise AIRateLimited('OpenRouter rate limit reached. Try again later.') from exc
    if isinstance(exc, AuthenticationError):
        raise AIAuthenticationError('OpenRouter authentication failed.') from exc
    if isinstance(exc, (APIConnectionError, APITimeoutError)):
        raise AIServiceUnavailable(
            'Could not reach OpenRouter. Check your connection and try again.'
        ) from exc
    if isinstance(exc, APIStatusError) and exc.status_code >= 500:
        raise AIServiceUnavailable('OpenRouter is temporarily unavailable.') from exc
    if isinstance(exc, APIStatusError):
        raise AIServiceUnavailable(
            f'OpenRouter request failed ({exc.status_code}).'
        ) from exc
    raise exc


def _parse_moderation_content(content: str) -> dict:
    content = (content or '').strip()
    if not content:
        raise AIInvalidResponse('Moderation model returned an empty response.')
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise AIInvalidResponse('Moderation model returned invalid JSON.') from exc

    if not isinstance(parsed, dict) or 'safe' not in parsed:
        raise AIInvalidResponse('Moderation response missing "safe".')

    safe = parsed['safe']
    if not isinstance(safe, bool):
        raise AIInvalidResponse('Moderation "safe" must be a boolean.')

    reason = parsed.get('reason') or ''
    if not isinstance(reason, str):
        reason = str(reason)

    return {'safe': safe, 'reason': reason.strip()}


def moderate_task_text(title: str, description: str = '') -> dict:
    """
    Check task text with the LLM.

    Returns {"safe": bool, "reason": str}.
    Raises AIError subclasses on provider/parse failures.
    """
    user_text = f'Title: {title}\nDescription: {description or ""}'.strip()
    client = _get_client()
    model = settings.OPENROUTER_MODEL

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {'role': 'system', 'content': MODERATION_SYSTEM_PROMPT},
                {'role': 'user', 'content': user_text},
            ],
        )
    except Exception as exc:
        _raise_ai_error(exc)

    content = ''
    if response.choices:
        content = response.choices[0].message.content or ''
    return _parse_moderation_content(content)


def enforce_task_moderation(title: str, description: str = '') -> dict:
    """Run moderation; raise AIContentBlocked if unsafe."""
    result = moderate_task_text(title, description)
    if not result['safe']:
        message = result['reason'] or (
            'This task was blocked by content moderation. Please try a different one.'
        )
        raise AIContentBlocked(message)
    return result
