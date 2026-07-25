from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from common.permissions import IsInternalService, IsKid, IsParent
from .models import KidStat, KidProfile
from .serializers import (
    CoinDeductSerializer,
    CompletionIngestSerializer,
    KidStatSerializer,
    KidProfileSerializer,
)
from .engine import apply_completion, deduct_coins


@extend_schema(
    summary='Ingest a confirmed completion (internal)',
    description=(
        'Service-to-service endpoint called by task-service when a completion '
        'is confirmed. Authenticated by the X-Internal-Token shared secret, '
        'not a user JWT. Idempotent on completion_id.'
    ),
    request=CompletionIngestSerializer,
    parameters=[
        OpenApiParameter(
            name='X-Internal-Token',
            type=str,
            location=OpenApiParameter.HEADER,
            required=True,
            description='Shared internal-service secret.',
        ),
    ],
    responses={204: None},
    auth=[],
)
class InternalCompletionView(APIView):
    authentication_classes = []          # no JWT for internal calls
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = CompletionIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        apply_completion(
            kid_id=data['kid_id'],
            completion_id=data['completion_id'],
            category_points=data['category_points'],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary='Deduct coins from a kid profile (internal)',
    description=(
        'Service-to-service endpoint called by catalog-service when a kid '
        'purchases an avatar item. Uses row locking to prevent double-spend.'
    ),
    request=CoinDeductSerializer,
    parameters=[
        OpenApiParameter(
            name='X-Internal-Token',
            type=str,
            location=OpenApiParameter.HEADER,
            required=True,
            description='Shared internal-service secret.',
        ),
    ],
    auth=[],
)
class InternalCoinDeductView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = CoinDeductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        success, remaining_coins = deduct_coins(
            kid_id=data['kid_id'],
            amount=data['amount'],
        )
        if success:
            return Response({
                'success': True,
                'remaining_coins': remaining_coins,
            })
        return Response({
            'success': False,
            'reason': 'insufficient_coins',
        })


@extend_schema(
    summary='Batch kid progress (internal)',
    description=(
        'Service-to-service read of overall XP and per-category stats for '
        'one or more kids. Query param ids is a comma-separated list of UUIDs.'
    ),
    parameters=[
        OpenApiParameter(
            name='X-Internal-Token',
            type=str,
            location=OpenApiParameter.HEADER,
            required=True,
            description='Shared internal-service secret.',
        ),
        OpenApiParameter(
            name='ids',
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description='Comma-separated kid UUIDs.',
        ),
    ],
    auth=[],
)
class InternalKidsProgressView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    def get(self, request):
        ids_raw = request.query_params.get('ids', '')
        id_strings = [part.strip() for part in ids_raw.split(',') if part.strip()]
        if not id_strings:
            return Response([])

        profiles = {
            str(p.kid_id): p
            for p in KidProfile.objects.filter(kid_id__in=id_strings)
        }
        stats_by_kid = {}
        for stat in KidStat.objects.filter(kid_id__in=id_strings):
            stats_by_kid.setdefault(str(stat.kid_id), []).append(stat)

        payload = []
        for kid_id in id_strings:
            profile = profiles.get(kid_id)
            stats = stats_by_kid.get(kid_id, [])
            payload.append({
                'kid_id': kid_id,
                'main_level': profile.main_level if profile else 0,
                'overall_xp': profile.overall_xp if profile else 0,
                'stats': KidStatSerializer(stats, many=True).data,
            })
        return Response(payload)


@extend_schema(
    summary="List the kid's own stats",
    responses=KidStatSerializer(many=True),
)
class KidStatListView(APIView):
    permission_classes = [IsKid]

    def get(self, request):
        stats = KidStat.objects.filter(kid_id=request.user.kid_id)
        return Response(KidStatSerializer(stats, many=True).data)


@extend_schema(
    summary="Get the kid's profile (level, xp, coins)",
    responses=KidProfileSerializer,
)
class KidProfileView(APIView):
    permission_classes = [IsKid]

    def get(self, request):
        profile, _ = KidProfile.objects.get_or_create(kid_id=request.user.kid_id)
        return Response(KidProfileSerializer(profile).data)


@extend_schema(
    summary="List a guarded kid's stats (parent)",
    responses=KidStatSerializer(many=True),
)
class KidStatListViewParent(APIView):
    permission_classes = [IsParent]

    def get(self, request, kid_id):
        if kid_id not in request.user.kid_ids:
            return Response(status=status.HTTP_403_FORBIDDEN)
        stats = KidStat.objects.filter(kid_id=kid_id)
        return Response(KidStatSerializer(stats, many=True).data)