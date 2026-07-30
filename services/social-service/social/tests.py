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
    NOTIFICATION_INTERNAL_URL='http://notification-service:8000',
    INTERNAL_SERVICE_TOKEN='test-internal-token',
    CHANNEL_LAYERS={
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    },
)
@patch('social.views.notify_friend_request')
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
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars, _mock_notify
    ):
        response = self.client.get('/api/social/friends/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_parent_forbidden(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars, _mock_notify
    ):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {parent_access_token()}'
        )
        response = self.client.get('/api/social/friends/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_send_and_list_incoming_request(
        self, _mock_lookup, mock_kids, _mock_progress, _mock_avatars, mock_notify
    ):
        self.auth_as(self.kid_a)
        create = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_b)},
            format='json',
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data['status'], 'pending')
        mock_notify.assert_called_once_with(
            recipient_id=self.kid_b,
            sender_username='kid',
        )

        mock_kids.return_value = {
            str(self.kid_a): {
                'name': 'Alex',
                'username': 'alex_me',
                'bio': 'I like robots',
            }
        }

        self.auth_as(self.kid_b)
        incoming = self.client.get('/api/social/friends/requests/')
        self.assertEqual(incoming.status_code, status.HTTP_200_OK)
        self.assertEqual(len(incoming.data), 1)
        self.assertEqual(incoming.data[0]['from_kid_id'], str(self.kid_a))
        self.assertEqual(incoming.data[0]['from_name'], 'Alex')
        self.assertEqual(incoming.data[0]['from_username'], 'alex_me')
        self.assertEqual(incoming.data[0]['from_bio'], 'I like robots')

    def test_cannot_friend_self(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars, _mock_notify
    ):
        self.auth_as(self.kid_a)
        response = self.client.post(
            '/api/social/friends/requests/',
            {'to_kid_id': str(self.kid_a)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_request_rejected(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars, _mock_notify
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
        self, _mock_lookup, mock_kids, mock_progress, mock_avatars, _mock_notify
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
        hat_id = uuid4()
        mock_avatars.return_value = {
            str(self.kid_a): {
                'base_character': 'default',
                'equipped_hat': hat_id,
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
        self.assertEqual(friend['avatar']['equipped_hat'], str(hat_id))

        mark_offline(self.kid_a)
        friends_offline = self.client.get('/api/social/friends/')
        self.assertFalse(friends_offline.data[0]['is_online'])

        deleted = self.client.delete(f'/api/social/friends/{self.kid_a}/')
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Friendship.objects.filter(status=Friendship.Status.ACCEPTED).exists()
        )

    def test_decline_request(
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars, _mock_notify
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
        self, mock_lookup, _mock_kids, _mock_progress, _mock_avatars, _mock_notify
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
        self, _mock_lookup, _mock_kids, _mock_progress, _mock_avatars, _mock_notify
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
@patch('social.views.search_kids')
class KidSearchApiTests(APITestCase):
    def setUp(self):
        self.me = uuid4()
        self.other = uuid4()
        self.friend = uuid4()

    def auth_as(self, kid_id):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {kid_access_token(kid_id)}'
        )

    def test_search_requires_q(self, _mock_search):
        self.auth_as(self.me)
        response = self.client.get('/api/social/kids/search/?q=a')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        _mock_search.assert_not_called()

    def test_search_enriches_friendship_and_online(self, mock_search):
        mock_search.return_value = {
            'count': 1,
            'next': None,
            'previous': None,
            'results': [
                {
                    'kid_id': str(self.other),
                    'username': 'alex_me',
                    'name': 'Alex',
                    'bio': 'hi',
                }
            ],
        }
        Friendship.objects.create(
            from_kid_id=self.me,
            to_kid_id=self.other,
            status=Friendship.Status.PENDING,
        )
        mark_online(self.other)
        self.auth_as(self.me)

        response = self.client.get(
            '/api/social/kids/search/?q=al&status=all&ordering=username'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        row = response.data['results'][0]
        self.assertEqual(row['username'], 'alex_me')
        self.assertEqual(row['friendship_status'], 'pending_sent')
        self.assertTrue(row['is_online'])
        mock_search.assert_called_once()
        kwargs = mock_search.call_args.kwargs
        self.assertEqual(kwargs['q'], 'al')
        self.assertIn(str(self.me), [str(x) for x in kwargs['exclude_ids']])

    def test_search_not_friends_excludes_related(self, mock_search):
        mock_search.return_value = {
            'count': 0,
            'next': None,
            'previous': None,
            'results': [],
        }
        Friendship.objects.create(
            from_kid_id=self.me,
            to_kid_id=self.friend,
            status=Friendship.Status.ACCEPTED,
        )
        self.auth_as(self.me)
        response = self.client.get('/api/social/kids/search/?q=ab')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        exclude_ids = {str(x) for x in mock_search.call_args.kwargs['exclude_ids']}
        self.assertIn(str(self.me), exclude_ids)
        self.assertIn(str(self.friend), exclude_ids)

    def test_search_friends_empty_without_auth_call(self, mock_search):
        self.auth_as(self.me)
        response = self.client.get(
            '/api/social/kids/search/?q=ab&status=friends'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'], [])
        mock_search.assert_not_called()

    def test_search_online_filter(self, mock_search):
        mock_search.return_value = {
            'count': 2,
            'next': None,
            'previous': None,
            'results': [
                {
                    'kid_id': str(self.other),
                    'username': 'online_kid',
                    'name': 'On',
                    'bio': '',
                },
                {
                    'kid_id': str(self.friend),
                    'username': 'offline_kid',
                    'name': 'Off',
                    'bio': '',
                },
            ],
        }
        mark_online(self.other)
        mark_offline(self.friend)
        self.auth_as(self.me)
        response = self.client.get(
            '/api/social/kids/search/?q=kid&status=all&online=true'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['username'], 'online_kid')
