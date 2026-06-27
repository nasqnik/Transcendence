from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from common.permissions import IsInternalService, IsParent
from .models import ActivityEvent
from . import services
from drf_spectacular.utils import OpenApiParameter, extend_schema
from .serializers import (ActivityEventCreateSerializer, KidDashboardSerializer)

@extend_schema(
    summary='Ingest a completion event (internal)',
    description=(
        'Service-to-service endpoint called by gamification-service after '
        'a completion is processed. Authenticated by X-Internal-Token. '
        'Idempotent: if completion_id. already exists, return 204 without duplicating.'
    ),
    request=ActivityEventCreateSerializer,
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
    tags=['internal'],
)
class InternalActivityEventView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = ActivityEventCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        if ActivityEvent.objects.filter(completion_id=data["completion_id"]).exists():
            return Response(status=status.HTTP_204_NO_CONTENT)
        ActivityEvent.objects.create(
            completion_id=data["completion_id"],
            kid_id=data["kid_id"],
            payload=data["payload"],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
    
@extend_schema(
    summary='Get parent dashboard for a kid',
    description=(
        'Parent-only. Returns category breakdown, daily points trend, '
        'and task completion rates for a guarded kid.'
    ),
    parameters=[
        OpenApiParameter(
            name='kid_id',
            type=str,
            location=OpenApiParameter.PATH,
            required=True,
            description='ID of the kid to fetch dashboard for.',
        ),
    ],
    responses={200: KidDashboardSerializer,
               400: None,
               404: None,
    },
    auth=[{'BearerAuth': []}],
    tags=['Dashboard'],
)
class KidDashboardView(APIView):
    permission_classes = [IsParent]

    def get(self, request, kid_id):
        if kid_id not in request.user.kid_ids:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        events = ActivityEvent.objects.filter(kid_id=kid_id)
        token = request.auth.token.decode('utf-8')
        completion_rates = services.fetch_completion_rates(kid_id, token)

        response_data = {
            'category_breakdown': services.build_category_breakdown(events),
            'daily_trend': services.build_daily_trend(events),
            'completion_rates': completion_rates,
        }

        serializer = KidDashboardSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)

