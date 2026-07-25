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
    GAMIFICATION_INTERNAL_URL='http://gamification-service:8000',
    CATALOG_INTERNAL_URL='http://catalog-service:8000',
    INTERNAL_SERVICE_TOKEN='test-internal-token',
    CHANNEL_LAYERS={
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    },
)
@patch('social.serializers.fetch_avatars_by_ids', return_value={})
@patch('social.serializers.fetch_progress_by_ids', return_value={})
@patch('social.serializers.fetch_kids_by_ids', return_value={})
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

    def test_unauthenticated_returns_401(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
        response = self.client.get('/api/social/friends/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_parent_forbidden(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {parent_access_token()}'
        )
        response = self.client.get('/api/social/friends/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_send_and_list_incoming_request(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
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

    def test_cannot_friend_self(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
        self.auth_as(self.kid_a)
        response = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_a)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_request_rejected(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
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

    def test_accept_list_and_unfriend(
        self, _mock_lookup, mock_kids, mock_progress, mock_avatars
    ):
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

        mock_kids.return_value = {
            str(self.kid_a): {
                'name': 'Alex',
                'username': 'alex_me',
                'bio': 'I like robots',
            }
        }
        mock_progress.return_value = {
            str(self.kid_a): {
                'main_level': 2,
                'overall_xp': 150,
                'stats': [
                    {'category': 'health', 'level': 1, 'xp_percent': 40},
                ],
            }
        }
        mock_avatars.return_value = {
            str(self.kid_a): {
                'base_character': 'default',
                'equipped_hat': None,
                'equipped_outfit': None,
                'equipped_accessory': None,
                'equipped_background': None,
            }
        }

        mark_online(self.kid_a)
        friends = self.client.get('/api/social/friends/')
        self.assertEqual(friends.status_code, status.HTTP_200_OK)
        self.assertEqual(len(friends.data), 1)
        friend = friends.data[0]
        self.assertEqual(friend['kid_id'], str(self.kid_a))
        self.assertTrue(friend['is_online'])
        self.assertEqual(friend['name'], 'Alex')
        self.assertEqual(friend['username'], 'alex_me')
        self.assertEqual(friend['bio'], 'I like robots')
        self.assertEqual(friend['main_level'], 2)
        self.assertEqual(friend['overall_xp'], 150)
        self.assertEqual(friend['stats'][0]['category'], 'health')
        self.assertEqual(friend['avatar']['base_character'], 'default')

        mark_offline(self.kid_a)
        friends_offline = self.client.get('/api/social/friends/')
        self.assertFalse(friends_offline.data[0]['is_online'])

        deleted = self.client.delete(f'/api/social/friends/{self.kid_a}/')
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Friendship.objects.filter(status=Friendship.Status.ACCEPTED).exists()
        )

    def test_decline_request(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
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

    def test_unknown_kid_rejected(
        self, mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
        mock_lookup.side_effect = ValidationError('Kid not found.')
        self.auth_as(self.kid_a)
        response = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_c)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_friends_list_defaults_when_enrichment_empty(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars
    ):
        Friendship.objects.create(
            from_kid_id=self.kid_a,
            to_kid_id=self.kid_b,
            status=Friendship.Status.ACCEPTED,
        )
        self.auth_as(self.kid_b)
        friends = self.client.get('/api/social/friends/')
        self.assertEqual(friends.status_code, status.HTTP_200_OK)
        friend = friends.data[0]
        self.assertEqual(friend['name'], '')
        self.assertEqual(friend['username'], '')
        self.assertEqual(friend['bio'], '')
        self.assertIsNone(friend['avatar'])
        self.assertEqual(friend['main_level'], 0)
        self.assertEqual(friend['overall_xp'], 0)
        self.assertEqual(friend['stats'], [])
