import requests

from .models import KidProfile, KidStat, CompletionEvent
from django.db import transaction
from django.conf import settings

def apply_completion(kid_id, completion_id, category_points):
    # all or nothing transaction
    # if any step fails, the entire transaction is rolled back
    leveled_up = False
    with transaction.atomic():
        if CompletionEvent.objects.filter(completion_id=completion_id).exists():
            return

        completion_event = CompletionEvent.objects.create(
            completion_id=completion_id,
            kid_id=kid_id,
            payload=category_points,
        )

        # _ is used to ignore
        # select_for_update() is used to lock the row for the duration of the transaction
        # get_or_create() is used to create the row if it doesn't exist
        kid_profile, _ = KidProfile.objects.select_for_update().get_or_create(kid_id=kid_id)
        main_level_before = kid_profile.main_level

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
            kid_stat.save()

        while kid_profile.overall_xp >= settings.MAIN_XP_PER_LEVEL:
            kid_profile.overall_xp -= settings.MAIN_XP_PER_LEVEL
            kid_profile.main_level += 1
            kid_profile.coins += settings.COINS_PER_MAIN_LEVEL
        kid_profile.save()

        leveled_up = kid_profile.main_level > main_level_before

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

    if leveled_up:
        try:
            requests.post(
                f"{settings.NOTIFICATION_INTERNAL_URL}/api/notification/internal/notify/",
                json={
                    'recipient_id': str(kid_id),
                    'notification_type': 'level_up',
                    'message': 'You leveled up. Keep it up.',
                },
                headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
                timeout=3,
            )
        except requests.RequestException:
            pass

    return kid_profile, completion_event

