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
