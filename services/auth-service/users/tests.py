from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomUser, GuardianInvitation, Kid


def _verify_parent(client, email):
    user = CustomUser.objects.get(email=email)
    response = client.post(
        "/api/auth/verify-email/",
        {"token": str(user.email_verification_token)},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    return user


def _verify_kid(client, username):
    kid = Kid.objects.get(username=username)
    response = client.post(
        "/api/auth/kid/verify-email/",
        {"token": str(kid.email_verification_token)},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    kid.refresh_from_db()
    return kid


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class KidSignupTests(APITestCase):
    def test_kid_signup_creates_kid_and_pending_invitation(self):
        response = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_kid",
                "email": "alex@example.com",
                "password": "secure-pass-1",
                "parent_email": "Parent@Example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["registration_status"], "awaiting_primary_parent")
        self.assertFalse(response.data["email_verified"])

        kid = Kid.objects.get(username="alex_kid")
        self.assertEqual(kid.email, "alex@example.com")
        self.assertFalse(kid.email_verified)
        self.assertTrue(kid.check_password("secure-pass-1"))
        self.assertIsNone(kid.parent)

        invitation = GuardianInvitation.objects.get(kid=kid)
        self.assertEqual(invitation.invite_email, "parent@example.com")
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn(str(invitation.token), mail.outbox[0].body)

    def test_kid_signup_rejects_parent_email(self):
        CustomUser.objects.create_user(
            email="parent@example.com",
            username="parent_one",
            password="secure-pass-1",
            role="parent",
        )

        response = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_kid",
                "email": "parent@example.com",
                "password": "secure-pass-1",
                "parent_email": "other@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Kid.objects.filter(username="alex_kid").exists())

    def test_kid_signup_rejects_parent_username(self):
        CustomUser.objects.create_user(
            email="parent@example.com",
            username="shared_user",
            password="secure-pass-1",
            role="parent",
        )

        response = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "shared_user",
                "email": "alex@example.com",
                "password": "secure-pass-1",
                "parent_email": "other@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Kid.objects.filter(email="alex@example.com").exists())

    def test_kid_signup_rejects_same_email_as_parent_email(self):
        response = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_same_email",
                "email": "shared@example.com",
                "password": "secure-pass-1",
                "parent_email": "shared@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Kid.objects.filter(username="alex_same_email").exists())

    def test_kid_signup_rejects_parent_email_that_is_kid_account(self):
        Kid.objects.create(
            name="Other Kid",
            username="other_kid",
            email="kid.parent@example.com",
            email_verified=True,
            registration_status=Kid.RegistrationStatus.ACTIVE,
        )

        response = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_kid3",
                "email": "alex3@example.com",
                "password": "secure-pass-1",
                "parent_email": "kid.parent@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Kid.objects.filter(username="alex_kid3").exists())

    def test_kids_can_share_display_name(self):
        self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_one",
                "email": "alex1@example.com",
                "password": "secure-pass-1",
                "parent_email": "parent1@example.com",
            },
            format="json",
        )
        response = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_two",
                "email": "alex2@example.com",
                "password": "secure-pass-1",
                "parent_email": "parent2@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Kid.objects.filter(name="Alex").count(), 2)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class ParentRegisterTests(APITestCase):
    def test_parent_register_sends_verification_and_blocks_login(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "parent@example.com",
                "username": "parent_one",
                "password": "secure-pass-1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("Check your email", response.data["message"])
        self.assertEqual(len(mail.outbox), 1)

        user = CustomUser.objects.get(email="parent@example.com")
        self.assertFalse(user.email_verified)

        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "parent@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            login.data["detail"],
            "Please verify your email before logging in.",
        )

        login_with_username = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "parent_one", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(login_with_username.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            login_with_username.data["detail"],
            "Please verify your email before logging in.",
        )

        _verify_parent(self.client, "parent@example.com")
        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "parent@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_parent_register_rejects_kid_email(self):
        Kid.objects.create(
            name="Alex",
            username="alex_kid",
            email="kid@example.com",
            email_verified=True,
            registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
        )

        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "kid@example.com",
                "username": "parent_one",
                "password": "secure-pass-1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CustomUser.objects.filter(email="kid@example.com").count(), 0)

    def test_parent_register_rejects_kid_username(self):
        Kid.objects.create(
            name="Alex",
            username="kid_user",
            email="kid@example.com",
            email_verified=True,
            registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
        )

        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "parent@example.com",
                "username": "kid_user",
                "password": "secure-pass-1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CustomUser.objects.filter(email="parent@example.com").exists())


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class AcceptGuardianInviteTests(APITestCase):
    def setUp(self):
        signup = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_accept",
                "email": "alex@example.com",
                "password": "secure-pass-1",
                "parent_email": "parent@example.com",
            },
            format="json",
        )
        _verify_kid(self.client, "alex_accept")
        self.invite_token = GuardianInvitation.objects.get(
            kid_id=signup.data["kid_id"]
        ).token

    def test_invite_detail_is_public(self):
        response = self.client.get(f"/api/guardian-invitations/{self.invite_token}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(response.data["kid_name"], "Alex")

    def test_accept_invite_activates_kid(self):
        self.client.post(
            "/api/auth/register/",
            {
                "email": "parent@example.com",
                "username": "parent_one",
                "password": "secure-pass-1",
            },
            format="json",
        )
        _verify_parent(self.client, "parent@example.com")
        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "parent@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login.data['access']}"
        )

        response = self.client.post(
            "/api/guardian-invitations/accept/",
            {"token": str(self.invite_token)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["registration_status"], "active")

    def test_accept_rejects_wrong_parent_email(self):
        self.client.post(
            "/api/auth/register/",
            {
                "email": "other@example.com",
                "username": "other_parent",
                "password": "secure-pass-1",
            },
            format="json",
        )
        _verify_parent(self.client, "other@example.com")
        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "other@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login.data['access']}"
        )

        response = self.client.post(
            "/api/guardian-invitations/accept/",
            {"token": str(self.invite_token)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
    MAX_GUARDIANS_PER_KID=2,
)
class KidAuthAndSecondParentInviteTests(APITestCase):
    def _signup_and_accept_primary(self):
        signup = self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": "alex_kid2",
                "email": "alex2@example.com",
                "password": "secure-pass-1",
                "parent_email": "parent@example.com",
            },
            format="json",
        )
        _verify_kid(self.client, "alex_kid2")
        token = GuardianInvitation.objects.get(kid_id=signup.data["kid_id"]).token
        self.client.post(
            "/api/auth/register/",
            {
                "email": "parent@example.com",
                "username": "parent_one",
                "password": "secure-pass-1",
            },
            format="json",
        )
        _verify_parent(self.client, "parent@example.com")
        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "parent@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login.data['access']}"
        )
        self.client.post(
            "/api/guardian-invitations/accept/",
            {"token": str(token)},
            format="json",
        )
        self.client.credentials()
        return signup.data["kid_id"]

    def test_kid_login_after_primary_accepted(self):
        self._signup_and_accept_primary()
        response = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "alex_kid2", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response_with_email = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "alex2@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(response_with_email.status_code, status.HTTP_200_OK)

    def test_kid_token_verify(self):
        self._signup_and_accept_primary()
        login = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "alex_kid2", "password": "secure-pass-1"},
            format="json",
        )
        verify = self.client.post(
            "/api/auth/kid/token/verify/",
            {"token": login.data["access"]},
            format="json",
        )
        self.assertEqual(verify.status_code, status.HTTP_200_OK)

    def test_kid_cannot_login_before_email_verified(self):
        self.client.post(
            "/api/kids/signup/",
            {
                "name": "Sam",
                "username": "sam_kid",
                "email": "sam@example.com",
                "password": "secure-pass-1",
                "parent_email": "parent@example.com",
            },
            format="json",
        )
        Kid.objects.filter(username="sam_kid").update(
            registration_status=Kid.RegistrationStatus.ACTIVE
        )
        response = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "sam_kid", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response_with_email = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "sam@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(response_with_email.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response_with_email.data["detail"],
            "Verify your email first.",
        )

    def test_kid_cannot_login_before_active(self):
        self.client.post(
            "/api/kids/signup/",
            {
                "name": "Sam",
                "username": "sam_kid2",
                "email": "sam2@example.com",
                "password": "secure-pass-1",
                "parent_email": "parent@example.com",
            },
            format="json",
        )
        _verify_kid(self.client, "sam_kid2")
        response = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "sam_kid2", "password": "secure-pass-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_active_kid_invites_second_parent(self):
        self._signup_and_accept_primary()
        kid_login = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "alex_kid2", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {kid_login.data['access']}"
        )
        response = self.client.post(
            "/api/kids/invite-parent/",
            {
                "parent_email": "second@example.com",
                "invited_username_hint": "second_parent",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class GoogleLoginTests(APITestCase):
    @patch("users.serializers.verify_google_id_token")
    def test_google_login_creates_parent_and_returns_jwt(self, mock_verify):
        mock_verify.return_value = {
            "sub": "google-sub-123",
            "email": "google.parent@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/auth/google/",
            {"id_token": "fake-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = CustomUser.objects.get(email="google.parent@example.com")
        self.assertTrue(user.email_verified)

    @patch("users.serializers.verify_google_id_token")
    def test_google_login_links_existing_email_user(self, mock_verify):
        CustomUser.objects.create_user(
            email="existing@example.com",
            username="existing",
            password="secure-pass-1",
            role="parent",
        )
        mock_verify.return_value = {
            "sub": "google-sub-456",
            "email": "existing@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/auth/google/",
            {"id_token": "fake-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = CustomUser.objects.get(email="existing@example.com")
        self.assertTrue(user.email_verified)

    @patch("users.serializers.verify_google_id_token")
    def test_google_login_rejects_kid_google_sub(self, mock_verify):
        Kid.objects.create(
            name="Google Kid",
            username="google_kid",
            email="kid.google@example.com",
            google_sub="kid-google-sub-shared",
            email_verified=True,
            registration_status=Kid.RegistrationStatus.ACTIVE,
        )
        mock_verify.return_value = {
            "sub": "kid-google-sub-shared",
            "email": "kid.google@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/auth/google/",
            {"id_token": "fake-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CustomUser.objects.filter(email="kid.google@example.com").exists())

    @patch("users.serializers.verify_google_id_token")
    def test_google_login_rejects_kid_email_without_google_sub(self, mock_verify):
        Kid.objects.create(
            name="Email Kid",
            username="email_kid",
            email="kid.only@example.com",
            email_verified=True,
            registration_status=Kid.RegistrationStatus.ACTIVE,
        )
        mock_verify.return_value = {
            "sub": "new-google-sub",
            "email": "kid.only@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/auth/google/",
            {"id_token": "fake-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CustomUser.objects.filter(email="kid.only@example.com").exists())


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class KidGoogleAuthTests(APITestCase):
    @patch("users.serializers.verify_google_id_token")
    def test_kid_google_signup_creates_account_and_invites_parent(self, mock_verify):
        mock_verify.return_value = {
            "sub": "kid-google-sub-1",
            "email": "kid.google@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/kids/signup/google/",
            {
                "id_token": "fake-token",
                "name": "Google Kid",
                "username": "google_kid",
                "parent_email": "parent@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        kid = Kid.objects.get(username="google_kid")
        self.assertTrue(kid.email_verified)
        self.assertEqual(kid.google_sub, "kid-google-sub-1")
        self.assertEqual(len(mail.outbox), 1)

    @patch("users.serializers.verify_google_id_token")
    def test_kid_google_signup_rejects_parent_email(self, mock_verify):
        CustomUser.objects.create_user(
            email="parent@example.com",
            username="parent_one",
            password="secure-pass-1",
            role="parent",
        )
        mock_verify.return_value = {
            "sub": "kid-google-sub-parent-conflict",
            "email": "parent@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/kids/signup/google/",
            {
                "id_token": "fake-token",
                "name": "Google Kid",
                "username": "google_kid_conflict",
                "parent_email": "other@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Kid.objects.filter(username="google_kid_conflict").exists())

    @patch("users.serializers.verify_google_id_token")
    def test_kid_google_signup_rejects_parent_username(self, mock_verify):
        CustomUser.objects.create_user(
            email="parent@example.com",
            username="shared_google_user",
            password="secure-pass-1",
            role="parent",
        )
        mock_verify.return_value = {
            "sub": "kid-google-sub-username-conflict",
            "email": "kid.google@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/kids/signup/google/",
            {
                "id_token": "fake-token",
                "name": "Google Kid",
                "username": "shared_google_user",
                "parent_email": "other@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Kid.objects.filter(username="shared_google_user").exists())

    @patch("users.serializers.verify_google_id_token")
    def test_google_parent_signup_avoids_kid_username_collision(self, mock_verify):
        Kid.objects.create(
            name="Alex",
            username="john",
            email="kid@example.com",
            email_verified=True,
            registration_status=Kid.RegistrationStatus.ACTIVE,
        )
        mock_verify.return_value = {
            "sub": "parent-google-sub-john",
            "email": "john@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

        response = self.client.post(
            "/api/auth/google/",
            {"id_token": "fake-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = CustomUser.objects.get(email="john@example.com")
        self.assertNotEqual(user.username, "john")

    @patch("users.serializers.verify_google_id_token")
    def test_kid_google_login_after_parent_accepts(self, mock_verify):
        mock_verify.return_value = {
            "sub": "kid-google-sub-2",
            "email": "kid2.google@example.com",
            "email_verified": True,
            "iss": "accounts.google.com",
        }
        self.client.post(
            "/api/kids/signup/google/",
            {
                "id_token": "fake-token",
                "name": "Google Kid",
                "username": "google_kid2",
                "parent_email": "parent@example.com",
            },
            format="json",
        )
        kid = Kid.objects.get(username="google_kid2")
        kid.registration_status = Kid.RegistrationStatus.ACTIVE
        kid.save(update_fields=["registration_status"])

        response = self.client.post(
            "/api/auth/kid/google/",
            {"id_token": "fake-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class MeProfileTests(APITestCase):
    def _register_and_login_parent(
        self,
        email="parent@example.com",
        username="parent_one",
        password="secure-pass-1",
    ):
        self.client.post(
            "/api/auth/register/",
            {"email": email, "username": username, "password": password},
            format="json",
        )
        _verify_parent(self.client, email)
        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": email, "password": password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        return CustomUser.objects.get(email=email)

    def _signup_activate_and_login_kid(
        self,
        name="Alex",
        username="alex_me",
        email="alex_me@example.com",
        password="secure-pass-1",
        parent_email="parent_me@example.com",
    ):
        self.client.post(
            "/api/kids/signup/",
            {
                "name": name,
                "username": username,
                "email": email,
                "password": password,
                "parent_email": parent_email,
            },
            format="json",
        )
        _verify_kid(self.client, username)
        kid = Kid.objects.get(username=username)
        kid.registration_status = Kid.RegistrationStatus.ACTIVE
        kid.save(update_fields=["registration_status"])
        login = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": username, "password": password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        return kid

    def test_unauthenticated_me_returns_401(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_parent_get_me(self):
        parent = self._register_and_login_parent()
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(parent.id))
        self.assertEqual(response.data["email"], parent.email)
        self.assertEqual(response.data["username"], parent.username)
        self.assertEqual(response.data["role"], "parent")
        self.assertTrue(response.data["email_verified"])
        self.assertTrue(response.data["has_password"])
        self.assertIsNone(response.data["pending_email"])

    def test_parent_patch_username(self):
        self._register_and_login_parent()
        response = self.client.patch(
            "/api/auth/me/",
            {"username": "new_parent_name"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "new_parent_name")
        self.assertTrue(
            CustomUser.objects.filter(username="new_parent_name").exists()
        )

    def test_parent_patch_duplicate_username(self):
        CustomUser.objects.create_user(
            email="other@example.com",
            username="taken_user",
            password="secure-pass-1",
            role="parent",
        )
        self._register_and_login_parent()
        response = self.client.patch(
            "/api/auth/me/",
            {"username": "taken_user"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_kid_get_me(self):
        kid = self._signup_activate_and_login_kid()
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(kid.id))
        self.assertEqual(response.data["name"], "Alex")
        self.assertEqual(response.data["username"], "alex_me")
        self.assertEqual(response.data["email"], "alex_me@example.com")
        self.assertEqual(response.data["registration_status"], "active")

    def test_kid_patch_name_and_username(self):
        self._signup_activate_and_login_kid()
        response = self.client.patch(
            "/api/auth/me/",
            {"name": "Alexandra", "username": "alexandra_me"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Alexandra")
        self.assertEqual(response.data["username"], "alexandra_me")

    def test_kid_patch_duplicate_username(self):
        Kid.objects.create(
            name="Other",
            username="taken_kid",
            email="other_kid@example.com",
            registration_status=Kid.RegistrationStatus.ACTIVE,
        )
        self._signup_activate_and_login_kid()
        response = self.client.patch(
            "/api/auth/me/",
            {"username": "taken_kid"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_parent_patch_bio(self):
        self._register_and_login_parent()
        response = self.client.patch(
            "/api/auth/me/",
            {"bio": "  Parent who loves outdoor adventures.  "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bio"], "Parent who loves outdoor adventures.")
        parent = CustomUser.objects.get(email="parent@example.com")
        self.assertEqual(parent.bio, "Parent who loves outdoor adventures.")

    def test_kid_patch_bio(self):
        kid = self._signup_activate_and_login_kid()
        response = self.client.patch(
            "/api/auth/me/",
            {"bio": "I like robots and soccer."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bio"], "I like robots and soccer.")
        kid.refresh_from_db()
        self.assertEqual(kid.bio, "I like robots and soccer.")

    def test_bio_can_be_cleared(self):
        self._register_and_login_parent()
        self.client.patch("/api/auth/me/", {"bio": "Something"}, format="json")
        response = self.client.patch("/api/auth/me/", {"bio": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bio"], "")

    def test_unauthenticated_delete_me_returns_401(self):
        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_kid_delete_me(self):
        kid = self._signup_activate_and_login_kid()
        kid_id = kid.id
        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Kid.objects.filter(pk=kid_id).exists())

    def test_parent_delete_me_without_kids(self):
        parent = self._register_and_login_parent()
        parent_id = parent.id
        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomUser.objects.filter(pk=parent_id).exists())

    def test_parent_delete_me_blocked_when_sole_guardian(self):
        parent = self._register_and_login_parent()
        Kid.objects.create(
            name="Linked",
            username="linked_kid",
            email="linked_kid@example.com",
            parent=parent,
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )
        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("only guardian", response.data["detail"])
        self.assertTrue(CustomUser.objects.filter(pk=parent.id).exists())

    def test_parent_delete_me_allowed_when_another_guardian_exists(self):
        parent = self._register_and_login_parent()
        other = CustomUser.objects.create_user(
            email="other_parent@example.com",
            username="other_parent",
            password="secure-pass-1",
            role="parent",
            email_verified=True,
        )
        kid = Kid.objects.create(
            name="Shared",
            username="shared_kid",
            email="shared_kid@example.com",
            parent=parent,
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )
        GuardianInvitation.objects.create(
            kid=kid,
            parent=parent,
            invite_email=parent.email,
            role="primary",
            status="accepted",
        )
        GuardianInvitation.objects.create(
            kid=kid,
            parent=other,
            invite_email=other.email,
            role="secondary",
            status="accepted",
        )
        parent_id = parent.id
        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomUser.objects.filter(pk=parent_id).exists())
        kid.refresh_from_db()
        self.assertEqual(kid.parent_id, other.id)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
    PASSWORD_RESET_EXPIRY_HOURS=1,
)
class PasswordResetTests(APITestCase):
    GENERIC_MESSAGE = (
        "If an account exists for that email, we sent a password reset link."
    )

    def _register_parent(self, email="parent@example.com", username="parent_one"):
        self.client.post(
            "/api/auth/register/",
            {
                "email": email,
                "username": username,
                "password": "secure-pass-1",
            },
            format="json",
        )
        return _verify_parent(self.client, email)

    def _active_kid(self, email="alex@example.com", username="alex_reset"):
        kid = Kid.objects.create(
            name="Alex",
            username=username,
            email=email,
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )
        kid.set_password("secure-pass-1")
        kid.save(update_fields=["password_hash"])
        return kid

    def test_parent_request_sends_email_and_hides_existence(self):
        self._register_parent()
        mail.outbox.clear()

        known = self.client.post(
            "/api/auth/password-reset/",
            {"email": "parent@example.com"},
            format="json",
        )
        unknown = self.client.post(
            "/api/auth/password-reset/",
            {"email": "nobody@example.com"},
            format="json",
        )

        self.assertEqual(known.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data["message"], self.GENERIC_MESSAGE)
        self.assertEqual(unknown.data["message"], self.GENERIC_MESSAGE)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset-password?token=", mail.outbox[0].body)

    def test_parent_confirm_updates_password(self):
        parent = self._register_parent()
        self.client.post(
            "/api/auth/password-reset/",
            {"email": "parent@example.com"},
            format="json",
        )
        parent.refresh_from_db()
        token = parent.password_reset_token

        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"token": str(token), "new_password": "brand-new-pass-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        login = self.client.post(
            "/api/auth/token/",
            {
                "emailOrUsername": "parent@example.com",
                "password": "brand-new-pass-1",
            },
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        parent.refresh_from_db()
        self.assertIsNone(parent.password_reset_token)

        reuse = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"token": str(token), "new_password": "another-pass-1"},
            format="json",
        )
        self.assertEqual(reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_parent_confirm_rejects_expired_token(self):
        from datetime import timedelta

        from django.utils import timezone

        parent = self._register_parent()
        self.client.post(
            "/api/auth/password-reset/",
            {"email": "parent@example.com"},
            format="json",
        )
        parent.refresh_from_db()
        parent.password_reset_sent_at = timezone.now() - timedelta(hours=2)
        parent.save(update_fields=["password_reset_sent_at"])

        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "token": str(parent.password_reset_token),
                "new_password": "brand-new-pass-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("token", response.data)

    def test_kid_reset_flow(self):
        kid = self._active_kid()
        mail.outbox.clear()

        request = self.client.post(
            "/api/auth/kid/password-reset/",
            {"email": "alex@example.com"},
            format="json",
        )
        self.assertEqual(request.status_code, status.HTTP_200_OK)
        self.assertEqual(request.data["message"], self.GENERIC_MESSAGE)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/kid/reset-password?token=", mail.outbox[0].body)

        kid.refresh_from_db()
        confirm = self.client.post(
            "/api/auth/kid/password-reset/confirm/",
            {
                "token": str(kid.password_reset_token),
                "new_password": "kid-new-pass-1",
            },
            format="json",
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)

        login = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "alex_reset", "password": "kid-new-pass-1"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_confirm_rejects_weak_password(self):
        parent = self._register_parent()
        self.client.post(
            "/api/auth/password-reset/",
            {"email": "parent@example.com"},
            format="json",
        )
        parent.refresh_from_db()
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"token": str(parent.password_reset_token), "new_password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class UsernameValidationTests(APITestCase):
    """Kids and parents share one username namespace, so one rule covers both.

    Kid signup used to accept anything at all — emoji, markup, bare spaces.
    """

    REJECTED = {
        "spaces": "hi there",
        "markup": "<script>",
        "path": "../etc",
        "at_sign": "user@name",
        "dot": "first.last",
        "hyphen": "first-last",
        "plus": "user+tag",
        "too_short": "ab",
        "too_long": "a" * 21,
        "leading_digit": "1player",
        "leading_underscore": "_player",
        "blank": "   ",
    }

    def _signup_kid(self, username, slug):
        return self.client.post(
            "/api/kids/signup/",
            {
                "name": "Alex",
                "username": username,
                "email": f"kid_{slug}@example.com",
                "password": "secure-pass-1",
                "parent_email": f"parent_{slug}@example.com",
            },
            format="json",
        )

    def _register_parent(self, username, slug):
        return self.client.post(
            "/api/auth/register/",
            {
                "username": username,
                "email": f"reg_{slug}@example.com",
                "password": "secure-pass-1",
            },
            format="json",
        )

    def test_kid_signup_rejects_unusual_usernames(self):
        for slug, username in self.REJECTED.items():
            with self.subTest(case=slug):
                response = self._signup_kid(username, slug)
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                    msg=f"{username!r} should have been rejected",
                )
                self.assertIn("username", response.data)
        self.assertEqual(Kid.objects.count(), 0)

    def test_parent_register_rejects_unusual_usernames(self):
        for slug, username in self.REJECTED.items():
            with self.subTest(case=slug):
                response = self._register_parent(username, slug)
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                    msg=f"{username!r} should have been rejected",
                )
                self.assertIn("username", response.data)
        self.assertEqual(CustomUser.objects.count(), 0)

    def test_emoji_is_rejected(self):
        response = self._signup_kid("kid\U0001f389emoji", "emoji")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accented_letters_are_rejected(self):
        # Django's default validator lets these through for parents; ours does not.
        response = self._register_parent("N\u00f1o\u00f1o", "accents")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reserved_names_are_rejected(self):
        for username in ("admin", "Root", "SUPPORT", "kiddopath"):
            with self.subTest(username=username):
                kid = self._signup_kid(username, f"res_{username.lower()}")
                self.assertEqual(kid.status_code, status.HTTP_400_BAD_REQUEST)
                parent = self._register_parent(username, f"resp_{username.lower()}")
                self.assertEqual(parent.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_usernames_are_accepted(self):
        for index, username in enumerate(("abc", "alex_99", "A_1", "a" * 20)):
            with self.subTest(username=username):
                response = self._signup_kid(username, f"ok{index}")
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_surrounding_whitespace_is_trimmed(self):
        response = self._signup_kid("  alex_kid  ", "trim")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "alex_kid")
        self.assertTrue(Kid.objects.filter(username="alex_kid").exists())

    def test_profile_edit_is_validated_for_both_actors(self):
        kid = Kid.objects.create(
            name="Alex",
            username="alex_edit",
            email="alex_edit@example.com",
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )
        kid.set_password("secure-pass-1")
        kid.save(update_fields=["password_hash"])
        kid_login = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "alex_edit", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {kid_login.data['access']}"
        )
        response = self.client.patch(
            "/api/auth/me/", {"username": "not valid!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        kid.refresh_from_db()
        self.assertEqual(kid.username, "alex_edit")

        self.client.credentials()
        self._register_parent("parent_edit", "edit")
        _verify_parent(self.client, "reg_edit@example.com")
        parent_login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "reg_edit@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {parent_login.data['access']}"
        )
        response = self.client.patch(
            "/api/auth/me/", {"username": "bad.name"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class GoogleGeneratedUsernameTests(APITestCase):
    """Google hands us an email local part, which rarely obeys the rules."""

    def _login(self, mock_verify, email, sub):
        mock_verify.return_value = {
            "sub": sub,
            "email": email,
            "email_verified": True,
            "iss": "accounts.google.com",
        }
        response = self.client.post(
            "/api/auth/google/", {"id_token": "fake-token"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return CustomUser.objects.get(email=email)

    @patch("users.serializers.verify_google_id_token")
    def test_dots_and_plus_are_stripped(self, mock_verify):
        user = self._login(mock_verify, "mariam.hassan+news@gmail.com", "sub-dots")
        self.assertEqual(user.username, "mariamhassannews")

    @patch("users.serializers.verify_google_id_token")
    def test_leading_digits_are_dropped(self, mock_verify):
        user = self._login(mock_verify, "123abc@example.com", "sub-digits")
        self.assertEqual(user.username, "abc")

    @patch("users.serializers.verify_google_id_token")
    def test_unusable_local_part_falls_back(self, mock_verify):
        user = self._login(mock_verify, "123.456@example.com", "sub-numeric")
        self.assertEqual(user.username, "player")

    @patch("users.serializers.verify_google_id_token")
    def test_long_local_part_is_truncated(self, mock_verify):
        user = self._login(mock_verify, f"{'a' * 40}@example.com", "sub-long")
        self.assertEqual(user.username, "a" * 20)

    @patch("users.serializers.verify_google_id_token")
    def test_reserved_local_part_gets_a_suffix(self, mock_verify):
        user = self._login(mock_verify, "admin@example.com", "sub-admin")
        self.assertEqual(user.username, "admin_1")

    @patch("users.serializers.verify_google_id_token")
    def test_suffix_keeps_the_name_within_the_limit(self, mock_verify):
        CustomUser.objects.create_user(
            email="taken@example.com",
            username="b" * 20,
            password="secure-pass-1",
            role="parent",
        )
        user = self._login(mock_verify, f"{'b' * 30}@example.com", "sub-collide")
        self.assertEqual(user.username, f"{'b' * 18}_1")
        self.assertLessEqual(len(user.username), 20)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class KidParentsInMeTests(APITestCase):
    """The kid app needs to name the kid's guardians, so /auth/me/ carries them.

    A kid can have two: the primary on the Kid.parent FK, a second only on an
    accepted invitation.
    """

    def setUp(self):
        self.kid = Kid.objects.create(
            name="Alex",
            username="alex_parents",
            email="alex_parents@example.com",
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )
        self.kid.set_password("secure-pass-1")
        self.kid.save(update_fields=["password_hash"])
        login = self.client.post(
            "/api/auth/kid/token/",
            {"emailOrUsername": "alex_parents", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def _parent(self, email, username, bio=""):
        return CustomUser.objects.create_user(
            email=email,
            username=username,
            password="secure-pass-1",
            role="parent",
            email_verified=True,
            bio=bio,
        )

    def _parents(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["parents"]

    def test_kid_awaiting_a_parent_gets_an_empty_list(self):
        self.assertEqual(self._parents(), [])

    def test_primary_parent_is_listed(self):
        parent = self._parent("mum@example.com", "mum", bio="Loves hiking")
        self.kid.parent = parent
        self.kid.save(update_fields=["parent"])

        parents = self._parents()
        self.assertEqual(len(parents), 1)
        self.assertEqual(parents[0]["id"], str(parent.id))
        self.assertEqual(parents[0]["username"], "mum")
        self.assertEqual(parents[0]["email"], "mum@example.com")
        self.assertEqual(parents[0]["bio"], "Loves hiking")
        self.assertEqual(parents[0]["role"], "primary")

    def test_second_guardian_is_listed_after_the_primary(self):
        primary = self._parent("mum@example.com", "mum")
        secondary = self._parent("dad@example.com", "dad")
        self.kid.parent = primary
        self.kid.save(update_fields=["parent"])
        GuardianInvitation.objects.create(
            kid=self.kid,
            parent=secondary,
            invite_email=secondary.email,
            role="secondary",
            status="accepted",
        )

        parents = self._parents()
        self.assertEqual(
            [(p["username"], p["role"]) for p in parents],
            [("mum", "primary"), ("dad", "secondary")],
        )

    def test_pending_invitation_is_not_a_guardian_yet(self):
        GuardianInvitation.objects.create(
            kid=self.kid,
            invite_email="maybe@example.com",
            role="secondary",
            status="pending",
        )
        self.assertEqual(self._parents(), [])

    def test_primary_is_not_duplicated_by_its_own_invitation(self):
        parent = self._parent("mum@example.com", "mum")
        self.kid.parent = parent
        self.kid.save(update_fields=["parent"])
        GuardianInvitation.objects.create(
            kid=self.kid,
            parent=parent,
            invite_email=parent.email,
            role="primary",
            status="accepted",
        )
        self.assertEqual(len(self._parents()), 1)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="https://localhost",
)
class MePasswordAndEmailTests(APITestCase):
    def _login_parent(self):
        self.client.post(
            "/api/auth/register/",
            {
                "email": "parent@example.com",
                "username": "parent_one",
                "password": "secure-pass-1",
            },
            format="json",
        )
        _verify_parent(self.client, "parent@example.com")
        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "parent@example.com", "password": "secure-pass-1"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        return CustomUser.objects.get(email="parent@example.com")

    def test_change_password_requires_current(self):
        self._login_parent()
        response = self.client.post(
            "/api/auth/me/password/",
            {"new_password": "another-pass-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_success(self):
        self._login_parent()
        response = self.client.post(
            "/api/auth/me/password/",
            {
                "current_password": "secure-pass-1",
                "new_password": "another-pass-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.client.credentials()
        login = self.client.post(
            "/api/auth/token/",
            {"emailOrUsername": "parent@example.com", "password": "another-pass-1"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_set_password_when_none(self):
        parent = CustomUser.objects.create_user(
            email="google-parent@example.com",
            username="google_parent",
            password="temporary-ignored",
            role="parent",
            email_verified=True,
        )
        parent.set_unusable_password()
        parent.save(update_fields=["password"])
        from users.serializers import CustomTokenObtainPairSerializer

        access = str(CustomTokenObtainPairSerializer.get_token(parent).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.post(
            "/api/auth/me/password/",
            {"new_password": "new-google-pass-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        parent.refresh_from_db()
        self.assertTrue(parent.has_usable_password())
        self.assertTrue(parent.check_password("new-google-pass-1"))

    def test_email_change_and_confirm(self):
        parent = self._login_parent()
        response = self.client.post(
            "/api/auth/me/email/",
            {"email": "parent-new@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pending_email"], "parent-new@example.com")
        parent.refresh_from_db()
        self.assertEqual(parent.email, "parent@example.com")
        self.assertEqual(parent.pending_email, "parent-new@example.com")
        self.assertEqual(len(mail.outbox), 2)  # register verify + change

        token = parent.email_verification_token
        self.client.credentials()
        confirm = self.client.post(
            "/api/auth/verify-email-change/",
            {"token": str(token)},
            format="json",
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)
        parent.refresh_from_db()
        self.assertEqual(parent.email, "parent-new@example.com")
        self.assertIsNone(parent.pending_email)

    def test_email_change_rejects_duplicate(self):
        CustomUser.objects.create_user(
            email="taken@example.com",
            username="other",
            password="secure-pass-1",
            role="parent",
        )
        self._login_parent()
        response = self.client.post(
            "/api/auth/me/email/",
            {"email": "taken@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(INTERNAL_SERVICE_TOKEN="test-internal-token")
class KidInternalDetailTests(APITestCase):
    def test_active_kid_found(self):
        kid = Kid.objects.create(
            name="Alex",
            username="alex_internal",
            email="alex_internal@example.com",
            bio="I like robots",
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )
        response = self.client.get(
            f"/api/auth/internal/kids/{kid.id}/",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "alex_internal")
        self.assertEqual(response.data["name"], "Alex")
        self.assertEqual(response.data["bio"], "I like robots")

    def test_inactive_kid_not_found(self):
        kid = Kid.objects.create(
            name="Sam",
            username="sam_internal",
            email="sam_internal@example.com",
            registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
            email_verified=True,
        )
        response = self.client.get(
            f"/api/auth/internal/kids/{kid.id}/",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_batch_returns_active_kids_only(self):
        active = Kid.objects.create(
            name="Alex",
            username="alex_batch",
            email="alex_batch@example.com",
            bio="Hello",
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )
        inactive = Kid.objects.create(
            name="Sam",
            username="sam_batch",
            email="sam_batch@example.com",
            registration_status=Kid.RegistrationStatus.AWAITING_PRIMARY_PARENT,
            email_verified=True,
        )
        response = self.client.get(
            f"/api/auth/internal/kids/?ids={active.id},{inactive.id}",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["kid_id"], str(active.id))
        self.assertEqual(response.data[0]["bio"], "Hello")

    def test_batch_empty_ids_returns_empty_list(self):
        response = self.client.get(
            "/api/auth/internal/kids/",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def _active_kid(self, name, username, email):
        return Kid.objects.create(
            name=name,
            username=username,
            email=email,
            registration_status=Kid.RegistrationStatus.ACTIVE,
            email_verified=True,
        )

    def test_search_requires_q_min_length(self):
        response = self.client.get(
            "/api/auth/internal/kids/search/?q=a",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_by_username_and_name(self):
        self._active_kid("Alex", "alex_search", "alex_search@example.com")
        self._active_kid("Sam Robot", "sammy", "sam_search@example.com")
        self._active_kid("Other", "zzz", "other_search@example.com")

        by_username = self.client.get(
            "/api/auth/internal/kids/search/?q=alex",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(by_username.status_code, status.HTTP_200_OK)
        self.assertEqual(by_username.data["count"], 1)
        self.assertEqual(by_username.data["results"][0]["username"], "alex_search")

        by_name = self.client.get(
            "/api/auth/internal/kids/search/?q=robot",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(by_name.data["count"], 1)
        self.assertEqual(by_name.data["results"][0]["username"], "sammy")

    def test_search_ordering_and_pagination(self):
        self._active_kid("A", "alpha_kid", "alpha@example.com")
        self._active_kid("B", "beta_kid", "beta@example.com")
        self._active_kid("C", "gamma_kid", "gamma@example.com")

        response = self.client.get(
            "/api/auth/internal/kids/search/?q=kid&ordering=-username&page_size=2",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["username"], "gamma_kid")
        self.assertIsNotNone(response.data["next"])

    def test_search_exclude_ids(self):
        keep = self._active_kid("Keep", "keep_me", "keep@example.com")
        drop = self._active_kid("Drop", "drop_me", "drop@example.com")
        response = self.client.get(
            f"/api/auth/internal/kids/search/?q=me&exclude_ids={drop.id}",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["kid_id"], str(keep.id))

    def test_search_include_ids_empty_returns_empty(self):
        self._active_kid("Alex", "alex_inc", "alex_inc@example.com")
        response = self.client.get(
            "/api/auth/internal/kids/search/?q=alex&include_ids=",
            HTTP_X_INTERNAL_TOKEN="test-internal-token",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])
