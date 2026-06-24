from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from common.permissions import IsInternalService, IsKid, IsParent
from common.actors import KidActor
from .models import Notification
from drf_spectacular.utils import OpenApiParameter, extend_schema
from .serializers import (
    NotificationCreateSerializer,
    NotificationSerializer,
    NotificationMarkReadSerializer,
    UnreadCountSerializer,
)


@extend_schema(
    summary='Create a notification (internal)',
    description=(
        'Service-to-service endpoint called by task-service and gamification-service '
        'to create a notification for a user. Authenticated by X-Internal-Token.'
    ),
    request=NotificationCreateSerializer,
    parameters=[
        OpenApiParameter(
            name='X-Internal-Token',
            type=str,
            location=OpenApiParameter.HEADER,
            required=True,
            description='Shared internal-service secret.',
        ),
    ],
    responses={
        204: None,
        400: None,
    },
    auth=[],
    tags=['Internal'],
)
class InternalNotifyView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = NotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Notification.objects.create(
            recipient_id=serializer.validated_data['recipient_id'],
            notification_type=serializer.validated_data['notification_type'],
            message=serializer.validated_data['message'],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary='List unread notifications',
    description='Returns all unread notifications for the logged-in kid or parent.',
    responses={200: NotificationSerializer(many=True)},
    auth=[{'BearerAuth': []}],
    tags=['Notifications'],
)
class NotificationListView(APIView):
    permission_classes = [IsKid | IsParent]

    def get(self, request):
        if isinstance(request.user, KidActor):
            recipient_id = request.user.kid_id
        else:
            recipient_id = request.user.user_id
        notifications = Notification.objects.filter(
            recipient_id=recipient_id,
            is_read=False,
        )
        return Response(NotificationSerializer(notifications, many=True).data)


@extend_schema(
    summary='Mark a notification as read',
    description='Marks a specific notification as read. Only the recipient can mark their own notifications.',
    parameters=[
        OpenApiParameter(
            name='notification_id',
            type=str,
            location=OpenApiParameter.PATH,
            required=True,
            description='UUID of the notification to mark as read.',
        ),
    ],
    responses={
        200: NotificationMarkReadSerializer,
        404: None,
    },
    auth=[{'BearerAuth': []}],
    tags=['Notifications'],
)
class NotificationMarkReadView(APIView):
    permission_classes = [IsKid | IsParent]

    def patch(self, request, notification_id):
        if isinstance(request.user, KidActor):
            recipient_id = request.user.kid_id
        else:
            recipient_id = request.user.user_id
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient_id=recipient_id,
            )
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        notification.is_read = True
        notification.save()
        return Response({'id': str(notification.id), 'is_read': True})


@extend_schema(
    summary='Get unread notification count',
    description='Returns the count of unread notifications for the logged-in kid or parent. Used for badge display.',
    responses={200: UnreadCountSerializer},
    auth=[{'BearerAuth': []}],
    tags=['Notifications'],
)
class NotificationUnreadCountView(APIView):
    permission_classes = [IsKid | IsParent]

    def get(self, request):
        if isinstance(request.user, KidActor):
            recipient_id = request.user.kid_id
        else:
            recipient_id = request.user.user_id
        count = Notification.objects.filter(
            recipient_id=recipient_id,
            is_read=False,
        ).count()
        return Response({'unread_count': count})