"""Call gamification-service and catalog-service internal APIs."""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

LOOKUP_TIMEOUT_SECONDS = 3


def _internal_headers():
    return {'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN}


def fetch_progress_by_ids(kid_ids):
    """
    Return dict keyed by kid_id str with main_level, overall_xp, stats.
    On failure, return {}.
    """
    ids = [str(kid_id) for kid_id in kid_ids]
    if not ids:
        return {}

    url = (
        f"{settings.GAMIFICATION_INTERNAL_URL.rstrip('/')}"
        "/api/gamification/internal/kids/progress/"
    )
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
        logger.warning('Gamification progress batch failed: %s', exc)
        return {}

    if not isinstance(rows, list):
        return {}

    result = {}
    for row in rows:
        if not isinstance(row, dict) or not row.get('kid_id'):
            continue
        result[str(row['kid_id'])] = {
            'main_level': row.get('main_level') or 0,
            'overall_xp': row.get('overall_xp') or 0,
            'stats': row.get('stats') or [],
        }
    return result


def fetch_avatars_by_ids(kid_ids):
    """
    Return dict keyed by kid_id str with public avatar fields.
    Missing kids / failures yield {}.
    """
    ids = [str(kid_id) for kid_id in kid_ids]
    if not ids:
        return {}

    url = (
        f"{settings.CATALOG_INTERNAL_URL.rstrip('/')}"
        "/api/catalog/internal/avatars/"
    )
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
        logger.warning('Catalog avatars batch failed: %s', exc)
        return {}

    if not isinstance(rows, list):
        return {}

    result = {}
    for row in rows:
        if not isinstance(row, dict) or not row.get('kid_id'):
            continue
        result[str(row['kid_id'])] = {
            'base_character': row.get('base_character') or 'default',
            'equipped_hat': row.get('equipped_hat'),
            'equipped_outfit': row.get('equipped_outfit'),
            'equipped_accessory': row.get('equipped_accessory'),
            'equipped_background': row.get('equipped_background'),
        }
    return result
