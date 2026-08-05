"""Username rules, shared by kids and parents.

Both account types live in one namespace — signup checks a kid's name against
parent names and vice versa — so a single rule keeps them comparable.
"""

import re

from rest_framework import serializers

from .messages import USERNAME_INVALID, USERNAME_UNAVAILABLE

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 20

USERNAME_PATTERN = re.compile(
    r"^[a-zA-Z][a-zA-Z0-9_]{%d,%d}$"
    % (USERNAME_MIN_LENGTH - 1, USERNAME_MAX_LENGTH - 1)
)

# Names that would let an account pass for the app itself or for staff.
RESERVED_USERNAMES = frozenset(
    {
        "abuse",
        "admin",
        "administrator",
        "anonymous",
        "api",
        "auth",
        "billing",
        "everyone",
        "guardian",
        "guest",
        "help",
        "helpdesk",
        "kid",
        "kiddopath",
        "login",
        "logout",
        "moderator",
        "noreply",
        "official",
        "parent",
        "postmaster",
        "register",
        "root",
        "security",
        "settings",
        "signup",
        "staff",
        "superuser",
        "support",
        "sysadmin",
        "system",
        "webmaster",
    }
)

_DISALLOWED_CHARS = re.compile(r"[^A-Za-z0-9_]")
_LEADING_NON_LETTERS = re.compile(r"^[^A-Za-z]+")


def validate_username_format(value: str) -> str:
    """Return the cleaned username, or raise if it breaks the rules."""
    username = (value or "").strip()
    if not USERNAME_PATTERN.match(username):
        raise serializers.ValidationError(USERNAME_INVALID)
    if is_reserved_username(username):
        raise serializers.ValidationError(USERNAME_UNAVAILABLE)
    return username


def is_reserved_username(value: str) -> bool:
    return value.strip().lower() in RESERVED_USERNAMES


def sanitize_username_base(raw: str) -> str:
    """Force a machine-made name into the rules above.

    Google sign-in derives a parent's username from their email, and those
    routinely carry dots and plus signs that the rules reject.
    """
    cleaned = _DISALLOWED_CHARS.sub("", raw or "")
    cleaned = _LEADING_NON_LETTERS.sub("", cleaned)[:USERNAME_MAX_LENGTH]
    if len(cleaned) < USERNAME_MIN_LENGTH:
        return "player"
    return cleaned
