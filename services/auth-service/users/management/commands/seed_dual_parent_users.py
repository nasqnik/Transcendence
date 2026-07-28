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

PRIMARY = {
    'email': 'dev-parent-a@localhost',
    'username': 'dev_parent_a',
}
SECONDARY = {
    'email': 'dev-parent-b@localhost',
    'username': 'dev_parent_b',
}
KID = {
    'username': 'dev_kid_shared',
    'email': 'dev-kid-shared@localhost',
    'name': 'Dev Kid Shared',
}


class Command(BaseCommand):
    help = (
        'Create one kid with two accepted parents (primary + secondary) '
        'for testing parent account delete / dual-guardian flows.'
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
                'Refusing to seed when DEBUG is False. Use --force if you mean it.'
            )

        with transaction.atomic():
            primary = self._ensure_parent(PRIMARY)
            secondary = self._ensure_parent(SECONDARY)
            kid = self._ensure_kid_with_two_parents(primary, secondary)

        primary_access = str(
            CustomTokenObtainPairSerializer.get_token(primary).access_token
        )
        secondary_access = str(
            CustomTokenObtainPairSerializer.get_token(secondary).access_token
        )
        kid_access = str(KidRefreshToken.for_kid(kid).access_token)

        self.stdout.write(
            self.style.SUCCESS(
                '\nDual-parent seed ready (auth-service) — 1 kid, 2 parents:\n'
            )
        )
        self.stdout.write(f'  Password (all):        {DEV_PASSWORD}')
        self.stdout.write(f'  Kid username:          {KID["username"]}')
        self.stdout.write(f'  Kid email:             {KID["email"]}')
        self.stdout.write(f'  Kid ID:                {kid.id}')
        self.stdout.write(f'  Primary parent:        {PRIMARY["email"]} / {PRIMARY["username"]}')
        self.stdout.write(
            f'  Secondary parent:      {SECONDARY["email"]} / {SECONDARY["username"]}\n'
        )
        self.stdout.write(f'  PARENT_A_ACCESS={primary_access}')
        self.stdout.write(f'  PARENT_B_ACCESS={secondary_access}')
        self.stdout.write(f'  KID_ACCESS={kid_access}')
        self.stdout.write(f'  KID_ID={kid.id}\n')
        self.stdout.write('Or export in your shell:\n')
        self.stdout.write(f'  export PARENT_A_ACCESS="{primary_access}"')
        self.stdout.write(f'  export PARENT_B_ACCESS="{secondary_access}"')
        self.stdout.write(f'  export KID_ACCESS="{kid_access}"')
        self.stdout.write(f'  export KID_ID="{kid.id}"\n')
        self.stdout.write(
            'Tip: either parent can DELETE /auth/me/ because the kid has two guardians.\n'
        )

    def _ensure_parent(self, data: dict) -> CustomUser:
        parent = CustomUser.objects.filter(email=data['email']).first()
        if parent is None:
            return CustomUser.objects.create_user(
                email=data['email'],
                username=data['username'],
                password=DEV_PASSWORD,
                role='parent',
                email_verified=True,
            )

        parent.email_verified = True
        parent.role = 'parent'
        parent.username = data['username']
        update_fields = ['email_verified', 'role', 'username']
        if not parent.check_password(DEV_PASSWORD):
            parent.set_password(DEV_PASSWORD)
            update_fields.append('password')
        parent.save(update_fields=update_fields)
        return parent

    def _ensure_invitation(self, kid, parent, role: str) -> GuardianInvitation:
        invitation = kid.guardian_invitations.filter(
            invite_email__iexact=parent.email,
            role=role,
        ).first()
        if invitation is None:
            invitation = GuardianInvitation.objects.create(
                kid=kid,
                invite_email=parent.email,
                role=role,
                status='pending',
                created_by_kid=True,
                expires_at=timezone.now() + timedelta(days=7),
            )
        if invitation.status != 'accepted':
            accept_guardian_invitation(invitation, parent)
            invitation.refresh_from_db()
        return invitation

    def _ensure_kid_with_two_parents(
        self, primary: CustomUser, secondary: CustomUser
    ) -> Kid:
        kid = Kid.objects.filter(username=KID['username']).first()
        if kid is None:
            kid = Kid(
                name=KID['name'],
                username=KID['username'],
                email=KID['email'],
                email_verified=True,
                registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
            )
            kid.set_password(DEV_PASSWORD)
            kid.save()
        else:
            kid.email_verified = True
            kid.email = KID['email']
            kid.name = KID['name']
            update_fields = ['email_verified', 'email', 'name']
            if not kid.check_password(DEV_PASSWORD):
                kid.set_password(DEV_PASSWORD)
                update_fields.append('password_hash')
            kid.save(update_fields=update_fields)

        self._ensure_invitation(kid, primary, 'primary')
        kid.refresh_from_db()
        self._ensure_invitation(kid, secondary, 'secondary')
        kid.refresh_from_db()
        return kid
