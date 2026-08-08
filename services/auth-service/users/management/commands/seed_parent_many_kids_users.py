from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from users.models import CustomUser, GuardianInvitation, Kid
from users.serializers import CustomTokenObtainPairSerializer
from users.services import accept_guardian_invitation
from users.tokens import KidRefreshToken

DEV_PASSWORD = 'DevPass123!'

DEFAULT_PARENT = 'dev_parent_big'
DEFAULT_PREFIX = 'dev_kid'
DEFAULT_COUNT = 15
MAX_COUNT = 100


def _slug(value: str) -> str:
    cleaned = ''.join(
        ch if ch.isalnum() or ch in ('_', '-') else '_'
        for ch in value.strip().lower().replace(' ', '_')
    )
    cleaned = cleaned.strip('_')
    if not cleaned:
        raise CommandError('Name/username cannot be empty.')
    return cleaned


class Command(BaseCommand):
    help = (
        'Create one parent with many kids (parent is primary guardian of all) '
        'for testing dashboards and kid switchers at scale.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--count', type=int, default=DEFAULT_COUNT,
            help=f'How many kids to create (default: {DEFAULT_COUNT}, max: {MAX_COUNT})',
        )
        parser.add_argument(
            '--parent', type=str, default='',
            help=f'Parent username (default: {DEFAULT_PARENT})',
        )
        parser.add_argument(
            '--prefix', type=str, default='',
            help=f'Kid username prefix, numbered from 1 (default: {DEFAULT_PREFIX})',
        )
        parser.add_argument(
            '--tokens',
            action='store_true',
            help='Also print an access token for every kid (long output).',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Run even when DEBUG is False (local dev only).',
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options['force']:
            raise CommandError(
                'Refusing to seed when DEBUG is False. Use --force if you mean it.'
            )

        count = options['count']
        if count < 1 or count > MAX_COUNT:
            raise CommandError(f'--count must be between 1 and {MAX_COUNT}.')

        parent_username = _slug(options['parent'] or DEFAULT_PARENT)
        prefix = _slug(options['prefix'] or DEFAULT_PREFIX)
        parent_email = f'{parent_username.replace("_", "-")}@localhost'

        # Zero-padded so usernames sort naturally once past nine kids.
        width = len(str(count))
        kids = [
            {
                'username': f'{prefix}_{index:0{width}d}',
                'email': f'{prefix}_{index:0{width}d}@localhost',
                'name': f'{prefix.replace("_", " ").title()} {index}',
            }
            for index in range(1, count + 1)
        ]

        with transaction.atomic():
            parent = self._ensure_parent(parent_email, parent_username)
            seeded = [self._ensure_kid(data, parent, parent_email) for data in kids]

        parent_access = str(
            CustomTokenObtainPairSerializer.get_token(parent).access_token
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nParent with many kids ready (auth-service) — '
                f'1 parent, {count} kids:\n'
            )
        )
        self.stdout.write(f'  Password (all):   {DEV_PASSWORD}')
        self.stdout.write(f'  Parent  email:    {parent_email}')
        self.stdout.write(f'  Parent  username: {parent_username}')
        self.stdout.write(f'  Parent user ID:   {parent.id}\n')

        for data, kid in zip(kids, seeded):
            self.stdout.write(f'  {data["username"]:<24} {kid.id}')
            if options['tokens']:
                kid_access = str(KidRefreshToken.for_kid(kid).access_token)
                self.stdout.write(f'    KID_ACCESS={kid_access}')
        self.stdout.write('')

        self.stdout.write('Log in as the parent to see them all:\n')
        self.stdout.write(f'  export PARENT_ACCESS="{parent_access}"\n')

    def _ensure_parent(self, email: str, username: str) -> CustomUser:
        parent = CustomUser.objects.filter(email=email).first()
        if parent is None:
            return CustomUser.objects.create_user(
                email=email,
                username=username,
                password=DEV_PASSWORD,
                role='parent',
                email_verified=True,
            )

        parent.email_verified = True
        parent.role = 'parent'
        parent.username = username
        update_fields = ['email_verified', 'role', 'username']
        if not parent.check_password(DEV_PASSWORD):
            parent.set_password(DEV_PASSWORD)
            update_fields.append('password')
        parent.save(update_fields=update_fields)
        return parent

    def _ensure_kid(self, data: dict, parent: CustomUser, parent_email: str) -> Kid:
        kid = Kid.objects.filter(username=data['username']).first()
        if kid is None:
            kid = Kid(
                name=data['name'],
                username=data['username'],
                email=data['email'],
                email_verified=True,
                registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
            )
            kid.set_password(DEV_PASSWORD)
            kid.save()
        else:
            kid.email_verified = True
            kid.email = data['email']
            kid.name = data['name']
            update_fields = ['email_verified', 'email', 'name']
            if not kid.check_password(DEV_PASSWORD):
                kid.set_password(DEV_PASSWORD)
                update_fields.append('password_hash')
            kid.save(update_fields=update_fields)

        invitation = kid.guardian_invitations.filter(
            invite_email__iexact=parent_email,
            role='primary',
        ).first()
        if invitation is None:
            invitation = GuardianInvitation.objects.create(
                kid=kid,
                invite_email=parent_email,
                role='primary',
                status='pending',
                created_by_kid=True,
                expires_at=timezone.now() + timedelta(days=7),
            )
        if invitation.status != 'accepted':
            accept_guardian_invitation(invitation, parent)
        kid.refresh_from_db()
        return kid
