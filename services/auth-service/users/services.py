from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from .models import CustomUser, GuardianInvitation, Kid


class EmailVerificationNotFound(Exception):
    pass


class EmailVerificationExpired(Exception):
    pass


class EmailAlreadyVerified(Exception):
    pass


class InvitationNotFound(Exception):
    pass


class InvitationNotPending(Exception):
    def __init__(self, status):
        self.status = status


class InvitationExpired(Exception):
    pass


class InvitationEmailMismatch(Exception):
    pass


class MaxGuardiansReached(Exception):
    pass


def normalize_email(email: str) -> str:
    return email.lower()


def email_belongs_to_kid(email: str) -> bool:
    return Kid.objects.filter(email__iexact=normalize_email(email)).exists()


def email_belongs_to_parent(email: str) -> bool:
    return CustomUser.objects.filter(email__iexact=normalize_email(email)).exists()


def email_is_taken(email: str, *, exclude_parent=None, exclude_kid=None) -> bool:
    """True if email is used as current or pending on any parent/kid."""
    normalized = normalize_email(email)
    parent_qs = CustomUser.objects.filter(
        Q(email__iexact=normalized) | Q(pending_email__iexact=normalized)
    )
    if exclude_parent is not None:
        parent_qs = parent_qs.exclude(pk=exclude_parent.pk)
    kid_qs = Kid.objects.filter(
        Q(email__iexact=normalized) | Q(pending_email__iexact=normalized)
    )
    if exclude_kid is not None:
        kid_qs = kid_qs.exclude(pk=exclude_kid.pk)
    return parent_qs.exists() or kid_qs.exists()


def actor_has_password(actor) -> bool:
    if isinstance(actor, Kid):
        return bool(actor.password_hash)
    return actor.has_usable_password()


def username_belongs_to_kid(username: str) -> bool:
    return Kid.objects.filter(username__iexact=username).exists()


def username_belongs_to_parent(username: str) -> bool:
    return CustomUser.objects.filter(username__iexact=username).exists()


def username_is_taken(username: str) -> bool:
    return username_belongs_to_kid(username) or username_belongs_to_parent(username)


def count_active_guardians(kid: Kid) -> int:
    return kid.guardian_invitations.filter(
        status="accepted",
    ).count()


def kids_linked_to_parent(parent: CustomUser):
    """Kids linked via primary FK or an accepted guardian invitation."""
    kid_ids = set(
        Kid.objects.filter(parent=parent).values_list("id", flat=True)
    )
    kid_ids.update(
        GuardianInvitation.objects.filter(
            parent=parent,
            status="accepted",
        ).values_list("kid_id", flat=True)
    )
    return Kid.objects.filter(id__in=kid_ids)


def guardians_of_kid(kid: Kid) -> list[dict]:
    """The kid's accepted guardians, primary first.

    The reverse of kids_linked_to_parent, and linked the same two ways: the
    primary sits on the Kid.parent FK, a second guardian only on an accepted
    invitation. Seeded kids can have the FK without a matching invitation, so
    both sources are unioned rather than trusting either alone.
    """
    guardians = []
    seen = set()

    if kid.parent_id is not None:
        guardians.append({'parent': kid.parent, 'role': 'primary'})
        seen.add(kid.parent_id)

    invitations = (
        kid.guardian_invitations
        .filter(status='accepted', parent__isnull=False)
        .select_related('parent')
        .order_by('responded_at')
    )
    for invitation in invitations:
        if invitation.parent_id in seen:
            continue
        seen.add(invitation.parent_id)
        guardians.append({'parent': invitation.parent, 'role': invitation.role})

    return [
        {
            'id': entry['parent'].id,
            'username': entry['parent'].username,
            'email': entry['parent'].email,
            'bio': entry['parent'].bio,
            'role': entry['role'],
        }
        for entry in guardians
    ]


def parent_is_sole_guardian_of_any_kid(parent: CustomUser) -> bool:
    """
    True if this parent is linked to any kid that does not have
    another accepted guardian besides this parent.
    """
    for kid in kids_linked_to_parent(parent):
        other_guardians = (
            kid.guardian_invitations.filter(status="accepted")
            .exclude(parent=parent)
            .exclude(parent__isnull=True)
            .count()
        )
        if other_guardians < 1:
            return True
    return False


