from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from common.permissions import IsInternalService, IsKid, IsParent
from common.actors import KidActor
from .models import Notification


class InternalNotifyView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        notification_type = request.data.get('notification_type')
        message = request.data.get('message')

        if not all([recipient_id, notification_type, message]):
            return Response(
                {'detail': 'recipient_id, notification_type and message are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Notification.objects.create(
            recipient_id=recipient_id,
            notification_type=notification_type,
            message=message,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        data = [
            {
                'id': str(n.id),
                'notification_type': n.notification_type,
                'message': n.message,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat(),
            }
            for n in notifications
        ]
        return Response(data)


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