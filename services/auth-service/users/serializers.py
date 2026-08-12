from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import AccessToken

from .google_auth import GoogleAuthError, verify_google_id_token
from .google_kids import (
    GoogleKidAccountConflictError,
    GoogleKidAlreadyExistsError,
    check_kid_google_signup_available,
    login_kid_from_google,
    signup_kid_from_google,
)
from .google_users import (
    GoogleAccountConflictError,
    GoogleUserNotFoundError,
    login_parent_from_google,
    signup_parent_from_google,
)
from .messages import (
    ACCOUNT_INACTIVE,
    CURRENT_PASSWORD_INCORRECT,
    CURRENT_PASSWORD_REQUIRED,
    EMAIL_ALREADY_REGISTERED,
    EMAIL_CHANGE_PENDING,
    EMAIL_LINKED_TO_DIFFERENT_GOOGLE_ACCOUNT,
    EMAIL_REGISTERED_AS_KID_ACCOUNT,
    EMAIL_REGISTERED_AS_KID_USE_KID_SIGNIN,
    EMAIL_SAME_AS_CURRENT,
    GOOGLE_ACCOUNT_REGISTERED_AS_KID,
    KID_ACCOUNT_NOT_ACTIVE,
    KID_ACCOUNT_NOT_ACTIVE_YET,
    KID_EMAIL_MUST_DIFFER_FROM_PARENT,
    KID_EMAIL_NOT_VERIFIED,
    KID_GOOGLE_ACCOUNT_NOT_FOUND,
    KID_INVALID_ACCESS_TOKEN,
    KID_INVALID_REFRESH_TOKEN,
    KID_NOT_ACCESS_TOKEN,
    KID_NOT_FOUND,
    KID_NOT_REFRESH_TOKEN,
    KID_VERIFY_EMAIL_FIRST,
    MAX_GUARDIANS_REACHED,
    PASSWORD_RESET_REQUESTED,
    PASSWORD_RESET_SUCCESS,
    PASSWORD_RESET_TOKEN_EXPIRED,
    PASSWORD_RESET_TOKEN_INVALID,
    USERNAME_ALREADY_TAKEN,
)
from .models import CustomUser, GuardianInvitation, Kid
from .services import (
    EmailAlreadyVerified,
    EmailChangeExpired,
    EmailChangeNotFound,
    EmailVerificationExpired,
    EmailVerificationNotFound,
    InvitationEmailMismatch,
    InvitationExpired,
    InvitationNotFound,
    InvitationNotPending,
    MaxGuardiansReached,
    accept_guardian_invitation,
    actor_has_password,
    build_guardian_invite_url,
    build_kid_verify_email_url,
    build_parent_verify_email_url,
    create_primary_guardian_invitation,
    create_secondary_guardian_invitation,
    email_belongs_to_kid,
    email_belongs_to_parent,
    email_is_taken,
    ensure_invitation_acceptable,
    guardians_of_kid,
    get_guardian_invitation_by_token,
    PasswordResetExpired,
    PasswordResetNotFound,
    confirm_kid_password_reset,
    confirm_parent_password_reset,
    issue_kid_email_change,
    issue_kid_email_verification,
    issue_parent_email_change,
    issue_parent_email_verification,
    normalize_email,
    request_kid_password_reset,
    request_parent_password_reset,
    username_belongs_to_kid,
    username_belongs_to_parent,
    username_is_taken,
    verify_email_change,
    verify_kid_email,
    verify_parent_email,
)
from .tokens import KidRefreshToken
from .validators import USERNAME_MAX_LENGTH, validate_username_format

LOGIN_IDENTIFIER_FIELD = "emailOrUsername"

_PARENT_CREDENTIALS_FAILED = "No active account found with the given credentials."
_KID_GOOGLE_FALLBACK_DETAILS = frozenset(
    {
        GOOGLE_ACCOUNT_REGISTERED_AS_KID,
        EMAIL_REGISTERED_AS_KID_USE_KID_SIGNIN,
    }
)


