from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from common.permissions import IsInternalService, IsParent
from .models import ActivityEvent
from . import services

class InternalActivityEventView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    def post(self, request):
        completion_id = request.data.get('completion_id')
        if not completion_id:
            return Response(
                {'detail': 'completion_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if ActivityEvent.objects.filter(completion_id=completion_id).exists():
            return Response(status=status.HTTP_204_NO_CONTENT)
        ActivityEvent.objects.create(
            completion_id=completion_id,
            kid_id=request.data.get('kid_id'),
            payload=request.data.get('payload', []),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class KidDashboardView(APIView):
    permission_classes = [IsParent]

    def get(self, request, kid_id):
        if kid_id not in request.user.kid_ids:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        events = ActivityEvent.objects.filter(kid_id=kid_id)
        return Response({
            'category_breakdown': services.build_category_breakdown(events),
            'daily_trend': services.build_daily_trend(events),
        })
    