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
        'Create two parent+kid pairs with custom kid usernames for friend testing. '
        'Pass --kid1/--kid2 or leave blank to be prompted. Kids are NOT friends.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--kid1', type=str, default='', help='First kid username')
        parser.add_argument('--kid2', type=str, default='', help='Second kid username')
        parser.add_argument('--name1', type=str, default='', help='First kid display name')
        parser.add_argument('--name2', type=str, default='', help='Second kid display name')
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

        kid1 = _slug(options['kid1'] or self._ask('Kid 1 username'))
        kid2 = _slug(options['kid2'] or self._ask('Kid 2 username'))
        if kid1 == kid2:
            raise CommandError('Kid usernames must be different.')

        name1 = (options['name1'] or '').strip() or kid1.replace('_', ' ').title()
        name2 = (options['name2'] or '').strip() or kid2.replace('_', ' ').title()

        pairs = (
            {
                'parent_email': f'{kid1}-parent@localhost',
                'parent_username': f'{kid1}_parent',
                'kid_username': kid1,
                'kid_email': f'{kid1}@localhost',
                'kid_name': name1,
            },
            {
                'parent_email': f'{kid2}-parent@localhost',
                'parent_username': f'{kid2}_parent',
                'kid_username': kid2,
                'kid_email': f'{kid2}@localhost',
                'kid_name': name2,
            },
        )

        seeded = []
        with transaction.atomic():
            for pair in pairs:
                parent = self._ensure_parent(pair)
                kid = self._ensure_kid(pair, parent)
                seeded.append((pair, parent, kid))

        self.stdout.write(
            self.style.SUCCESS(
                '\nCustom friend users ready (auth-service) — kids are NOT friends:\n'
            )
        )
        self.stdout.write(f'  Password (all):   {DEV_PASSWORD}\n')

        tokens = []
        for index, (pair, parent, kid) in enumerate(seeded, start=1):
            parent_access = str(
                CustomTokenObtainPairSerializer.get_token(parent).access_token
            )
            kid_access = str(KidRefreshToken.for_kid(kid).access_token)
            tokens.append((parent_access, kid_access, kid.id))
            self.stdout.write(f'--- Pair {index} ---')
            self.stdout.write(f'  Parent  email:    {pair["parent_email"]}')
            self.stdout.write(f'  Parent  username: {pair["parent_username"]}')
            self.stdout.write(f'  Kid     username: {pair["kid_username"]}')
            self.stdout.write(f'  Kid     name:     {pair["kid_name"]}')
            self.stdout.write(f'  Kid     email:    {pair["kid_email"]}')
            self.stdout.write(f'  Kid ID:           {kid.id}')
            self.stdout.write(f'  PARENT{index}_ACCESS={parent_access}')
            self.stdout.write(f'  KID{index}_ACCESS={kid_access}')
            self.stdout.write(f'  KID{index}_ID={kid.id}\n')

        p1, k1, kid1_id = tokens[0]
        p2, k2, kid2_id = tokens[1]
        self.stdout.write('Or export in your shell:\n')
        self.stdout.write(f'  export PARENT1_ACCESS="{p1}"')
        self.stdout.write(f'  export KID1_ACCESS="{k1}"')
        self.stdout.write(f'  export KID1_ID="{kid1_id}"')
        self.stdout.write(f'  export PARENT2_ACCESS="{p2}"')
        self.stdout.write(f'  export KID2_ACCESS="{k2}"')
        self.stdout.write(f'  export KID2_ID="{kid2_id}"\n')

    def _ask(self, label: str) -> str:
        try:
            value = input(f'{label}: ').strip()
        except EOFError as exc:
            raise CommandError(
                f'Missing {label}. Pass --kid1/--kid2 or run with an interactive terminal.'
            ) from exc
        if not value:
            raise CommandError(f'{label} is required.')
        return value

    def _ensure_parent(self, pair: dict) -> CustomUser:
        parent = CustomUser.objects.filter(email=pair['parent_email']).first()
        if parent is None:
            return CustomUser.objects.create_user(
                email=pair['parent_email'],
                username=pair['parent_username'],
                password=DEV_PASSWORD,
                role='parent',
                email_verified=True,
            )

        parent.email_verified = True
        parent.role = 'parent'
        parent.username = pair['parent_username']
        update_fields = ['email_verified', 'role', 'username']
        if not parent.check_password(DEV_PASSWORD):
            parent.set_password(DEV_PASSWORD)
            update_fields.append('password')
        parent.save(update_fields=update_fields)
        return parent

    def _ensure_kid(self, pair: dict, parent: CustomUser) -> Kid:
        kid = Kid.objects.filter(username=pair['kid_username']).first()
        if kid is None:
            kid = Kid(
                name=pair['kid_name'],
                username=pair['kid_username'],
                email=pair['kid_email'],
                email_verified=True,
                registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
            )
            kid.set_password(DEV_PASSWORD)
            kid.save()
            invitation = GuardianInvitation.objects.create(
                kid=kid,
                invite_email=pair['parent_email'],
                role='primary',
                status='pending',
                created_by_kid=True,
                expires_at=timezone.now() + timedelta(days=7),
            )
            accept_guardian_invitation(invitation, parent)
            kid.refresh_from_db()
            return kid

        kid.email_verified = True
        kid.email = pair['kid_email']
        kid.name = pair['kid_name']
        kid.registration_status = Kid.RegistrationStatus.ACTIVE
        kid.parent = parent
        update_fields = [
            'email_verified', 'email', 'name', 'registration_status', 'parent',
        ]
        if not kid.check_password(DEV_PASSWORD):
            kid.set_password(DEV_PASSWORD)
            update_fields.append('password_hash')
        kid.save(update_fields=update_fields)

        invitation = kid.guardian_invitations.filter(
            invite_email__iexact=pair['parent_email'],
            role='primary',
        ).first()
        if invitation is None:
            invitation = GuardianInvitation.objects.create(
                kid=kid,
                invite_email=pair['parent_email'],
                role='primary',
                status='pending',
                created_by_kid=True,
                expires_at=timezone.now() + timedelta(days=7),
            )
        if invitation.status != 'accepted':
            accept_guardian_invitation(invitation, parent)
            kid.refresh_from_db()

        return kid