def detach_parent_from_kids(parent: CustomUser) -> None:
    """
    Remove this parent as guardian. Kids must already have another accepted
    guardian (caller must check). Reassign Kid.parent when needed.
    """
    for kid in list(kids_linked_to_parent(parent)):
        other_invite = (
            kid.guardian_invitations.filter(status="accepted")
            .exclude(parent=parent)
            .exclude(parent__isnull=True)
            .select_related("parent")
            .first()
        )
        if kid.parent_id == parent.id:
            kid.parent = other_invite.parent if other_invite else None
            kid.save(update_fields=["parent"])

    GuardianInvitation.objects.filter(
        parent=parent,
        status="accepted",
    ).update(status="revoked")


def delete_parent_account(parent: CustomUser) -> None:
    """
    Delete parent if not sole guardian of any kid.
    Raises ValueError("sole_guardian") if blocked.
    """
    if parent_is_sole_guardian_of_any_kid(parent):
        raise ValueError("sole_guardian")
    detach_parent_from_kids(parent)
    parent.delete()


def create_secondary_guardian_invitation(
    kid: Kid,
    parent_email: str,
    invited_username_hint: str = "",
) -> GuardianInvitation:
    if kid.registration_status != Kid.RegistrationStatus.ACTIVE:
        raise ValueError("Kid account must be active before inviting another parent.")

    if count_active_guardians(kid) >= settings.MAX_GUARDIANS_PER_KID:
        raise MaxGuardiansReached

    parent_email = parent_email.lower()
    expires_at = timezone.now() + timedelta(days=settings.GUARDIAN_INVITE_EXPIRY_DAYS)
    invitation = GuardianInvitation.objects.create(
        kid=kid,
        invite_email=parent_email,
        invited_username_hint=invited_username_hint,
        role="secondary",
        status="pending",
        created_by_kid=True,
        expires_at=expires_at,
    )
    send_guardian_invitation_email(invitation)
    return invitation


def build_guardian_invite_url(token) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/accept-invite?token={token}"


def get_guardian_invitation_by_token(token) -> GuardianInvitation:
    try:
        return GuardianInvitation.objects.select_related("kid").get(token=token)
    except GuardianInvitation.DoesNotExist as exc:
        raise InvitationNotFound from exc


def mark_expired_if_needed(invitation: GuardianInvitation) -> GuardianInvitation:
    if (
        invitation.status == "pending"
        and invitation.expires_at
        and invitation.expires_at < timezone.now()
    ):
        invitation.status = "expired"
        invitation.save(update_fields=["status"])
    return invitation


def ensure_invitation_acceptable(invitation: GuardianInvitation) -> GuardianInvitation:
    invitation = mark_expired_if_needed(invitation)
    if invitation.status != "pending":
        raise InvitationNotPending(invitation.status)
    return invitation


def accept_guardian_invitation(
    invitation: GuardianInvitation,
    parent,
) -> GuardianInvitation:
    if parent.email.lower() != invitation.invite_email.lower():
        raise InvitationEmailMismatch

    invitation.parent = parent
    invitation.status = "accepted"
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["parent", "status", "responded_at"])

    kid: Kid = invitation.kid
    if invitation.role == "primary":
        kid.parent = parent
        kid.registration_status = Kid.RegistrationStatus.ACTIVE
        kid.save(update_fields=["parent", "registration_status"])

    return invitation


def send_guardian_invitation_email(invitation) -> None:
    invite_url = build_guardian_invite_url(invitation.token)
    role_label = (
        "primary guardian"
        if invitation.role == "primary"
        else "secondary guardian"
    )
    context = {
        "app_name": settings.APP_NAME,
        "kid_name": invitation.kid.name,
        "kid_username": invitation.kid.username,
        "invite_url": invite_url,
        "invite_token": str(invitation.token),
        "invite_email": invitation.invite_email,
        "role_label": role_label,
        "expires_at": invitation.expires_at,
    }
    subject = f"{invitation.kid.name} invited you to be their {role_label}"
    text_body = render_to_string("emails/guardian_invite.txt", context)
    html_body = render_to_string("emails/guardian_invite.html", context)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invitation.invite_email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)

    invitation.sent_at = timezone.now()
    invitation.save(update_fields=["sent_at"])


def build_parent_verify_email_url(token) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/verify-email?token={token}"


def build_kid_verify_email_url(token) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/kid/verify-email?token={token}"


def build_email_change_verify_url(token) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/verify-email-change?token={token}"


def _verification_expired(sent_at) -> bool:
    if not sent_at:
        return True
    expiry = sent_at + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRY_HOURS)
    return timezone.now() > expiry