def _kid_password_tokens(identifier: str, password: str, *, not_found_detail: str) -> dict:
    """Issue kid JWT pair, or raise AuthenticationFailed with not_found_detail."""
    kid = Kid.objects.filter(username__iexact=identifier).first()
    if kid is None:
        kid = Kid.objects.filter(email__iexact=identifier).first()

    if kid is None or not kid.check_password(password):
        raise AuthenticationFailed(not_found_detail)

    if not kid.email_verified:
        raise AuthenticationFailed(KID_VERIFY_EMAIL_FIRST)

    if kid.registration_status != Kid.RegistrationStatus.ACTIVE:
        raise AuthenticationFailed(KID_ACCOUNT_NOT_ACTIVE_YET)

    refresh = KidRefreshToken.for_kid(kid)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def _kid_google_tokens(idinfo: dict) -> dict:
    kid = login_kid_from_google(idinfo)
    refresh = KidRefreshToken.for_kid(kid)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login: parent match first, then kid. JWT `role` distinguishes the session."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)
        self.fields[LOGIN_IDENTIFIER_FIELD] = serializers.CharField()

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["username"] = user.username
        token["role"] = user.role
        kid_id_list = list(
            GuardianInvitation.objects.filter(
                parent=user, status="accepted"
            ).values_list("kid_id", flat=True)
        )
        token["kid_ids"] = [str(k) for k in kid_id_list]
        # Display names for parent UI (avoids an extra kids lookup API call).
        kids = Kid.objects.filter(id__in=kid_id_list)
        token["kids"] = [
            {"id": str(k.id), "username": k.username, "name": k.name}
            for k in kids
        ]
        return token

    def validate(self, attrs):
        identifier = attrs[LOGIN_IDENTIFIER_FIELD]
        password = attrs["password"]

        user = CustomUser.objects.filter(email__iexact=identifier).first()
        if user is None:
            user = CustomUser.objects.filter(username__iexact=identifier).first()

        if user is None:
            return _kid_password_tokens(
                identifier, password, not_found_detail=_PARENT_CREDENTIALS_FAILED
            )

        if not user.check_password(password):
            raise AuthenticationFailed(_PARENT_CREDENTIALS_FAILED)

        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise AuthenticationFailed(_PARENT_CREDENTIALS_FAILED)

        if not user.email_verified:
            raise AuthenticationFailed(
                "Please verify your email before logging in."
            )

        self.user = user
        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """Refresh parent tokens and reload kid_ids/kids from the DB.

    SimpleJWT's default refresh copies claims from the old refresh token, so a
    parent who logged in before a kid linked them would keep kid_ids: [] forever
    until they logged in again. Re-mint with get_token so claims match the DB.
    """

    def validate(self, attrs):
        # Prove the presented refresh is still valid (signature / expiry).
        old_refresh = self.token_class(attrs["refresh"])

        user_id = old_refresh.payload.get(api_settings.USER_ID_CLAIM)
        if not user_id:
            raise AuthenticationFailed(
                "No active account found for the given token.",
                code="no_active_account",
            )

        try:
            user = CustomUser.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except CustomUser.DoesNotExist as exc:
            raise AuthenticationFailed(
                "No active account found for the given token.",
                code="no_active_account",
            ) from exc

        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise AuthenticationFailed(
                "No active account found for the given token.",
                code="no_active_account",
            )

        if api_settings.ROTATE_REFRESH_TOKENS and api_settings.BLACKLIST_AFTER_ROTATION:
            try:
                old_refresh.blacklist()
            except AttributeError:
                pass

        # Same claim builder as login — kid_ids/kids/email/username/role from DB.
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        data = {"access": str(refresh.access_token)}
        if api_settings.ROTATE_REFRESH_TOKENS:
            data["refresh"] = str(refresh)
        return data


