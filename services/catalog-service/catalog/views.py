import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from rest_framework.parsers import MultiPartParser
from common.permissions import IsKid, IsParent
from common.actors import KidActor
from .models import AvatarItem, KidAvatar, RewardPurchase, ParentProfile
from .serializers import (
    AvatarItemSerializer, 
    KidAvatarSerializer, 
    KidAvatarDetailSerializer,
    PurchaseSerializer,
    EquipSerializer,
    UnequipSerializer,
    PurchaseResourceSerializer,
    ParentProfileSerializer,
    ParentProfileUploadSerializer,
)

class ShopListView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='List all active shop items',
        description='Kid views all available avatar items in the shop.',
        responses={200: AvatarItemSerializer(many=True)},
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
        description=('Kid spends coins to unlock an avatar item. Coins are deducted from gamification-service. '
                    'Returns 400 if item already owned or insufficient coins. '
                    'Returns 503 if gamification-service is unavailable.'),
        request=PurchaseSerializer,
        responses={200: PurchaseResourceSerializer,
                   400: None,
                   503: None,
                   404: None},
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
        responses=KidAvatarDetailSerializer,
        auth=[{'BearerAuth': []}],
        tags=['Avatar'],
    )
    def get(self, request):
        avatar, _ = KidAvatar.objects.get_or_create(kid_id=request.user.kid_id)
        return Response(KidAvatarDetailSerializer(avatar).data)
    
class EquipItemView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='Equip an avatar item',
        description=(
            'Kid equips an owned avatar item to correct slot. '
            'Returns 400 if item not owned. '
            'Returns 404 if item not found or inactive'
        ),
        request=EquipSerializer,
        responses={
            200: KidAvatarDetailSerializer,
            400: None,
            404: None,
        },
        auth=[{'BearerAuth': []}],
        tags=['Avatar'],
    )
    def patch(self, request):
        serializer = EquipSerializer(data=request.data)
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

        return Response(KidAvatarDetailSerializer(avatar).data)
    
class UnequipItemView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='Unequip an avatar item',
        description=(
            'Kid unequips an item from a specific slot. '
            'The slot is set back to empty.'
        ),
        request=UnequipSerializer,
        responses={
            200: KidAvatarDetailSerializer,
            400: None,
        },
        auth=[{'BearerAuth': []}],
        tags=['Avatar'],
        )
    def patch(self, request):
        serializer = UnequipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slot = serializer.validated_data['slot']
        kid_id = request.user.kid_id

        avatar, _ = KidAvatar.objects.get_or_create(kid_id=kid_id)

        slot_field = f"equipped_{slot}"
        setattr(avatar, slot_field, None)
        avatar.save()

        return Response(KidAvatarDetailSerializer(avatar).data)
    
class ParentAvatarUploadView(APIView):
    permission_classes = [IsParent]
    parser_classes = [MultiPartParser]

    @extend_schema(
        summary='Upload parent profile picture',
        description='Parent uploads a profile picture. Replaces existing picture if one already exists. A default avatar is assigned if none is uploaded.',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'profile_picture': {
                        'type': 'string',
                        'format': 'binary',
                        'description': 'Image file to upload (JPEG, PNG, WebP, max 2MB).',
                    }
                },
                'required': ['profile_picture']
            }
        },
        responses={
            200: ParentProfileSerializer,
            400: None,
        },
        auth=[{'BearerAuth': []}],
        tags=['Parent Profile'],
    )
    def post(self, request):
        serializer = ParentProfileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile, _ = ParentProfile.objects.get_or_create(
            parent_id=request.user.user_id
        )
        profile.profile_picture = serializer.validated_data['profile_picture']
        profile.save()

        return Response(ParentProfileSerializer(profile, context={'request': request}).data)


class ParentAvatarView(APIView):
    permission_classes = [IsParent]

    @extend_schema(
        summary='Get parent profile picture',
        description='Returns the parent profile picture URL. Returns default avatar URL if none uploaded.',
        responses={200: ParentProfileSerializer},
        auth=[{'BearerAuth': []}],
        tags=['Parent Profile'],
    )
    def get(self, request):
        profile, _ = ParentProfile.objects.get_or_create(
            parent_id=request.user.user_id
        )
        return Response(ParentProfileSerializer(profile, context={'request': request}).data)