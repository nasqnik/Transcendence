import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import OpenApiParameter, extend_schema
from common.permissions import IsInternalService, IsKid
from common.actors import KidActor
from .models import AvatarItem, KidAvatar, RewardPurchase
from .serializers import (
    AvatarItemSerializer, 
    KidAvatarSerializer, 
    PurchaseSerializer
)

class ShopListView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='List all active shop items',
        description='Kid views all available avatar items in the shop.',
        responses=AvatarItemSerializer(many=True),
        auth=[{'BearerAuth': []}],
        tags=['Shop'],
    )
    def get(self, request):
        items = AvatarItem.objects.filter(is_active=True)
        return Response(AvatarItemSerializer(items, many=True).data)
    

class PurchaseView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='Purchase an avatar item',
        description='Kid spends coins to unlock an avatar item. Coins are deducted from gamification-service.',
        request=PurchaseSerializer,
        responses={200: None},
        auth=[{'BearerAuth': []}],
        tags=['Shop'],
    )
    def post(self, request):
        serializer = PurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_id = serializer.validated_data['item_id']
        kid_id = request.user.kid_id

        try:
            item = AvatarItem.objects.get(id=item_id, is_active=True)
        except AvatarItem.DoesNotExist:
            return Response(
                {'detail': 'Item not found or inactive.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        avatar, _ = KidAvatar.objects.get_or_create(kid_id=kid_id)

        if(str(item_id) in [str(i) for i in avatar.unlocked_items]):
            return Response(
                {'detail': 'Item already owned.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            resp = requests.post(
                f"{settings.GAMIFICATION_INTERNAL_URL}/api/gamification/internal/coins/deduct/",
                json={
                'kid_id': str(kid_id),
                'amount': item.coin_cost,
                'reason': 'avatar_purchase'
                },
                headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
                timeout=5
            )
            resp.raise_for_status()
            result = resp.json()
            if not result.get('success'):
                return Response(
                    {'detail': 'Insufficient coins.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except requests.RequestException:
            return Response(
                {'detail': 'Could not process purchase right now.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        
        avatar.unlocked_items = avatar.unlocked_items + [str(item_id)]
        avatar.save()

        RewardPurchase.objects.create(
            kid_id=kid_id,
            item=item,
            coins_spent=item.coin_cost,
        )

        return Response({
            'detail': 'Purchase successful.',
            'remaining_coins': result.get('remaining_coins'),
        })
    
class AvatarView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='Get kid avatar',
        description='Kid views their current avatar state including owned and equipped items.',
        responses=KidAvatarSerializer,
        auth=[{'BearerAuth': []}],
        tags=['Avatar'],
    )
    def get(self, request):
        avatar, _ = KidAvatar.objects.get_or_create(kid_id=request.user.kid_id)
        return Response(KidAvatarSerializer(avatar).data)
    
class EquipItemView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='Equip an avatar item',
        description='Kid equips an owned avatar item to correct slot.',
        request=PurchaseSerializer,
        responses=KidAvatarSerializer,
        auth=[{'BearerAuth': []}],
        tags=['Avatar'],
    )
    def patch(self, request):
        serializer = PurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_id = serializer.validated_data['item_id']
        kid_id = request.user.kid_id

        try:
            item = AvatarItem.objects.get(id=item_id, is_active=True)
        except AvatarItem.DoesNotExist:
            return Response(
                {'detail': 'Item not found or inactive.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        avatar, _ = KidAvatar.objects.get_or_create(kid_id=kid_id)

        if(str(item_id) not in [str(i) for i in avatar.unlocked_items]):
            return Response(
                {'detail': 'You do not own this item.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slot_field = f"equipped_{item.type}"
        setattr(avatar, slot_field, item_id)
        avatar.save()

        return Response(KidAvatarSerializer(avatar).data)


class InternalAvatarsBatchView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    @extend_schema(
        summary='Batch kid avatars (internal)',
        description=(
            'Service-to-service read of catalog avatars for one or more kids. '
            'Kids without an avatar row are omitted from the response.'
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
        responses=KidAvatarSerializer(many=True),
        auth=[],
        tags=['Internal'],
    )
    def get(self, request):
        ids_raw = request.query_params.get('ids', '')
        id_strings = [part.strip() for part in ids_raw.split(',') if part.strip()]
        if not id_strings:
            return Response([])

        avatars = KidAvatar.objects.filter(kid_id__in=id_strings)
        return Response(KidAvatarSerializer(avatars, many=True).data)