class KidSignupSerializer(serializers.Serializer):
    # rules and validations
    name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=USERNAME_MAX_LENGTH)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    parent_email = serializers.EmailField()

    def validate_username(self, value):
        username = validate_username_format(value)
        if username_is_taken(username):
            raise serializers.ValidationError(USERNAME_ALREADY_TAKEN)
        return username

    def validate_email(self, value):
        email = value.lower()
        if email_belongs_to_kid(email) or email_belongs_to_parent(email):
            raise serializers.ValidationError(EMAIL_ALREADY_REGISTERED)
        return email

    def validate_parent_email(self, value):
        parent_email = value.lower()
        if email_belongs_to_kid(parent_email):
            raise serializers.ValidationError(EMAIL_REGISTERED_AS_KID_ACCOUNT)
        return parent_email

    def validate(self, attrs):
        email = attrs["email"]
        parent_email = attrs["parent_email"]
        if email == parent_email:
            raise serializers.ValidationError(KID_EMAIL_MUST_DIFFER_FROM_PARENT)
        return attrs

    def validate_password(self, value):
        validate_password(value)
        return value

    # write to the database
    @transaction.atomic
    def create(self, validated_data):
        parent_email = validated_data.pop("parent_email").lower()
        password = validated_data.pop("password")
        email = validated_data.pop("email")

        kid = Kid(
            name=validated_data["name"],
            username=validated_data["username"],
            email=email,
            email_verified=False,
            registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
        )
        kid.set_password(password)
        kid.save()

        create_primary_guardian_invitation(kid, parent_email)
        issue_kid_email_verification(kid)
        return kid

    # shape the json response
    def to_representation(self, instance):
        data = {
            "kid_id": str(instance.id),
            "username": instance.username,
            "email": instance.email,
            "name": instance.name,
            "registration_status": instance.registration_status,
            "email_verified": instance.email_verified,
            "message": "Check your email to verify your account. Waiting for parent response.",
        }
        if settings.DEBUG:
            invitation = instance.guardian_invitations.filter(
                status="pending",
                role="primary",
            ).first()
            if invitation:
                data["invite_url"] = build_guardian_invite_url(invitation.token)
                data["invite_token"] = str(invitation.token)
            if instance.email_verification_token:
                data["verify_token"] = str(instance.email_verification_token)
                data["verify_url"] = build_kid_verify_email_url(
                    instance.email_verification_token
                )
        return data


class ParentRegisterSerializer(serializers.ModelSerializer):
    # rules and validations
    password = serializers.CharField(write_only=True, min_length=8)
    # Declared so our rules replace the looser one AbstractUser brings along,
    # which allows "@ . + -" and any unicode letter.
    username = serializers.CharField(max_length=USERNAME_MAX_LENGTH)

    class Meta:
        model = CustomUser
        fields = ("email", "username", "password")

    def validate_email(self, value):
        email = value.lower()
        if email_belongs_to_kid(email):
            raise serializers.ValidationError(EMAIL_ALREADY_REGISTERED)
        return email

    def validate_username(self, value):
        username = validate_username_format(value)
        if username_is_taken(username):
            raise serializers.ValidationError(USERNAME_ALREADY_TAKEN)
        return username

    def validate_password(self, value):
        validate_password(value)
        return value

    # write to the database
    def create(self, validated_data):
        password = validated_data.pop("password")
        user = CustomUser.objects.create_user(
            password=password,
            role="parent",
            email_verified=False,
            **validated_data,
        )
        issue_parent_email_verification(user)
        return user

    # shape the json response
    def to_representation(self, instance):
        data = {
            "user_id": str(instance.id),
            "email": instance.email,
            "username": instance.username,
            "role": instance.role,
            "email_verified": instance.email_verified,
            "message": "Check your email to verify your account.",
        }
        if settings.DEBUG and instance.email_verification_token:
            data["verify_token"] = str(instance.email_verification_token)
            data["verify_url"] = build_parent_verify_email_url(
                instance.email_verification_token
            )
        return data


class GuardianInviteDetailSerializer(serializers.ModelSerializer):
    kid_name = serializers.CharField(source="kid.name", read_only=True)
    kid_id = serializers.UUIDField(source="kid.id", read_only=True)

    class Meta:
        model = GuardianInvitation
        fields = (
            "token",
            "status",
            "role",
            "invite_email",
            "expires_at",
            "kid_name",
            "kid_id",
        )
        read_only_fields = fields


class AcceptGuardianInviteSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate_token(self, value):
        try:
            invitation = get_guardian_invitation_by_token(value)
        except InvitationNotFound as exc:
            raise serializers.ValidationError("Invitation not found.") from exc
        try:
            self.invitation = ensure_invitation_acceptable(invitation)
        except InvitationNotPending as exc:
            raise serializers.ValidationError(
                f"Invitation is not pending (status: {exc.status})."
            ) from exc
        except InvitationExpired as exc:
            raise serializers.ValidationError("Invitation has expired.") from exc
        return value

    @transaction.atomic
    def save(self, **kwargs):
        parent = self.context["request"].user
        try:
            return accept_guardian_invitation(self.invitation, parent)
        except InvitationEmailMismatch as exc:
            raise serializers.ValidationError(
                "Your account email does not match the invitation email."
            ) from exc

    def to_representation(self, instance):
        kid = instance.kid
        return {
            "invitation_id": str(instance.id),
            "status": instance.status,
            "role": instance.role,
            "kid_id": str(kid.id),
            "kid_name": kid.name,
            "kid_username": kid.username,
            "registration_status": kid.registration_status,
            "message": "Guardian invitation accepted.",
        }


