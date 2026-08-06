"""Call notification-service internal APIs (best-effort)."""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

NOTIFY_TIMEOUT_SECONDS = 3


def notify_friend_request(*, recipient_id, sender_username):
    """
    Notify the recipient that someone sent a friend request.
    Failures are logged and swallowed so friendship creation still succeeds.
    Requires notification-service to accept type ``friend_request``.
    """
    url = (
        f"{settings.NOTIFICATION_INTERNAL_URL.rstrip('/')}"
        "/api/notification/internal/notify/"
    )
    label = (sender_username or '').strip() or 'Someone'
    try:
        response = requests.post(
            url,
            json={
                'recipient_id': str(recipient_id),
                'notification_type': 'friend_request',
                'message': f'{label} sent you a friend request.',
            },
            headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
            timeout=NOTIFY_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning('Friend-request notify failed: %s', exc)
