from unittest.mock import patch
from uuid import uuid4

from django.test import override_settings
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from .models import Friendship
from .presence import mark_offline, mark_online


def kid_access_token(kid_id, username='kid'):
    token = AccessToken()
    token['role'] = 'kid'
    token['kid_id'] = str(kid_id)
    token['username'] = username
    return str(token)


def parent_access_token(user_id=None):
    token = AccessToken()
    token['role'] = 'parent'
    token['user_id'] = str(user_id or uuid4())
    token['username'] = 'parent'
    token['email'] = 'parent@example.com'
    token['kid_ids'] = []
    return str(token)


@override_settings(
    PRESENCE_BACKEND='memory',
    AUTH_INTERNAL_URL='http://auth-service:8000',
    INTERNAL_SERVICE_TOKEN='test-internal-token',
    CHANNEL_LAYERS={
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    },
)
@patch('social.serializers.assert_active_kid_exists', return_value=None)
class FriendshipApiTests(APITestCase):
    def setUp(self):
        self.kid_a = uuid4()
        self.kid_b = uuid4()
        self.kid_c = uuid4()

    def auth_as(self, kid_id):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {kid_access_token(kid_id)}'
        )

    def test_unauthenticated_returns_401(self, _mock_lookup):
        response = self.client.get('/api/social/friends/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_parent_forbidden(self, _mock_lookup):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {parent_access_token()}'
        )
        response = self.client.get('/api/social/friends/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_send_and_list_incoming_request(self, _mock_lookup):
        self.auth_as(self.kid_a)
        create = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_b)},
            format='json',
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data['status'], 'pending')

        self.auth_as(self.kid_b)
        incoming = self.client.get('/api/social/friends/requests/')
        self.assertEqual(incoming.status_code, status.HTTP_200_OK)
        self.assertEqual(len(incoming.data), 1)
        self.assertEqual(incoming.data[0]['from_kid_id'], str(self.kid_a))

    def test_cannot_friend_self(self, _mock_lookup):
        self.auth_as(self.kid_a)
        response = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_a)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_request_rejected(self, _mock_lookup):
        self.auth_as(self.kid_a)
        self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_b)},
            format='json',
        )
        again = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_b)},
            format='json',
        )
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)

        self.auth_as(self.kid_b)
        reverse = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_a)},
            format='json',
        )
        self.assertEqual(reverse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_list_and_unfriend(self, _mock_lookup):
        self.auth_as(self.kid_a)
        created = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_b)},
            format='json',
        )
        request_id = created.data['id']

        self.auth_as(self.kid_b)
        accepted = self.client.post(
            f'/api/social/friends/requests/{request_id}/accept/'
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(accepted.data['status'], 'accepted')

        mark_online(self.kid_a)
        friends = self.client.get('/api/social/friends/')
        self.assertEqual(friends.status_code, status.HTTP_200_OK)
        self.assertEqual(len(friends.data), 1)
        self.assertEqual(friends.data[0]['kid_id'], str(self.kid_a))
        self.assertTrue(friends.data[0]['is_online'])

        mark_offline(self.kid_a)
        friends_offline = self.client.get('/api/social/friends/')
        self.assertFalse(friends_offline.data[0]['is_online'])

        deleted = self.client.delete(f'/api/social/friends/{self.kid_a}/')
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Friendship.objects.filter(status=Friendship.Status.ACCEPTED).exists()
        )

    def test_decline_request(self, _mock_lookup):
        self.auth_as(self.kid_a)
        created = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_b)},
            format='json',
        )
        request_id = created.data['id']

        self.auth_as(self.kid_b)
        declined = self.client.post(
            f'/api/social/friends/requests/{request_id}/decline/'
        )
        self.assertEqual(declined.status_code, status.HTTP_200_OK)
        self.assertEqual(declined.data['status'], 'declined')

        friends = self.client.get('/api/social/friends/')
        self.assertEqual(friends.data, [])

    def test_unknown_kid_rejected(self, mock_lookup):
        mock_lookup.side_effect = ValidationError('Kid not found.')
        self.auth_as(self.kid_a)
        response = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_c)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