class KidTokenObtainSerializer(serializers.Serializer):
    emailOrUsername = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        return _kid_password_tokens(
            attrs[LOGIN_IDENTIFIER_FIELD],
            attrs["password"],
            not_found_detail="No active kid account found with the given credentials.",
        )


class KidTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        try:
            refresh = KidRefreshToken(attrs["refresh"])
        except Exception as exc:
            raise serializers.ValidationError(KID_INVALID_REFRESH_TOKEN) from exc

        if refresh.get("role") != "kid":
            raise serializers.ValidationError(KID_NOT_REFRESH_TOKEN)

        try:
            kid = Kid.objects.get(pk=refresh["kid_id"])
        except Kid.DoesNotExist as exc:
            raise serializers.ValidationError(KID_NOT_FOUND) from exc

        if not kid.email_verified:
            raise serializers.ValidationError(KID_EMAIL_NOT_VERIFIED)

        if kid.registration_status != Kid.RegistrationStatus.ACTIVE:
            raise serializers.ValidationError(KID_ACCOUNT_NOT_ACTIVE)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class KidTokenVerifySerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate(self, attrs):
        try:
            token = AccessToken(attrs["token"])
        except Exception as exc:
            raise serializers.ValidationError(KID_INVALID_ACCESS_TOKEN) from exc

        if token.get("role") != "kid":
            raise serializers.ValidationError(KID_NOT_ACCESS_TOKEN)

        try:
            kid = Kid.objects.get(pk=token["kid_id"])
        except Kid.DoesNotExist as exc:
            raise serializers.ValidationError(KID_NOT_FOUND) from exc

        if not kid.email_verified:
            raise serializers.ValidationError(KID_EMAIL_NOT_VERIFIED)

        if kid.registration_status != Kid.RegistrationStatus.ACTIVE:
            raise serializers.ValidationError(KID_ACCOUNT_NOT_ACTIVE)

        return {}


class InviteSecondParentSerializer(serializers.Serializer):
    parent_email = serializers.EmailField()
    invited_username_hint = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default="",
    )

    @transaction.atomic
    def create(self, validated_data):
        kid = self.context["request"].user
        try:
            return create_secondary_guardian_invitation(
                kid=kid,
                parent_email=validated_data["parent_email"],
                invited_username_hint=validated_data.get(
                    "invited_username_hint", ""
                ),
            )
        except MaxGuardiansReached as exc:
            raise serializers.ValidationError(MAX_GUARDIANS_REACHED) from exc

    def to_representation(self, instance):
        data = {
            "invitation_id": str(instance.id),
            "invite_email": instance.invite_email,
            "role": instance.role,
            "status": instance.status,
            "message": "Second parent invitation sent.",
        }
        if settings.DEBUG:
            data["invite_url"] = build_guardian_invite_url(instance.token)
            data["invite_token"] = str(instance.token)
        return data


