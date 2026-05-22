from django.db import transaction
from django.utils.crypto import get_random_string

from .models import CustomUser, Kid
from .services import email_belongs_to_kid, username_is_taken


class GoogleAccountConflictError(Exception):
    pass


def _unique_username(base: str) -> str:
    username = base[:150]
    if not username_is_taken(username):
        return username

    suffix = 1
    while True:
        candidate = f"{base[:140]}_{suffix}"
        if not username_is_taken(candidate):
            return candidate
        suffix += 1


@transaction.atomic
def get_or_create_parent_from_google(idinfo: dict) -> CustomUser:
    google_sub = idinfo["sub"]
    email = idinfo["email"].lower()

    if Kid.objects.filter(google_sub=google_sub).exists():
        raise GoogleAccountConflictError(
            "This Google account is registered as a kid account. Use kid sign-in instead."
        )

    if email_belongs_to_kid(email):
        raise GoogleAccountConflictError(
            "This email is registered as a kid account. Use kid sign-in instead."
        )

    user = CustomUser.objects.filter(google_sub=google_sub).first()
    if user:
        return user

    user = CustomUser.objects.filter(email=email).first()
    if user:
        if user.google_sub and user.google_sub != google_sub:
            raise GoogleAccountConflictError(
                "This email is linked to a different Google account."
            )
        user.google_sub = google_sub
        user.email_verified = True
        user.save(update_fields=["google_sub", "email_verified"])
        return user

    username_base = email.split("@")[0] or f"google_{google_sub[:8]}"
    return CustomUser.objects.create_user(
        email=email,
        username=_unique_username(username_base),
        password=get_random_string(32),
        role="parent",
        google_sub=google_sub,
        email_verified=True,
    )
