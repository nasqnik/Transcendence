from django.db import transaction
from django.utils.crypto import get_random_string

from .messages import (
    EMAIL_LINKED_TO_DIFFERENT_GOOGLE_ACCOUNT,
    EMAIL_REGISTERED_AS_KID_USE_KID_SIGNIN,
    GOOGLE_ACCOUNT_REGISTERED_AS_KID,
    GOOGLE_USER_DOES_NOT_EXIST,
)
from .models import CustomUser, Kid
from .services import email_belongs_to_kid, username_is_taken
from .validators import (
    USERNAME_MAX_LENGTH,
    is_reserved_username,
    sanitize_username_base,
)

# it exists because we want to raise an error if the Google account is already linked to a different account
# and to be able to handle the error in the view
class GoogleAccountConflictError(Exception):
    pass


class GoogleUserNotFoundError(Exception):
    """Raised when Google login finds no parent — they must use sign-up."""

    pass


def _unavailable(username: str) -> bool:
    return username_is_taken(username) or is_reserved_username(username)


# _unique_username is a helper function that generates a unique username by:
# 1. Forcing the base to obey the username rules (Google gives us an email
#    local part, which may hold dots, plus signs, or leading digits)
# 2. Checking if the username is taken or reserved
# 3. If it is, adding a numbered suffix that keeps the name within the limit
# 4. Returning the unique username
def _unique_username(base: str) -> str:
    username = sanitize_username_base(base)
    if not _unavailable(username):
        return username

    suffix = 1
    while True:
        tail = f"_{suffix}"
        candidate = f"{username[:USERNAME_MAX_LENGTH - len(tail)]}{tail}"
        if not _unavailable(candidate):
            return candidate
        suffix += 1


def _reject_if_kid_account(google_sub: str, email: str) -> None:
    if Kid.objects.filter(google_sub=google_sub).exists():
        raise GoogleAccountConflictError(GOOGLE_ACCOUNT_REGISTERED_AS_KID)

    if email_belongs_to_kid(email):
        raise GoogleAccountConflictError(EMAIL_REGISTERED_AS_KID_USE_KID_SIGNIN)


def _find_or_link_existing_parent(google_sub: str, email: str) -> CustomUser | None:
    """Return an existing parent, linking Google when found by email only."""
    user = CustomUser.objects.filter(google_sub=google_sub).first()
    if user:
        return user

    user = CustomUser.objects.filter(email=email).first()
    if user is None:
        return None

    if user.google_sub and user.google_sub != google_sub:
        raise GoogleAccountConflictError(EMAIL_LINKED_TO_DIFFERENT_GOOGLE_ACCOUNT)
    user.google_sub = google_sub
    user.email_verified = True
    user.save(update_fields=["google_sub", "email_verified"])
    return user


def login_parent_from_google(idinfo: dict) -> CustomUser:
    """Log in an existing parent. Never creates an account."""
    google_sub = idinfo["sub"]
    email = idinfo["email"].lower()
    _reject_if_kid_account(google_sub, email)

    user = _find_or_link_existing_parent(google_sub, email)
    if user is None:
        raise GoogleUserNotFoundError(GOOGLE_USER_DOES_NOT_EXIST)
    return user


@transaction.atomic
def signup_parent_from_google(idinfo: dict) -> CustomUser:
    """Sign up a parent via Google, or return them if they already exist."""
    google_sub = idinfo["sub"]
    email = idinfo["email"].lower()
    _reject_if_kid_account(google_sub, email)

    user = _find_or_link_existing_parent(google_sub, email)
    if user is not None:
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


# Kept for older call sites / tests that still import the old name.
def get_or_create_parent_from_google(idinfo: dict) -> CustomUser:
    return signup_parent_from_google(idinfo)
