import json
from channels.generic.websocket import  AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.conf import settings

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token = self.get_token_from_query_string()
        if not token:
            await self.close()
            return
        
        user_id = await self.authenticate(token)
        if not user_id:
            await self.close()
            return
        
        self.user_id = str(user_id)
        self.group_name = f'notifications_{self.user_id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
       if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        # Handle incoming messages from the WebSocket if needed
        pass

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event['data']))

    def get_token_from_query_string(self):
        query_string = self.scope.get('query_string', b'').decode()
        for param in query_string.split('&'):
            if param.startswith('token='):
                return param.split('=')[1]
        return None
    
    @database_sync_to_async
    def authenticate(self, token):
        try:
            validated = AccessToken(token)
            return validated.get('kid_id') or validated.get('user_id')
        except Exception:
            return None
