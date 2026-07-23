"""Call auth-service internal APIs."""

import logging

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError

logger = logging.getLogger(__name__)

LOOKUP_TIMEOUT_SECONDS = 3


class AuthServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Auth service unavailable.'
    default_code = 'auth_unavailable'


def assert_active_kid_exists(kid_id) -> None:
    """Raise ValidationError if kid is missing; AuthServiceUnavailable on transport errors."""
    url = f"{settings.AUTH_INTERNAL_URL.rstrip('/')}/api/auth/internal/kids/{kid_id}/"
    headers = {'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN}
    try:
        resp = requests.get(url, headers=headers, timeout=LOOKUP_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning('Auth kid lookup failed for %s: %s', kid_id, exc)
        raise AuthServiceUnavailable() from exc

    if resp.status_code == 200:
        return
    if resp.status_code >= 500:
        logger.warning(
            'Auth kid lookup error for %s: status=%s',
            kid_id,
            resp.status_code,
        )
        raise AuthServiceUnavailable()
    raise ValidationError('Kid not found.')