def issue_parent_email_verification(user: CustomUser) -> None:
    user.email_verification_token = uuid4()
    user.email_verification_sent_at = timezone.now()
    user.save(
        update_fields=["email_verification_token", "email_verification_sent_at"]
    )
    verify_url = build_parent_verify_email_url(user.email_verification_token)
    context = {
        "app_name": settings.APP_NAME,
        "verify_url": verify_url,
        "email": user.email,
        "expires_hours": settings.EMAIL_VERIFICATION_EXPIRY_HOURS,
    }
    subject = f"Verify your {settings.APP_NAME} account"
    text_body = render_to_string("emails/parent_verify_email.txt", context)
    html_body = render_to_string("emails/parent_verify_email.html", context)
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)


def issue_kid_email_verification(kid: Kid) -> None:
    kid.email_verification_token = uuid4()
    kid.email_verification_sent_at = timezone.now()
    kid.save(
        update_fields=["email_verification_token", "email_verification_sent_at"]
    )
    verify_url = build_kid_verify_email_url(kid.email_verification_token)
    context = {
        "app_name": settings.APP_NAME,
        "verify_url": verify_url,
        "email": kid.email,
        "kid_name": kid.name,
        "expires_hours": settings.EMAIL_VERIFICATION_EXPIRY_HOURS,
    }
    subject = f"Verify your {settings.APP_NAME} account"
    text_body = render_to_string("emails/kid_verify_email.txt", context)
    html_body = render_to_string("emails/kid_verify_email.html", context)
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[kid.email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)


def verify_parent_email(token) -> CustomUser:
    try:
        user = CustomUser.objects.get(email_verification_token=token)
    except CustomUser.DoesNotExist as exc:
        raise EmailVerificationNotFound from exc

    if user.email_verified:
        raise EmailAlreadyVerified

    if _verification_expired(user.email_verification_sent_at):
        raise EmailVerificationExpired

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    user.save(
        update_fields=[
            "email_verified",
            "email_verification_token",
            "email_verification_sent_at",
        ]
    )
    return user


def verify_kid_email(token) -> Kid:
    try:
        kid = Kid.objects.get(email_verification_token=token)
    except Kid.DoesNotExist as exc:
        raise EmailVerificationNotFound from exc

    if kid.email_verified:
        raise EmailAlreadyVerified

    if _verification_expired(kid.email_verification_sent_at):
        raise EmailVerificationExpired

    kid.email_verified = True
    kid.email_verification_token = None
    kid.email_verification_sent_at = None
    kid.save(
        update_fields=[
            "email_verified",
            "email_verification_token",
            "email_verification_sent_at",
        ]
    )
    return kid


def create_primary_guardian_invitation(kid: Kid, parent_email: str) -> GuardianInvitation:
    expires_at = timezone.now() + timedelta(days=settings.GUARDIAN_INVITE_EXPIRY_DAYS)
    invitation = GuardianInvitation.objects.create(
        kid=kid,
        invite_email=parent_email,
        role="primary",
        status="pending",
        created_by_kid=True,
        expires_at=expires_at,
    )
    send_guardian_invitation_email(invitation)
    return invitation


class EmailChangeNotFound(Exception):
    pass


class EmailChangeExpired(Exception):
    pass


def _send_email_change_mail(*, to_email: str, verify_url: str, display_name: str = "") -> None:
    context = {
        "app_name": settings.APP_NAME,
        "verify_url": verify_url,
        "email": to_email,
        "display_name": display_name,
        "expires_hours": settings.EMAIL_VERIFICATION_EXPIRY_HOURS,
    }
    subject = f"Confirm your new email — {settings.APP_NAME}"
    text_body = render_to_string("emails/email_change_verify.txt", context)
    html_body = render_to_string("emails/email_change_verify.html", context)
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)


def issue_parent_email_change(user: CustomUser, new_email: str) -> None:
    user.pending_email = normalize_email(new_email)
    user.email_verification_token = uuid4()
    user.email_verification_sent_at = timezone.now()
    user.save(
        update_fields=[
            "pending_email",
            "email_verification_token",
            "email_verification_sent_at",
        ]
    )
    verify_url = build_email_change_verify_url(user.email_verification_token)
    _send_email_change_mail(
        to_email=user.pending_email,
        verify_url=verify_url,
        display_name=user.username,
    )


def issue_kid_email_change(kid: Kid, new_email: str) -> None:
    kid.pending_email = normalize_email(new_email)
    kid.email_verification_token = uuid4()
    kid.email_verification_sent_at = timezone.now()
    kid.save(
        update_fields=[
            "pending_email",
            "email_verification_token",
            "email_verification_sent_at",
        ]
    )
    verify_url = build_email_change_verify_url(kid.email_verification_token)
    _send_email_change_mail(
        to_email=kid.pending_email,
        verify_url=verify_url,
        display_name=kid.name,
    )