def _parent_google_tokens(user):
    if not user.is_active:
        raise serializers.ValidationError(ACCOUNT_INACTIVE)
    refresh = CustomTokenObtainPairSerializer.get_token(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class GoogleLoginSerializer(serializers.Serializer):
    """Login only — never creates a parent. Tries parent, then kid."""

    id_token = serializers.CharField()

    def validate(self, attrs):
        try:
            idinfo = verify_google_id_token(attrs["id_token"])
        except GoogleAuthError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        try:
            user = login_parent_from_google(idinfo)
        except GoogleAccountConflictError as exc:
            detail = str(exc)
            if detail == EMAIL_LINKED_TO_DIFFERENT_GOOGLE_ACCOUNT:
                raise serializers.ValidationError(detail) from exc
            if detail not in _KID_GOOGLE_FALLBACK_DETAILS:
                raise serializers.ValidationError(detail) from exc
            try:
                return _kid_google_tokens(idinfo)
            except GoogleKidAccountConflictError as kid_exc:
                kid_detail = str(kid_exc)
                if kid_detail == KID_GOOGLE_ACCOUNT_NOT_FOUND:
                    raise serializers.ValidationError(detail) from kid_exc
                raise serializers.ValidationError(kid_detail) from kid_exc
        except GoogleUserNotFoundError as exc:
            try:
                return _kid_google_tokens(idinfo)
            except GoogleKidAccountConflictError as kid_exc:
                kid_detail = str(kid_exc)
                if kid_detail == KID_GOOGLE_ACCOUNT_NOT_FOUND:
                    raise serializers.ValidationError(str(exc)) from kid_exc
                raise serializers.ValidationError(kid_detail) from kid_exc

        return _parent_google_tokens(user)


class GoogleSignupSerializer(serializers.Serializer):
    """Sign up (or return tokens if the Google parent already exists)."""

    id_token = serializers.CharField()

    def validate(self, attrs):
        try:
            idinfo = verify_google_id_token(attrs["id_token"])
        except GoogleAuthError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        try:
            user = signup_parent_from_google(idinfo)
        except GoogleAccountConflictError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        return _parent_google_tokens(user)


class ParentVerifyEmailSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate(self, attrs):
        try:
            user = verify_parent_email(attrs["token"])
        except EmailVerificationNotFound as exc:
            raise serializers.ValidationError(
                {"token": ["Invalid verification token."]}
            ) from exc
        except EmailAlreadyVerified as exc:
            raise serializers.ValidationError(
                {"token": ["Email is already verified."]}
            ) from exc
        except EmailVerificationExpired as exc:
            raise serializers.ValidationError(
                {"token": ["Verification link has expired."]}
            ) from exc

        return {
            "email": user.email,
            "email_verified": user.email_verified,
            "message": "Email verified successfully.",
        }


class KidVerifyEmailSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate(self, attrs):
        try:
            kid = verify_kid_email(attrs["token"])
        except EmailVerificationNotFound as exc:
            raise serializers.ValidationError(
                {"token": ["Invalid verification token."]}
            ) from exc
        except EmailAlreadyVerified as exc:
            raise serializers.ValidationError(
                {"token": ["Email is already verified."]}
            ) from exc
        except EmailVerificationExpired as exc:
            raise serializers.ValidationError(
                {"token": ["Verification link has expired."]}
            ) from exc

        return {
            "kid_id": str(kid.id),
            "email": kid.email,
            "email_verified": kid.email_verified,
            "registration_status": kid.registration_status,
            "message": "Email verified successfully.",
        }


class KidGoogleSignupCheckSerializer(serializers.Serializer):
    """Verify a Google token can start kid signup (before profile form)."""

    id_token = serializers.CharField()

    def validate(self, attrs):
        try:
            idinfo = verify_google_id_token(attrs["id_token"])
        except GoogleAuthError as exc:
            raise serializers.ValidationError({"id_token": [str(exc)]}) from exc

        try:
            check_kid_google_signup_available(idinfo)
        except GoogleKidAlreadyExistsError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        except GoogleKidAccountConflictError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        return {"ok": True}


class KidGoogleSignupSerializer(serializers.Serializer):
    id_token = serializers.CharField()
    name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=USERNAME_MAX_LENGTH)
    parent_email = serializers.EmailField()

    def validate_username(self, value):
        username = validate_username_format(value)
        if username_is_taken(username):
            raise serializers.ValidationError(USERNAME_ALREADY_TAKEN)
        return username

    def validate_parent_email(self, value):
        parent_email = value.lower()
        if email_belongs_to_kid(parent_email):
            raise serializers.ValidationError(EMAIL_REGISTERED_AS_KID_ACCOUNT)
        return parent_email

    def validate(self, attrs):
        try:
            idinfo = verify_google_id_token(attrs["id_token"])
        except GoogleAuthError as exc:
            raise serializers.ValidationError({"id_token": [str(exc)]}) from exc

        kid_email = idinfo["email"].lower()
        parent_email = attrs["parent_email"]
        if kid_email == parent_email:
            raise serializers.ValidationError(KID_EMAIL_MUST_DIFFER_FROM_PARENT)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        try:
            idinfo = verify_google_id_token(validated_data["id_token"])
        except GoogleAuthError as exc:
            raise serializers.ValidationError({"id_token": [str(exc)]}) from exc

        try:
            return signup_kid_from_google(
                idinfo,
                name=validated_data["name"],
                username=validated_data["username"],
                parent_email=validated_data["parent_email"],
            )
        except GoogleKidAlreadyExistsError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        except GoogleKidAccountConflictError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def to_representation(self, instance):
        data = {
            "kid_id": str(instance.id),
            "username": instance.username,
            "email": instance.email,
            "name": instance.name,
            "email_verified": instance.email_verified,
            "registration_status": instance.registration_status,
            "message": "Account created. Waiting for parent response.",
        }
        if settings.DEBUG:
            invitation = instance.guardian_invitations.filter(
                status="pending",
                role="primary",
            ).first()
            if invitation:
                data["invite_url"] = build_guardian_invite_url(invitation.token)
                data["invite_token"] = str(invitation.token)
        return data


class KidGoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField()

    def validate(self, attrs):
        try:
            idinfo = verify_google_id_token(attrs["id_token"])
        except GoogleAuthError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        try:
            return _kid_google_tokens(idinfo)
        except GoogleKidAccountConflictError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class ParentProfileSerializer(serializers.ModelSerializer):
    has_password = serializers.SerializerMethodField()
    username = serializers.CharField(max_length=USERNAME_MAX_LENGTH)

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "email",
            "pending_email",
            "username",
            "bio",
            "role",
            "email_verified",
            "has_password",
            "created_at",
        )
        read_only_fields = (
            "id",
            "email",
            "pending_email",
            "role",
            "email_verified",
            "has_password",
            "created_at",
        )

    def get_has_password(self, obj):
        return actor_has_password(obj)

    def validate_username(self, value):
        username = validate_username_format(value)
        qs = CustomUser.objects.filter(username__iexact=username)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists() or username_belongs_to_kid(username):
            raise serializers.ValidationError(USERNAME_ALREADY_TAKEN)
        return username

    def validate_bio(self, value):
        return (value or "").strip()


class KidGuardianSerializer(serializers.Serializer):
    """A guardian as their kid sees them."""

    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    bio = serializers.CharField(read_only=True)
    role = serializers.ChoiceField(
        choices=("primary", "secondary"),
        read_only=True,
    )


class KidProfileSerializer(serializers.ModelSerializer):
    has_password = serializers.SerializerMethodField()
    parents = serializers.SerializerMethodField()
    username = serializers.CharField(max_length=USERNAME_MAX_LENGTH)

    class Meta:
        model = Kid
        fields = (
            "id",
            "name",
            "username",
            "bio",
            "email",
            "pending_email",
            "email_verified",
            "has_password",
            "avatar_url",
            "registration_status",
            "created_at",
            "parents",
        )
        read_only_fields = (
            "id",
            "email",
            "pending_email",
            "email_verified",
            "has_password",
            "avatar_url",
            "registration_status",
            "created_at",
            "parents",
        )

    def get_has_password(self, obj):
        return actor_has_password(obj)

    @extend_schema_field(KidGuardianSerializer(many=True))
    def get_parents(self, kid):
        """Empty while the kid is still awaiting their primary parent."""
        return KidGuardianSerializer(guardians_of_kid(kid), many=True).data

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Name cannot be empty.")
        return name

    def validate_username(self, value):
        username = validate_username_format(value)
        qs = Kid.objects.filter(username__iexact=username)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists() or username_belongs_to_parent(username):
            raise serializers.ValidationError(USERNAME_ALREADY_TAKEN)
        return username

    def validate_bio(self, value):
        return (value or "").strip()

