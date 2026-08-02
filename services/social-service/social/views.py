from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from urllib.parse import urlencode

from common.permissions import IsKid

from .auth_client import search_kids
from .models import Friendship
from .notification_client import notify_friend_request
from .presence import online_among
from .search import (
    ALLOWED_ORDERING,
    ALLOWED_STATUS,
    STATUS_NOT_FRIENDS,
    build_auth_id_filters,
    friendship_maps_for,
    friendship_status_for,
)
from .serializers import (
    FriendListItemSerializer,
    FriendRequestCreateSerializer,
    FriendRequestListItemSerializer,
    FriendshipSerializer,
    KidSearchResultSerializer,
    either_direction_q,
    serialize_friends_for,
    serialize_incoming_requests_for,
)


@extend_schema_view(
    get=extend_schema(
        summary='List incoming friend requests',
        responses={200: FriendRequestListItemSerializer(many=True)},
        auth=[{'BearerAuth': []}],
        tags=['Friends'],
    ),
    post=extend_schema(
        summary='Send a friend request',
        request=FriendRequestCreateSerializer,
        responses={201: FriendshipSerializer},
        auth=[{'BearerAuth': []}],
        tags=['Friends'],
    ),
)
class FriendRequestListCreateView(generics.GenericAPIView):
    permission_classes = [IsKid]
    serializer_class = FriendshipSerializer

    def get(self, request):
        return Response(serialize_incoming_requests_for(request.user.kid_id))

    def post(self, request):
        serializer = FriendRequestCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        friendship = serializer.save()
        notify_friend_request(
            recipient_id=friendship.to_kid_id,
            sender_username=getattr(request.user, 'username', ''),
        )
        return Response(
            FriendshipSerializer(friendship).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    summary='Accept a friend request',
    parameters=[
        OpenApiParameter(
            name='request_id',
            type=str,
            location=OpenApiParameter.PATH,
            required=True,
            description='UUID of the pending friend request.',
        ),
    ],
    request=None,
    responses={200: FriendshipSerializer},
    auth=[{'BearerAuth': []}],
    tags=['Friends'],
)
class FriendRequestAcceptView(generics.GenericAPIView):
    permission_classes = [IsKid]
    serializer_class = FriendshipSerializer

    def post(self, request, request_id):
        me = request.user.kid_id
        friendship = get_object_or_404(
            Friendship,
            id=request_id,
            to_kid_id=me,
            status=Friendship.Status.PENDING,
        )
        friendship.status = Friendship.Status.ACCEPTED
        friendship.responded_at = timezone.now()
        friendship.save(update_fields=['status', 'responded_at'])
        return Response(self.get_serializer(friendship).data)


@extend_schema(
    summary='Decline a friend request',
    parameters=[
        OpenApiParameter(
            name='request_id',
            type=str,
            location=OpenApiParameter.PATH,
            required=True,
            description='UUID of the pending friend request.',
        ),
    ],
    request=None,
    responses={200: FriendshipSerializer},
    auth=[{'BearerAuth': []}],
    tags=['Friends'],
)
class FriendRequestDeclineView(generics.GenericAPIView):
    permission_classes = [IsKid]
    serializer_class = FriendshipSerializer

    def post(self, request, request_id):
        me = request.user.kid_id
        friendship = get_object_or_404(
            Friendship,
            id=request_id,
            to_kid_id=me,
            status=Friendship.Status.PENDING,
        )
        friendship.status = Friendship.Status.DECLINED
        friendship.responded_at = timezone.now()
        friendship.save(update_fields=['status', 'responded_at'])
        return Response(self.get_serializer(friendship).data)


@extend_schema(
    summary='List accepted friends with online status',
    responses={200: FriendListItemSerializer(many=True)},
    auth=[{'BearerAuth': []}],
    tags=['Friends'],
)
class FriendListView(generics.GenericAPIView):
    permission_classes = [IsKid]
    serializer_class = FriendListItemSerializer

    def get(self, request):
        return Response(serialize_friends_for(request.user.kid_id))


