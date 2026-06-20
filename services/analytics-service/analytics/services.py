import requests
from django.conf import settings
from collections import defaultdict

class GamificationUnavailiableError(Exception):
    """Raised when the gamification service cant be reached or returns an error."""

def fetch_completion_events(kid_id):
    try:
        response = requests.get(
            f"{settings.GAMIFICATION_INTERNAL_URL}/api/gamification/internal/completions/history/",
            params={"kid_id": str(kid_id)},
            headers={'X-Internal-Token' : settings.INTERNAL_SERVICE_TOKEN},
            timeout=5,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise GamificationUnavailiableError(str(exc)) from exc
    return response.json()

def build_category_breakdown(events):
    totals = defaultdict(int)
    for event in events:
        for item in event.get('payload', []):
            totals[item['category']] += item['points']
    return[
        {'category': category, 'total_points': points}
        for category, points in sorted(totals.items())
    ]

def build_daily_trend(events):
    daily_totals = defaultdict(int)
    for event in events:
        day = event['processed_at'][:10]
        day_points = sum(item['points'] for item in event.get('payload', []))
        daily_totals[day] += day_points
    return [
        {'date': day, 'points': points}
        for day, points in sorted(daily_totals.items())
    ]