class PasswordResetRequestSerializer(serializers.Serializer):
    """Public: request a parent password-reset email. Always returns the same message."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return normalize_email(value)

    def save(self, **kwargs):
        email = self.validated_data["email"]
        user = request_parent_password_reset(email)
        data = {"message": PASSWORD_RESET_REQUESTED}
        if settings.DEBUG and user is not None and user.password_reset_token:
            data["reset_token"] = str(user.password_reset_token)
            data["reset_url"] = (
                f"{settings.FRONTEND_URL.rstrip('/')}/reset-password"
                f"?token={user.password_reset_token}"
            )
        return data


class KidPasswordResetRequestSerializer(serializers.Serializer):
    """Public: request a kid password-reset email. Always returns the same message."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return normalize_email(value)

    def save(self, **kwargs):
        email = self.validated_data["email"]
        kid = request_kid_password_reset(email)
        data = {"message": PASSWORD_RESET_REQUESTED}
        if settings.DEBUG and kid is not None and kid.password_reset_token:
            data["reset_token"] = str(kid.password_reset_token)
            data["reset_url"] = (
                f"{settings.FRONTEND_URL.rstrip('/')}/kid/reset-password"
                f"?token={kid.password_reset_token}"
            )
        return data


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Public: set a new parent password with a reset token."""

    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        try:
            confirm_parent_password_reset(attrs["token"], attrs["new_password"])
        except PasswordResetNotFound as exc:
            raise serializers.ValidationError(
                {"token": [PASSWORD_RESET_TOKEN_INVALID]}
            ) from exc
        except PasswordResetExpired as exc:
            raise serializers.ValidationError(
                {"token": [PASSWORD_RESET_TOKEN_EXPIRED]}
            ) from exc
        return {"message": PASSWORD_RESET_SUCCESS}


class KidPasswordResetConfirmSerializer(serializers.Serializer):
    """Public: set a new kid password with a reset token."""

    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        try:
            confirm_kid_password_reset(attrs["token"], attrs["new_password"])
        except PasswordResetNotFound as exc:
            raise serializers.ValidationError(
                {"token": [PASSWORD_RESET_TOKEN_INVALID]}
            ) from exc
        except PasswordResetExpired as exc:
            raise serializers.ValidationError(
                {"token": [PASSWORD_RESET_TOKEN_EXPIRED]}
            ) from exc
        return {"message": PASSWORD_RESET_SUCCESS}


class MePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        default="",
    )
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        actor = self.context["request"].user
        if not isinstance(actor, (Kid, CustomUser)):
            raise serializers.ValidationError("Authentication required.")

        new_password = attrs["new_password"]
        current_password = attrs.get("current_password") or ""
        has_password = actor_has_password(actor)

        if has_password:
            if not current_password:
                raise serializers.ValidationError(
                    {"current_password": [CURRENT_PASSWORD_REQUIRED]}
                )
            if not actor.check_password(current_password):
                raise serializers.ValidationError(
                    {"current_password": [CURRENT_PASSWORD_INCORRECT]}
                )

        attrs["actor"] = actor
        attrs["new_password"] = new_password
        return attrs

    def save(self, **kwargs):
        actor = self.validated_data["actor"]
        actor.set_password(self.validated_data["new_password"])
        if isinstance(actor, Kid):
            actor.save(update_fields=["password_hash"])
        else:
            actor.save(update_fields=["password"])
        return actor


class MeEmailChangeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return normalize_email(value)

    def validate(self, attrs):
        actor = self.context["request"].user
        if not isinstance(actor, (Kid, CustomUser)):
            raise serializers.ValidationError("Authentication required.")

        new_email = attrs["email"]
        current = (actor.email or "").lower()
        if current and new_email == current:
            raise serializers.ValidationError({"email": [EMAIL_SAME_AS_CURRENT]})

        exclude_parent = actor if isinstance(actor, CustomUser) else None
        exclude_kid = actor if isinstance(actor, Kid) else None
        if email_is_taken(
            new_email,
            exclude_parent=exclude_parent,
            exclude_kid=exclude_kid,
        ):
            raise serializers.ValidationError({"email": [EMAIL_ALREADY_REGISTERED]})

        attrs["actor"] = actor
        return attrs

    def save(self, **kwargs):
        actor = self.validated_data["actor"]
        new_email = self.validated_data["email"]
        if isinstance(actor, Kid):
            issue_kid_email_change(actor, new_email)
        else:
            issue_parent_email_change(actor, new_email)
        actor.refresh_from_db()
        return {
            "pending_email": actor.pending_email,
            "message": EMAIL_CHANGE_PENDING,
        }


class VerifyEmailChangeSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate(self, attrs):
        try:
            actor, role = verify_email_change(attrs["token"])
        except EmailChangeNotFound as exc:
            raise serializers.ValidationError(
                {"token": ["Invalid verification token."]}
            ) from exc
        except EmailChangeExpired as exc:
            raise serializers.ValidationError(
                {"token": ["Verification link has expired."]}
            ) from exc

        return {
            "email": actor.email,
            "email_verified": actor.email_verified,
            "role": role,
            "message": "Email updated successfully.",
        }
