import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# How long we wait for gamification before giving up. Kept short so a slow or
# down gamification-service never blocks the kid's request.
PUSH_TIMEOUT_SECONDS = 3


def push_completion_confirmed(completion, *, award_honesty=False):
    """Notify gamification-service that a completion is confirmed.

    Returns the reward summary gamification awarded (coins and category
    level-ups) so the caller can hand it straight back to the kid's UI, or
    None when nothing was awarded or the push failed.

    Best-effort: any failure is logged and swallowed. The ingest endpoint is
    idempotent (keyed on completion_id), so a dropped push can be safely
    replayed later without double-counting.

    When ``award_honesty`` is True (parent approved a pending completion),
    also grant Honesty XP equal to the sum of this task's category points.
    Auto-confirm must leave it False — Honesty is not a task/AI category.
    """
    rewards = list(completion.task.category_rewards.all())
    # Each reward row maps a category to the points the kid earns for it.
    category_points = [
        {'category': reward.category, 'points': reward.points_value}
        for reward in rewards
    ]

    if award_honesty:
        honesty_points = sum(reward.points_value for reward in rewards)
        if honesty_points > 0:
            category_points.append(
                {'category': 'honesty', 'points': honesty_points},
            )

    # Nothing to award (task has no category rewards) -> skip the call entirely.
    if not category_points:
        return None

    url = f"{settings.GAMIFICATION_INTERNAL_URL}/api/gamification/internal/completions/"
    payload = {
        # completion.id doubles as the idempotency key on the gamification side.
        'completion_id': str(completion.id),
        'kid_id': str(completion.kid_id),
        'category_points': category_points,
    }
    headers = {
        # Shared secret that proves the request came from a trusted service.
        'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=PUSH_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        # Don't raise: confirming a task must succeed even if gamification is down.
        logger.warning(
            "Failed to push completion %s to gamification: %s",
            completion.id,
            exc,
        )
        return None
    except ValueError:
        # Older gamification builds answer 204 with an empty body.
        return None


def notify_task_confirmed(completion):
    _push_notification(
        recipient_id=completion.kid_id,
        notification_type='task_confirmed',
        message=f'Your task "{completion.task.title}" was confirmed. Great job.',
    )


def notify_task_rejected(completion):
    _push_notification(
        recipient_id=completion.kid_id,
        notification_type='task_rejected',
        message=f'Your task "{completion.task.title}" was rejected.',
    )


def notify_task_submitted(completion):
    try:
        resp = requests.get(
            f"{settings.AUTH_INTERNAL_URL}/api/auth/internal/kids/{completion.kid_id}/parent/",
            headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
            timeout=PUSH_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        parent_id = resp.json()['parent_id']
        requests.post(
            f"{settings.NOTIFICATION_INTERNAL_URL}/api/notification/internal/notify/",
            json={
                'recipient_id': parent_id,
                'notification_type': 'task_submitted',
                'message': 'Your kid submitted a task for review.',
            },
            headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
            timeout=PUSH_TIMEOUT_SECONDS,
        ).raise_for_status()
    except requests.RequestException as exc:
        logger.warning(
            "Failed to notify parent of submission for kid %s: %s",
            completion.kid_id,
            exc,
        )


def _push_notification(recipient_id, notification_type, message):
    url = f"{settings.NOTIFICATION_INTERNAL_URL}/api/notification/internal/notify/"
    payload = {
        'recipient_id': str(recipient_id),
        'notification_type': notification_type,
        'message': message,
    }
    headers = {
        'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=PUSH_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning(
            "Failed to push %s notification to %s: %s",
            notification_type,
            recipient_id,
            exc,
        )
