from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAuthenticatedKid, IsInternalService
from .models import CustomUser, Kid
from .serializers import (
    AcceptGuardianInviteSerializer,
    GoogleLoginSerializer,
    GuardianInviteDetailSerializer,
    InviteSecondParentSerializer,
    KidGoogleLoginSerializer,
    KidGoogleSignupSerializer,
    KidProfileSerializer,
    KidSignupSerializer,
    KidTokenObtainSerializer,
    KidTokenRefreshSerializer,
    KidTokenVerifySerializer,
    KidVerifyEmailSerializer,
    MeEmailChangeSerializer,
    MePasswordSerializer,
    ParentProfileSerializer,
    ParentRegisterSerializer,
    ParentVerifyEmailSerializer,
    VerifyEmailChangeSerializer,
)
from .services import InvitationNotFound, get_guardian_invitation_by_token, mark_expired_if_needed

# views vs serializers
# views are the logic of the API
# serializers are the data validation and serialization
    # serialization is the process of converting the data
        # into a format that can be sent over the network

class KidSignupView(generics.CreateAPIView):
    """Register a kid and email the primary guardian a pending invitation."""

    permission_classes = [AllowAny] # no login required
    serializer_class = KidSignupSerializer


class KidGoogleSignupView(generics.CreateAPIView):
    """Register a kid via Google and email the primary guardian."""

    permission_classes = [AllowAny]
    serializer_class = KidGoogleSignupSerializer


class ParentRegisterView(generics.CreateAPIView):
    """Create a parent CustomUser account (email + password)."""

    permission_classes = [AllowAny]
    serializer_class = ParentRegisterSerializer


@extend_schema(request=GoogleLoginSerializer)
class GoogleLoginView(APIView):
    """Parent sign-in via Google Identity Services id_token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        #is_valid call => validate_username , validate_password, validate_email, .... , validate .
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(request=ParentVerifyEmailSerializer)
class ParentVerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ParentVerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(request=KidVerifyEmailSerializer)
class KidVerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = KidVerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class GuardianInviteDetailView(generics.RetrieveAPIView):
    """Public preview of an invitation (for apps / parent UI)."""

    permission_classes = [AllowAny]
    serializer_class = GuardianInviteDetailSerializer

    def get_object(self):
        try:
            invitation = get_guardian_invitation_by_token(self.kwargs["token"])
        except InvitationNotFound as exc:
            raise NotFound("Invitation not found.") from exc
        return mark_expired_if_needed(invitation)

class AcceptGuardianInviteView(generics.GenericAPIView):
    """Authenticated parent accepts a pending guardian invitation."""

    permission_classes = [IsAuthenticated] #logged in parent required
    serializer_class = AcceptGuardianInviteSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()
        return Response(
            serializer.to_representation(invitation),
            status=status.HTTP_200_OK,
        )


@extend_schema(request=KidTokenObtainSerializer)
class KidTokenObtainView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = KidTokenObtainSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(request=KidTokenRefreshSerializer)
class KidTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = KidTokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(request=KidTokenVerifySerializer)
class KidTokenVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = KidTokenVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(request=KidGoogleLoginSerializer)
class KidGoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = KidGoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class InviteSecondParentView(generics.CreateAPIView):
    permission_classes = [IsAuthenticatedKid] #logged in kid required
    serializer_class = InviteSecondParentSerializer


class KidParentInternalView(APIView):
    authentication_classes = []
    permission_classes = [IsInternalService]

    def get(self, request, kid_id):
        try:
            kid = Kid.objects.get(id=kid_id)
        except Kid.DoesNotExist:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if kid.parent_id is None:
            return Response(
                {'detail': 'Kid has no parent.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'parent_id': str(kid.parent_id)})


def _serialize_internal_kid(kid):
    return {
        'kid_id': str(kid.id),
        'username': kid.username,
        'name': kid.name,
        'bio': kid.bio or '',
    }


class KidInternalDetailView(APIView):
    """Service-to-service: confirm an active kid exists."""

    authentication_classes = []
    permission_classes = [IsInternalService]

    def get(self, request, kid_id):
        try:
            kid = Kid.objects.get(
                id=kid_id,
                registration_status=Kid.RegistrationStatus.ACTIVE,
            )
        except Kid.DoesNotExist:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(_serialize_internal_kid(kid))


class KidInternalBatchView(APIView):
    """Service-to-service: batch lookup of active kids by id."""

    authentication_classes = []
    permission_classes = [IsInternalService]

    def get(self, request):
        ids_raw = request.query_params.get('ids', '')
        id_strings = [part.strip() for part in ids_raw.split(',') if part.strip()]
        if not id_strings:
            return Response([])

        kids = Kid.objects.filter(
            id__in=id_strings,
            registration_status=Kid.RegistrationStatus.ACTIVE,
        )
        return Response([_serialize_internal_kid(kid) for kid in kids])


class MeView(APIView):
    """Return or update the authenticated parent's or kid's own profile."""

    permission_classes = [IsAuthenticated]

    def get_serializer(self, instance, data=None, partial=False):
        if isinstance(instance, Kid):
            serializer_class = KidProfileSerializer
        else:
            serializer_class = ParentProfileSerializer
        if data is None:
            return serializer_class(instance)
        return serializer_class(instance, data=data, partial=partial)

    def get(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        if not isinstance(user, (Kid, CustomUser)):
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema(request=MePasswordSerializer)
class MePasswordView(APIView):
    """Set or change the authenticated parent's or kid's app password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(request=MeEmailChangeSerializer)
class MeEmailChangeView(APIView):
    """Request an email change; confirmation is sent to the new address."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MeEmailChangeSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_200_OK)


@extend_schema(request=VerifyEmailChangeSerializer)
class VerifyEmailChangeView(APIView):
    """Public: confirm a pending email change via token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


# Permissions:
# 1. AllowAny            -> no login required (signup, login, verify, invite preview)
# 2. IsAuthenticated     -> parent JWT required (request.user = CustomUser)
# 3. IsAuthenticatedKid  -> kid JWT required (request.user = Kid)


# Base classes in this file:
# 1. CreateAPIView    -> POST: create DB row, return 201
# 2. RetrieveAPIView  -> GET: read one DB row, return 200
# 3. GenericAPIView   -> no auto HTTP method; you write post/get yourself
# 4. APIView          -> fully manual; no serializer_class helper on the class


# What you set / override per category:

# 1. CreateAPIView (KidSignup, KidGoogleSignup, ParentRegister, InviteSecondParent)
#    Set:     permission_classes, serializer_class
#    Write:   nothing (DRF handles POST → validate → save → 201)
#    Logic:   lives in serializer.create()

# 2. RetrieveAPIView (GuardianInviteDetail)
#    Set:     permission_classes, serializer_class
#    Override get_object() only when URL is not /<pk>/ (here: lookup by invite token)
#    Logic:   lives in serializer (output shape) + services (fetch invite)

# 3. GenericAPIView (AcceptGuardianInvite)
#    Set:     permission_classes, serializer_class
#    Write:   def post() yourself
#    Uses:    get_serializer() + save() + to_representation() → 200
#    Logic:   lives in serializer.save() (updates invite, activates kid)
#    Note:    NOT a create endpoint — it's an action on existing data

# 4. APIView (Google login, kid login/refresh, email verify)
#    Set:     permission_classes
#    Write:   def post() yourself
#    Uses:    Serializer(...) inline; return validated_data → 200
#    Add:     @extend_schema(request=...) for Swagger (no serializer_class on class)
#    Logic:   lives in serializer.validate() — no save() in the view