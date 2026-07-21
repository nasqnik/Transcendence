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

PAIRS = (
    {
        'parent_email': 'dev-parent@localhost',
        'parent_username': 'dev_parent',
        'kid_username': 'dev_kid',
        'kid_email': 'dev-kid@localhost',
        'kid_name': 'Dev Kid',
    },
    {
        'parent_email': 'dev-parent2@localhost',
        'parent_username': 'dev_parent2',
        'kid_username': 'dev_kid2',
        'kid_email': 'dev-kid2@localhost',
        'kid_name': 'Dev Kid 2',
    },
)


class Command(BaseCommand):
    help = (
        'Create two separate parent+kid pairs (4 users) for friend-feature testing. '
        'Does not create any friendship between the kids.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Run even when DEBUG is False (local dev only).',
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options['force']:
            raise CommandError(
                'Refusing to seed dev users when DEBUG is False. '
                'Use --force if you really mean it.'
            )

        seeded = []
        with transaction.atomic():
            for pair in PAIRS:
                parent = self._ensure_parent(pair)
                kid = self._ensure_kid(pair, parent)
                seeded.append((pair, parent, kid))

        self.stdout.write(
            self.style.SUCCESS(
                '\nDev friend users ready (auth-service) — kids are NOT friends:\n'
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
            self.stdout.write(f'  Kid     email:    {pair["kid_email"]}')
            self.stdout.write(f'  Kid ID:           {kid.id}')
            self.stdout.write(f'  Parent user ID:   {parent.id}')
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
        update_fields = ['email_verified', 'role']
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
        kid.registration_status = Kid.RegistrationStatus.ACTIVE
        kid.parent = parent
        update_fields = ['email_verified', 'email', 'registration_status', 'parent']
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
