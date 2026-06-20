from collections import defaultdict
import requests
from django.conf import settings
from collections import defaultdict

def build_category_breakdown(events):
    totals = defaultdict(int)
    for event in events:
        for item in event.payload:
            totals[item['category']] += item['points']
    return[
        {'category': category, 'total_points': points}
        for category, points in sorted(totals.items())
    ]

def build_daily_trend(events):
    daily_totals = defaultdict(int)
    for event in events:
        day = event.processed_at.strftime('%Y-%m-%d')
        day_points = sum(item['points'] for item in event.payload)
        daily_totals[day] += day_points
    return [
        {'date': day, 'points': points}
        for day, points in sorted(daily_totals.items())
    ]

def fetch_completion_rates(kid_id, token):
    try:
        response = requests.get(
            f"{settings.TASK_SERVICE_URL}/api/task/completions/",
            params={'kid_id': str(kid_id)},
            headers={'Authorization': f'Bearer {token}'},
            timeout=5,
        )
        response.raise_for_status()
    except requests.RequestException:
        return None
    completions = response.json()
    total = len(completions)
    if total == 0:
        return {'total': 0, 'confirmed': 0, 'rejected': 0, 'pending': 0, 'rate': 0}
    confirmed = sum(1 for c in completions if c['status'] == 'confirmed')
    rejected = sum(1 for c in completions if c['status'] == 'rejected')
    pending = sum(1 for c in completions if c['status'] == 'pending')
    return {
        'total': total,
        'confirmed': confirmed,
        'rejected': rejected,
        'pending': pending,
        'rate': round((confirmed / total) * 100, 1),
    }
