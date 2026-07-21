from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.response import Response

from common.permissions import IsKid

from .models import Friendship
from .serializers import (
    FriendListItemSerializer,
    FriendRequestCreateSerializer,
    FriendshipSerializer,
    either_direction_q,
    serialize_friends_for,
)


@extend_schema_view(
    get=extend_schema(
        summary='List incoming friend requests',
        responses={200: FriendshipSerializer(many=True)},
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
        me = request.user.kid_id
        rows = Friendship.objects.filter(
            to_kid_id=me,
            status=Friendship.Status.PENDING,
        )
        return Response(self.get_serializer(rows, many=True).data)

    def post(self, request):
        serializer = FriendRequestCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        friendship = serializer.save()
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
