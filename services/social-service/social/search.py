"""Kid search helpers: friendship maps and status labels."""

from .models import Friendship
from .serializers import involving_kid_q


FRIENDSHIP_NONE = 'none'
FRIENDSHIP_PENDING_SENT = 'pending_sent'
FRIENDSHIP_PENDING_RECEIVED = 'pending_received'
FRIENDSHIP_FRIENDS = 'friends'

STATUS_ALL = 'all'
STATUS_NOT_FRIENDS = 'not_friends'
STATUS_PENDING = 'pending'
STATUS_FRIENDS = 'friends'

ALLOWED_STATUS = {
    STATUS_ALL,
    STATUS_NOT_FRIENDS,
    STATUS_PENDING,
    STATUS_FRIENDS,
}

ALLOWED_ORDERING = {'username', '-username', 'name', '-name'}


def friendship_maps_for(me):
    """
    Return (accepted_ids, pending_sent_ids, pending_received_ids) as sets of str.
    """
    me = str(me)
    accepted = set()
    pending_sent = set()
    pending_received = set()

    rows = Friendship.objects.filter(
        involving_kid_q(me),
        status__in=[Friendship.Status.ACCEPTED, Friendship.Status.PENDING],
    )
    for row in rows:
        other = str(row.to_kid_id if str(row.from_kid_id) == me else row.from_kid_id)
        if row.status == Friendship.Status.ACCEPTED:
            accepted.add(other)
        elif str(row.from_kid_id) == me:
            pending_sent.add(other)
        else:
            pending_received.add(other)
    return accepted, pending_sent, pending_received


def friendship_status_for(kid_id, accepted, pending_sent, pending_received):
    kid_key = str(kid_id)
    if kid_key in accepted:
        return FRIENDSHIP_FRIENDS
    if kid_key in pending_sent:
        return FRIENDSHIP_PENDING_SENT
    if kid_key in pending_received:
        return FRIENDSHIP_PENDING_RECEIVED
    return FRIENDSHIP_NONE


def build_auth_id_filters(me, status, accepted, pending_sent, pending_received):
    """
    Return kwargs for search_kids: exclude_ids and/or include_ids_set + include_ids.
    Always excludes self.
    """
    me = str(me)
    related = accepted | pending_sent | pending_received

    if status == STATUS_NOT_FRIENDS:
        return {
            'exclude_ids': [me, *related],
            'include_ids_set': False,
            'include_ids': None,
        }
    if status == STATUS_FRIENDS:
        return {
            'exclude_ids': [me],
            'include_ids_set': True,
            'include_ids': list(accepted),
        }
    if status == STATUS_PENDING:
        return {
            'exclude_ids': [me],
            'include_ids_set': True,
            'include_ids': list(pending_sent | pending_received),
        }
    # all
    return {
        'exclude_ids': [me],
        'include_ids_set': False,
        'include_ids': None,
    }
