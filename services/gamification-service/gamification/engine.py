import requests

from .models import CATEGORY_CHOICES, KidProfile, KidStat, CompletionEvent
from django.db import transaction
from django.conf import settings
from django.utils import timezone


def get_or_create_kid_profile(*, kid_id, for_update=False):
    """Create profile with starter coins on first touch."""
    qs = KidProfile.objects
    if for_update:
        qs = qs.select_for_update()
    return qs.get_or_create(
        kid_id=kid_id,
        defaults={'coins': settings.STARTER_COINS},
    )


def build_reward_summary(completion_event, kid_profile=None):
    """Structured description of what a completion earned, for the kid's UI.

    Carries both the delta (what to animate) and the resulting totals (what to
    display afterwards), so a client can render the coin popup from one payload.
    """
    if kid_profile is None:
        kid_profile, _ = get_or_create_kid_profile(kid_id=completion_event.kid_id)
    return {
        'completion_id': str(completion_event.completion_id),
        'coins_awarded': completion_event.coins_awarded,
        'stat_level_ups': completion_event.stat_level_ups,
        'coins_total': kid_profile.coins,
        'overall_xp': kid_profile.overall_xp,
        'main_level': kid_profile.main_level,
    }


def notify_kid(kid_id, message):
    try:
        requests.post(
            f"{settings.NOTIFICATION_INTERNAL_URL}/api/notification/internal/notify/",
            json={
                'recipient_id': str(kid_id),
                'notification_type': 'level_up',
                'message': message,
            },
            headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
            timeout=3,
        )
    except requests.RequestException:
        pass


def apply_completion(kid_id, completion_id, category_points):
    # all or nothing transaction
    # if any step fails, the entire transaction is rolled back
    leveled_up = False
    stat_level_ups = []
    with transaction.atomic():
        existing = CompletionEvent.objects.filter(completion_id=completion_id).first()
        if existing is not None:
            # Replay of an already-processed completion: report what it earned
            # the first time rather than awarding it again.
            return build_reward_summary(existing)

        completion_event = CompletionEvent.objects.create(
            completion_id=completion_id,
            kid_id=kid_id,
            payload=category_points,
        )

        # _ is used to ignore
        # select_for_update() is used to lock the row for the duration of the transaction
        kid_profile, _ = get_or_create_kid_profile(kid_id=kid_id, for_update=True)
        main_level_before = kid_profile.main_level
        coins_before = kid_profile.coins

        for item in category_points:
            kid_stat, _ = KidStat.objects.select_for_update().get_or_create(
                kid_id=kid_id,
                category=item['category'],
            )

            kid_stat.xp_percent += item['points']
            while kid_stat.xp_percent >= settings.STAT_XP_PER_LEVEL:
                kid_stat.xp_percent -= settings.STAT_XP_PER_LEVEL
                kid_stat.level += 1
                kid_profile.overall_xp += settings.OVERALL_XP_PER_STAT_LEVEL
                kid_profile.coins += settings.COINS_PER_STAT_LEVEL
                stat_level_ups.append({
                    'category': kid_stat.category,
                    'level': kid_stat.level,
                })
            kid_stat.save()

        while kid_profile.overall_xp >= settings.MAIN_XP_PER_LEVEL:
            kid_profile.overall_xp -= settings.MAIN_XP_PER_LEVEL
            kid_profile.main_level += 1
        kid_profile.save()

        leveled_up = kid_profile.main_level > main_level_before

        completion_event.coins_awarded = kid_profile.coins - coins_before
        completion_event.stat_level_ups = stat_level_ups
        completion_event.save(update_fields=['coins_awarded', 'stat_level_ups'])
        summary = build_reward_summary(completion_event, kid_profile)

    try:
        requests.post(
            f"{settings.ANALYTICS_INTERNAL_URL}/api/analytics/internal/activity/",
            json={
                'completion_id': str(completion_id),
                'kid_id': str(kid_id),
                'payload': category_points,
            },
            headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
            timeout=3,
        )
    except requests.RequestException:
        pass

    category_labels = dict(CATEGORY_CHOICES)
    for entry in stat_level_ups:
        label = category_labels.get(entry['category'], entry['category'])
        notify_kid(
            kid_id,
            f"{label} reached level {entry['level']}. "
            f"You earned {settings.COINS_PER_STAT_LEVEL} coins.",
        )

    if leveled_up:
        notify_kid(kid_id, 'You leveled up. Keep it up.')

    return summary


def pending_rewards(kid_id):
    """Coin awards the kid's client has not acknowledged yet, oldest first.

    Completions that earned nothing are excluded - there is no popup to show.
    """
    return CompletionEvent.objects.filter(
        kid_id=kid_id,
        seen_at__isnull=True,
        coins_awarded__gt=0,
    ).order_by('processed_at')


def mark_rewards_seen(kid_id, completion_ids=None):
    queryset = CompletionEvent.objects.filter(kid_id=kid_id, seen_at__isnull=True)
    if completion_ids:
        queryset = queryset.filter(completion_id__in=completion_ids)
    return queryset.update(seen_at=timezone.now())


def deduct_coins(kid_id, amount):
    with transaction.atomic():
        profile, _ = get_or_create_kid_profile(kid_id=kid_id, for_update=True)
        if profile.coins < amount:
            return False, profile.coins
        profile.coins -= amount
        profile.save(update_fields=['coins', 'updated_at'])
        return True, profile.coins

