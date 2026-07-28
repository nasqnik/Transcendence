import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.parsers import MultiPartParser
from common.permissions import IsInternalService, IsKid, IsParent
from common.actors import KidActor
from .models import AvatarItem, KidAvatar, RewardPurchase, ParentProfile
from .serializers import (
    AvatarItemSerializer,
    BaseCharacterSerializer,
    KidAvatarSerializer,
    KidAvatarDetailSerializer,
    PurchaseSerializer,
    EquipSerializer,
    UnequipSerializer,
    PurchaseResourceSerializer,
    ParentProfileSerializer,
    ParentProfileUploadSerializer,
    BaseCharacterOptionSerializer,
    KidAvatarSummarySerializer,
)

def build_avatar_url(avatar):
    base_url = f"https://api.dicebear.com/10.x/adventurer/svg?seed={avatar.base_character}"
    if avatar.base_character in ['5dko0f0w', 'kwiay0te']:
        base_url += "&hairColor=2c1b18"

    params = {}
    needs_save = False

    slots = [
        ('equipped_hair', None),
        ('equipped_glasses', 'glassesProbability'),
        ('equipped_earrings', 'earringsProbability'),
        ('equipped_background', None),
    ]

    for slot_field, probability_key in slots:
        item_id = getattr(avatar, slot_field)
        if item_id:
            try:
                item = AvatarItem.objects.get(id=item_id)
                params[item.param_key] = item.param_value
                if probability_key:
                    params[probability_key] = '100'
            except AvatarItem.DoesNotExist:
                # item was deleted — auto-unequip
                setattr(avatar, slot_field, None)
                needs_save = True

    if needs_save:
        avatar.save()

    if params:
        query = '&'.join(f"{k}={v}" for k, v in params.items())
        return f"{base_url}&{query}"

    return base_url

BASE_CHARACTERS = [
    {
        'seed': '5dko0f0w',
        'name': 'Male',
        'avatar_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=5dko0f0w&hairColor=2c1b18',
    },
    {
        'seed': 'kwiay0te',
        'name': 'Female',
        'avatar_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=kwiay0te&hairColor=2c1b18',
    },
]

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
        description=(
            'Kid spends coins to unlock an avatar item. Coins are deducted from gamification-service. '
            'Returns 400 if item already owned or insufficient coins. '
            'Returns 503 if gamification-service is unavailable.'
        ),
        request=PurchaseSerializer,
        responses={
            200: PurchaseResourceSerializer,
            400: None,
            503: None,
            404: None,
        },
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

        if str(item_id) in [str(i) for i in avatar.unlocked_items]:
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
                    'reason': 'avatar_purchase',
                },
                headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
                timeout=5,
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
        responses={200: KidAvatarDetailSerializer},
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
            'Returns 404 if item not found or inactive.'
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

        if str(item_id) not in [str(i) for i in avatar.unlocked_items]:
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
        description='Parent uploads a profile picture. Replaces existing picture if one already exists.',
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
                'required': ['profile_picture'],
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

        if profile.profile_picture:
            profile.profile_picture.delete(save=False)

        profile.profile_picture = serializer.validated_data['profile_picture']
        profile.save()

        return Response(ParentProfileSerializer(profile, context={'request': request}).data)


class ParentAvatarView(APIView):
    permission_classes = [IsParent]

    @extend_schema(
        summary='Get parent profile picture',
        description='Returns the parent profile picture URL. Returns null if none uploaded.',
        responses={200: ParentProfileSerializer},
        auth=[{'BearerAuth': []}],
        tags=['Parent Profile'],
    )
    def get(self, request):
        profile, _ = ParentProfile.objects.get_or_create(
            parent_id=request.user.user_id
        )
        return Response(ParentProfileSerializer(profile, context={'request': request}).data)
    
    @extend_schema(
        summary='Delete parent profile picture',
        description='Deletes the parent profile picture. Returns null for profile_picture after deletion.',
        responses={200: ParentProfileSerializer},
        auth=[{'BearerAuth': []}],
        tags=['Parent Profile'],
    )
    def delete(self, request):
        profile, _ = ParentProfile.objects.get_or_create(
            parent_id=request.user.user_id
        )
        if profile.profile_picture:
            profile.profile_picture.delete(save=False)
        profile.profile_picture = None
        profile.save()
        return Response(ParentProfileSerializer(profile, context={'request': request}).data)
    
class BaseCharacterView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='Set base character',
        description='Kid selects their base character (male or female). Free — no coins required.',
        request=BaseCharacterSerializer,
        responses={
            200: KidAvatarDetailSerializer,
            400: None,
        },
        auth=[{'BearerAuth': []}],
        tags=['Avatar'],
    )
    def patch(self, request):
        serializer = BaseCharacterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        avatar, _ = KidAvatar.objects.get_or_create(kid_id=request.user.kid_id)
        avatar.base_character = serializer.validated_data['base_character']
        avatar.save()

        return Response(KidAvatarDetailSerializer(avatar).data)
    
class BaseCharacterListView(APIView):
    permission_classes = [IsKid]

    @extend_schema(
        summary='List available base characters',
        description='Returns available base character options (male and female). Free to select — no coins required.',
        responses={200: BaseCharacterOptionSerializer(many=True)},
        auth=[{'BearerAuth': []}],
        tags=['Avatar'],
    )
    def get(self, request):
        return Response(BASE_CHARACTERS)
    
class ParentKidsAvatarsView(APIView):
    permission_classes = [IsParent]

    @extend_schema(
        summary='Get all kids avatars for parent',
        description='Parent gets composed avatar URLs for all their guarded kids. Returns one avatar_url per kid ready to display.',
        responses={200: KidAvatarSummarySerializer(many=True)},
        auth=[{'BearerAuth': []}],
        tags=['Parent Profile'],
    )
    def get(self, request):
        kid_ids = request.user.kid_ids
        result = []
        for kid_id in kid_ids:
            avatar, _ = KidAvatar.objects.get_or_create(kid_id=kid_id)
            result.append({
                'kid_id': str(kid_id),
                'avatar_url': build_avatar_url(avatar),
            })
        return Response(result)

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
