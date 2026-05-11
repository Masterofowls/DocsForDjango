# Building a Chat App with Channels

## Installation

```powershell
python -m pip install channels channels-redis
```

## Settings

```python
INSTALLED_APPS = [
  # ...
  'channels',
  'chat',  # your app
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
  'default': {
    'BACKEND': 'channels_redis.core.RedisChannelLayer',
    'CONFIG': {
      'hosts': [('127.0.0.1', 6379)],
    },
  },
}
```

## Models

```python
from django.db import models
from django.conf import settings


class Room(models.Model):
  name = models.CharField(max_length=200, unique=True)
  created_at = models.DateTimeField(auto_now_add=True)


class Message(models.Model):
  room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
  user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
  text = models.TextField()
  created_at = models.DateTimeField(auto_now_add=True)
```

## Consumer (WebSocket Handler)

```python
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message


class ChatConsumer(AsyncWebsocketConsumer):
  async def connect(self):
    self.room_name = self.scope['url_route']['kwargs']['room_name']
    self.room_group_name = f'chat_{self.room_name}'

    await self.channel_layer.group_add(self.room_group_name, self.channel_name)
    await self.accept()

  async def disconnect(self, close_code):
    await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

  async def receive(self, text_data):
    data = json.loads(text_data)
    message_text = data.get('message', '')
    user = self.scope['user']

    if not user.is_authenticated:
      return

    await self.save_message(self.room_name, user, message_text)

    await self.channel_layer.group_send(
      self.room_group_name,
      {
        'type': 'chat_message',
        'message': message_text,
        'username': user.username,
      },
    )

  async def chat_message(self, event):
    await self.send(text_data=json.dumps({
      'message': event['message'],
      'username': event['username'],
    }))

  @database_sync_to_async
  def save_message(self, room_name, user, text):
    room, _ = Room.objects.get_or_create(name=room_name)
    Message.objects.create(room=room, user=user, text=text)
```

## Routing

```python
from django.urls import re_path
from .consumers import ChatConsumer

websocket_urlpatterns = [
  re_path(r'ws/chat/(?P<room_name>\w+)/$', ChatConsumer.as_asgi()),
]
```

## ASGI Configuration

In `config/asgi.py`:

```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from chat.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
  'http': get_asgi_application(),
  'websocket': AllowedHostsOriginValidator(
    AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
  ),
})
```