def verify_email_change(token):
    """Apply pending_email for parent or kid. Returns (actor, role)."""
    user = (
        CustomUser.objects.filter(email_verification_token=token)
        .exclude(pending_email__isnull=True)
        .exclude(pending_email="")
        .first()
    )
    if user is not None:
        if _verification_expired(user.email_verification_sent_at):
            raise EmailChangeExpired
        user.email = user.pending_email
        user.pending_email = None
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        user.save(
            update_fields=[
                "email",
                "pending_email",
                "email_verified",
                "email_verification_token",
                "email_verification_sent_at",
            ]
        )
        return user, "parent"

    kid = (
        Kid.objects.filter(email_verification_token=token)
        .exclude(pending_email__isnull=True)
        .exclude(pending_email="")
        .first()
    )
    if kid is None:
        raise EmailChangeNotFound
    if _verification_expired(kid.email_verification_sent_at):
        raise EmailChangeExpired
    kid.email = kid.pending_email
    kid.pending_email = None
    kid.email_verified = True
    kid.email_verification_token = None
    kid.email_verification_sent_at = None
    kid.save(
        update_fields=[
            "email",
            "pending_email",
            "email_verified",
            "email_verification_token",
            "email_verification_sent_at",
        ]
    )
    return kid, "kid"


class PasswordResetNotFound(Exception):
    pass


class PasswordResetExpired(Exception):
    pass


def build_parent_password_reset_url(token) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?token={token}"


def build_kid_password_reset_url(token) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/kid/reset-password?token={token}"


def _password_reset_expired(sent_at) -> bool:
    if not sent_at:
        return True
    expiry = sent_at + timedelta(hours=settings.PASSWORD_RESET_EXPIRY_HOURS)
    return timezone.now() > expiry


def _send_password_reset_email(*, to_email, reset_url, display_name="") -> None:
    context = {
        "app_name": settings.APP_NAME,
        "reset_url": reset_url,
        "email": to_email,
        "display_name": display_name,
        "expires_hours": settings.PASSWORD_RESET_EXPIRY_HOURS,
    }
    subject = f"Reset your {settings.APP_NAME} password"
    text_body = render_to_string("emails/password_reset.txt", context)
    html_body = render_to_string("emails/password_reset.html", context)
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)


def request_parent_password_reset(email: str) -> CustomUser | None:
    """Issue a reset token if a parent exists. Returns the user, or None.

    Callers must not reveal whether the email matched an account.
    """
    user = CustomUser.objects.filter(email__iexact=normalize_email(email)).first()
    if user is None or not user.is_active:
        return None

    user.password_reset_token = uuid4()
    user.password_reset_sent_at = timezone.now()
    user.save(update_fields=["password_reset_token", "password_reset_sent_at"])
    _send_password_reset_email(
        to_email=user.email,
        reset_url=build_parent_password_reset_url(user.password_reset_token),
        display_name=user.username,
    )
    return user


def request_kid_password_reset(email: str) -> Kid | None:
    """Issue a reset token if a kid with that email exists. Returns the kid, or None."""
    kid = Kid.objects.filter(email__iexact=normalize_email(email)).first()
    if kid is None or not kid.email:
        return None

    kid.password_reset_token = uuid4()
    kid.password_reset_sent_at = timezone.now()
    kid.save(update_fields=["password_reset_token", "password_reset_sent_at"])
    _send_password_reset_email(
        to_email=kid.email,
        reset_url=build_kid_password_reset_url(kid.password_reset_token),
        display_name=kid.name or kid.username,
    )
    return kid


def confirm_parent_password_reset(token, new_password: str) -> CustomUser:
    try:
        user = CustomUser.objects.get(password_reset_token=token)
    except CustomUser.DoesNotExist as exc:
        raise PasswordResetNotFound from exc

    if _password_reset_expired(user.password_reset_sent_at):
        raise PasswordResetExpired

    user.set_password(new_password)
    user.password_reset_token = None
    user.password_reset_sent_at = None
    user.save(update_fields=["password", "password_reset_token", "password_reset_sent_at"])
    return user


def confirm_kid_password_reset(token, new_password: str) -> Kid:
    try:
        kid = Kid.objects.get(password_reset_token=token)
    except Kid.DoesNotExist as exc:
        raise PasswordResetNotFound from exc

    if _password_reset_expired(kid.password_reset_sent_at):
        raise PasswordResetExpired

    kid.set_password(new_password)
    kid.password_reset_token = None
    kid.password_reset_sent_at = None
    kid.save(
        update_fields=["password_hash", "password_reset_token", "password_reset_sent_at"]
    )
    return kid