@extend_schema(
    summary='Remove an accepted friendship',
    parameters=[
        OpenApiParameter(
            name='kid_id',
            type=str,
            location=OpenApiParameter.PATH,
            required=True,
            description='UUID of the friend to remove.',
        ),
    ],
    request=None,
    responses={204: None, 404: None},
    auth=[{'BearerAuth': []}],
    tags=['Friends'],
)
class UnfriendView(generics.GenericAPIView):
    permission_classes = [IsKid]
    serializer_class = FriendshipSerializer

    def delete(self, request, kid_id):
        me = request.user.kid_id
        deleted, _ = Friendship.objects.filter(
            either_direction_q(me, kid_id),
            status=Friendship.Status.ACCEPTED,
        ).delete()
        if not deleted:
            return Response(
                {'detail': 'Friendship not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _parse_bool(raw):
    if raw is None or raw == '':
        return None
    value = str(raw).strip().lower()
    if value in ('true', '1', 'yes'):
        return True
    if value in ('false', '0', 'no'):
        return False
    raise ValidationError({'online': ['Must be true or false.']})


def _social_page_url(request, page, page_size, q, status_filter, ordering, online):
    params = {
        'q': q,
        'status': status_filter,
        'ordering': ordering,
        'page': page,
        'page_size': page_size,
    }
    if online is not None:
        params['online'] = 'true' if online else 'false'
    return request.build_absolute_uri(
        f"{request.path}?{urlencode(params)}"
    )


@extend_schema(
    summary='Search kids to add as friends',
    description=(
        'Search active kids by username/name with friendship filters, '
        'sorting, and pagination. Identity search is delegated to auth-service.'
    ),
    parameters=[
        OpenApiParameter(name='q', required=True, type=str, location=OpenApiParameter.QUERY),
        OpenApiParameter(
            name='status',
            required=False,
            type=str,
            location=OpenApiParameter.QUERY,
            description='not_friends (default) | pending | friends | all',
        ),
        OpenApiParameter(
            name='online',
            required=False,
            type=str,
            location=OpenApiParameter.QUERY,
            description='Optional true/false filter (applied after presence enrichment).',
        ),
        OpenApiParameter(
            name='ordering',
            required=False,
            type=str,
            location=OpenApiParameter.QUERY,
            description='username | -username | name | -name',
        ),
        OpenApiParameter(name='page', required=False, type=int, location=OpenApiParameter.QUERY),
        OpenApiParameter(
            name='page_size',
            required=False,
            type=int,
            location=OpenApiParameter.QUERY,
        ),
    ],
    responses={200: KidSearchResultSerializer(many=True)},
    auth=[{'BearerAuth': []}],
    tags=['Friends'],
)
class KidSearchView(generics.GenericAPIView):
    permission_classes = [IsKid]
    serializer_class = KidSearchResultSerializer

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            raise ValidationError({'q': ['Query must be at least 2 characters.']})

        status_filter = (
            request.query_params.get('status') or STATUS_NOT_FRIENDS
        ).strip()
        if status_filter not in ALLOWED_STATUS:
            raise ValidationError({
                'status': [
                    'Must be one of: not_friends, pending, friends, all.'
                ],
            })

        ordering = (request.query_params.get('ordering') or 'username').strip()
        if ordering not in ALLOWED_ORDERING:
            raise ValidationError({
                'ordering': [
                    'Must be one of: username, -username, name, -name.'
                ],
            })

        try:
            page = int(request.query_params.get('page') or 1)
            page_size = int(request.query_params.get('page_size') or 20)
        except (TypeError, ValueError) as exc:
            raise ValidationError({
                'page': ['page and page_size must be integers.'],
            }) from exc
        if page < 1:
            raise ValidationError({'page': ['Must be >= 1.']})
        if page_size < 1 or page_size > 50:
            raise ValidationError({'page_size': ['Must be between 1 and 50.']})

        online_filter = _parse_bool(request.query_params.get('online'))

        me = request.user.kid_id
        accepted, pending_sent, pending_received = friendship_maps_for(me)
        id_filters = build_auth_id_filters(
            me, status_filter, accepted, pending_sent, pending_received,
        )

        if id_filters['include_ids_set'] and not id_filters['include_ids']:
            return Response({
                'count': 0,
                'next': None,
                'previous': None,
                'results': [],
            })

        payload = search_kids(
            q=q,
            ordering=ordering,
            page=page,
            page_size=page_size,
            exclude_ids=id_filters['exclude_ids'],
            include_ids=id_filters['include_ids'],
            include_ids_set=id_filters['include_ids_set'],
        )

        results = payload.get('results') or []
        kid_ids = [row.get('kid_id') for row in results if row.get('kid_id')]
        online = online_among(kid_ids)

        enriched = []
        for row in results:
            kid_id = row.get('kid_id')
            if not kid_id:
                continue
            is_online = str(kid_id) in online
            if online_filter is True and not is_online:
                continue
            if online_filter is False and is_online:
                continue
            enriched.append({
                'kid_id': kid_id,
                'username': row.get('username') or '',
                'name': row.get('name') or '',
                'bio': row.get('bio') or '',
                'is_online': is_online,
                'friendship_status': friendship_status_for(
                    kid_id, accepted, pending_sent, pending_received,
                ),
            })

        auth_count = int(payload.get('count') or 0)
        total_pages = (auth_count + page_size - 1) // page_size if auth_count else 0

        next_url = None
        previous_url = None
        if online_filter is None and page < total_pages:
            next_url = _social_page_url(
                request, page + 1, page_size, q, status_filter, ordering, online_filter,
            )
        if online_filter is None and page > 1 and auth_count > 0:
            previous_url = _social_page_url(
                request, page - 1, page_size, q, status_filter, ordering, online_filter,
            )

        return Response({
            'count': len(enriched) if online_filter is not None else auth_count,
            'next': next_url,
            'previous': previous_url,
            'results': KidSearchResultSerializer(enriched, many=True).data,
        })
