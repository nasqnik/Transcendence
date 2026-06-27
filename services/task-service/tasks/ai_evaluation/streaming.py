import json

from django.conf import settings
from django.db import transaction
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    OpenAI,
    RateLimitError,
)

from ..models import Task
from .ai_evaluation import CLASSIFY_TASK_SYSTEM_PROMPT
from .apply import apply_classification, compute_xp_reward
from .errors import (
    AIAuthenticationError,
    AIError,
    AIInvalidResponse,
    AIRateLimited,
    AIServiceUnavailable,
)
from .validation import validate_classification


def _get_client():
    return OpenAI(
        base_url='https://openrouter.ai/api/v1',
        api_key=settings.OPENROUTER_API_KEY,
        timeout=settings.OPENROUTER_TIMEOUT,
    )


def task_classification_text(title, description):
    return f'{title}\n{description}'.strip()


def task_fields_text_changed(instance, validated_data):
    return (
        ('title' in validated_data and validated_data['title'] != instance.title)
        or (
            'description' in validated_data
            and validated_data['description'] != instance.description
        )
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
        raise AIServiceUnavailable(f'OpenRouter request failed ({exc.status_code}).') from exc
    raise exc


def iter_classification_tokens(
    task_description,
    *,
    system_prompt=CLASSIFY_TASK_SYSTEM_PROMPT,
    model=None,
):
    """Yield text tokens from OpenRouter as the model generates them."""
    client = _get_client()
    model = model or settings.OPENROUTER_MODEL

    try:
        stream = client.chat.completions.create(
            model=model,
            temperature=0.3,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': task_description},
            ],
            stream=True,
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except AIError:
        raise
    except Exception as exc:
        _raise_ai_error(exc)


def sse_event(event, data):
    payload = json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data
    return f'event: {event}\ndata: {payload}\n\n'


def sse_error(*, code, message, **extra):
    return sse_event('error', {'code': code, 'message': message, **extra})


def _parse_classification_buffer(buffer):
    content = ''.join(buffer).strip()
    if not content:
        return None, {
            'code': AIInvalidResponse.code,
            'message': 'Model returned an empty response.',
        }
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return None, {
            'code': AIInvalidResponse.code,
            'message': 'Model returned invalid JSON.',
            'raw': content,
        }
    try:
        return validate_classification(parsed), None
    except AIInvalidResponse as exc:
        return None, {'code': exc.code, 'message': exc.message, 'raw': content}


def _yield_token_events(text, buffer):
    for token in iter_classification_tokens(text):
        buffer.append(token)
        yield sse_event('token', {'text': token})


def _done_payload(task, parsed):
    from ..serializers import TaskSerializer

    return {
        'classification': parsed,
        'task': TaskSerializer(task).data,
    }


def stream_task_create_events(kid_id, *, title, description, due_date):
    """Stream AI tokens, then save the same parsed result as a new Task."""
    text = task_classification_text(title, description)
    buffer = []

    try:
        yield from _yield_token_events(text, buffer)
        parsed, error = _parse_classification_buffer(buffer)
        if error:
            yield sse_event('error', error)
            return

        with transaction.atomic():
            task = Task.objects.create(
                kid_id=kid_id,
                created_by=kid_id,
                title=title,
                description=description,
                due_date=due_date,
            )
            apply_classification(task, parsed)
            task.xp_reward = compute_xp_reward(parsed)
            task.save(update_fields=['xp_reward'])

        task = Task.objects.prefetch_related('category_rewards').get(pk=task.pk)
        yield sse_event('done', _done_payload(task, parsed))

    except AIError as exc:
        yield sse_error(code=exc.code, message=exc.message)
    except Exception:
        yield sse_error(
            code='ai_error',
            message='Unexpected error during AI classification.',
        )


def stream_task_update_events(task_id, validated_data):
    """Stream AI tokens, then apply the same parsed result to an existing Task."""
    buffer = []

    try:
        try:
            task = Task.objects.get(pk=task_id)
        except Task.DoesNotExist:
            yield sse_error(code='not_found', message='Task not found.')
            return

        new_title = validated_data.get('title', task.title)
        new_description = validated_data.get('description', task.description)
        text = task_classification_text(new_title, new_description)

        yield from _yield_token_events(text, buffer)
        parsed, error = _parse_classification_buffer(buffer)
        if error:
            yield sse_event('error', error)
            return

        with transaction.atomic():
            task = Task.objects.select_for_update().get(pk=task_id)
            task.title = new_title
            task.description = new_description
            if 'due_date' in validated_data:
                task.due_date = validated_data['due_date']
            task.save()

            task.category_rewards.all().delete()
            apply_classification(task, parsed)
            task.xp_reward = compute_xp_reward(parsed)
            task.save(update_fields=['xp_reward'])

        task = Task.objects.prefetch_related('category_rewards').get(pk=task_id)
        yield sse_event('done', _done_payload(task, parsed))

    except AIError as exc:
        yield sse_error(code=exc.code, message=exc.message)
    except Exception:
        yield sse_error(
            code='ai_error',
            message='Unexpected error during AI classification.',
        )
