import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.db.models import Q
from rest_framework_simplejwt.tokens import AccessToken

from .models import Friendship
from .presence import mark_offline, mark_online


class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token = self.get_token_from_query_string()
        if not token:
            await self.close()
            return

        kid_id = await self.authenticate_kid(token)
        if not kid_id:
            await self.close()
            return

        self.kid_id = str(kid_id)
        self.group_name = f'presence_{self.kid_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await database_sync_to_async(mark_online)(self.kid_id)
        await self.notify_friends('friend_online')

    async def disconnect(self, close_code):
        if not hasattr(self, 'kid_id'):
            return
        await database_sync_to_async(mark_offline)(self.kid_id)
        await self.notify_friends('friend_offline')
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        pass

    async def presence_event(self, event):
        await self.send(text_data=json.dumps(event['data']))

    async def notify_friends(self, event_type):
        friend_ids = await self.get_friend_ids()
        payload = {
            'type': 'presence_event',
            'data': {
                'event': event_type,
                'kid_id': self.kid_id,
            },
        }
        for friend_id in friend_ids:
            await self.channel_layer.group_send(
                f'presence_{friend_id}',
                payload,
            )

    @database_sync_to_async
    def get_friend_ids(self):
        kid_id = self.kid_id
        rows = Friendship.objects.filter(
            Q(from_kid_id=kid_id) | Q(to_kid_id=kid_id),
            status=Friendship.Status.ACCEPTED,
        )
        ids = []
        for row in rows:
            other = (
                row.to_kid_id
                if str(row.from_kid_id) == kid_id
                else row.from_kid_id
            )
            ids.append(str(other))
        return ids

    def get_token_from_query_string(self):
        query_string = self.scope.get('query_string', b'').decode()
        for param in query_string.split('&'):
            if param.startswith('token='):
                return param.split('=', 1)[1]
        return None

    @database_sync_to_async
    def authenticate_kid(self, token):
        try:
            validated = AccessToken(token)
            if validated.get('role') != 'kid':
                return None
            return validated.get('kid_id')
        except Exception:
            return None
