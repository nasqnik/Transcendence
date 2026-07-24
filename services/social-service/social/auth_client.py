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


def _internal_headers():
    return {'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN}


def assert_active_kid_exists(kid_id) -> None:
    """Raise ValidationError if kid is missing; AuthServiceUnavailable on transport errors."""
    url = f"{settings.AUTH_INTERNAL_URL.rstrip('/')}/api/auth/internal/kids/{kid_id}/"
    try:
        resp = requests.get(
            url,
            headers=_internal_headers(),
            timeout=LOOKUP_TIMEOUT_SECONDS,
        )
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


def fetch_kids_by_ids(kid_ids):
    """
    Return a dict keyed by kid_id str with identity fields.
    On failure, return {} so the friends list can still be served.
    """
    ids = [str(kid_id) for kid_id in kid_ids]
    if not ids:
        return {}

    url = f"{settings.AUTH_INTERNAL_URL.rstrip('/')}/api/auth/internal/kids/"
    try:
        resp = requests.get(
            url,
            params={'ids': ','.join(ids)},
            headers=_internal_headers(),
            timeout=LOOKUP_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        rows = resp.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning('Auth kids batch failed: %s', exc)
        return {}

    if not isinstance(rows, list):
        return {}

    return {
        str(row['kid_id']): {
            'name': row.get('name') or '',
            'username': row.get('username') or '',
            'bio': row.get('bio') or '',
        }
        for row in rows
        if isinstance(row, dict) and row.get('kid_id')
    }
