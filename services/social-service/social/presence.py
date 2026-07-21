"""Redis-backed online presence for kids."""

from django.conf import settings
import redis

ONLINE_SET_KEY = 'presence:online'

_memory_online: set[str] = set()


def _use_memory():
    return getattr(settings, 'PRESENCE_BACKEND', 'redis') == 'memory'


def get_redis():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def mark_online(kid_id):
    kid_key = str(kid_id)
    if _use_memory():
        _memory_online.add(kid_key)
        return
    get_redis().sadd(ONLINE_SET_KEY, kid_key)


def mark_offline(kid_id):
    kid_key = str(kid_id)
    if _use_memory():
        _memory_online.discard(kid_key)
        return
    get_redis().srem(ONLINE_SET_KEY, kid_key)


def is_online(kid_id):
    kid_key = str(kid_id)
    if _use_memory():
        return kid_key in _memory_online
    return bool(get_redis().sismember(ONLINE_SET_KEY, kid_key))


def online_among(kid_ids):
    """Return set of kid_id strings that are currently online."""
    keys = [str(k) for k in kid_ids]
    if not keys:
        return set()
    if _use_memory():
        return {k for k in keys if k in _memory_online}
    pipe = get_redis().pipeline()
    for key in keys:
        pipe.sismember(ONLINE_SET_KEY, key)
    results = pipe.execute()
    return {key for key, online in zip(keys, results) if online}
