---
id: websockets-with-channels
slug: /websockets-with-channels
sidebar_position: 22
description: "Real-time WebSockets with Django Channels, consumers, channel layers, and live notifications."
---

# WebSockets with Django Channels

## Overview

Django Channels extends Django to handle WebSockets, background tasks, and other asynchronous
protocols. It replaces Django's synchronous WSGI server with an ASGI server and provides the
concept of "consumers" — async equivalents of views that persist across a connection's lifetime.

---

## 1. Installation and Setup

```powershell
pip install channels channels-redis daphne
```

### ASGI configuration

```python
# config/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
import chat.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(chat.routing.websocket_urlpatterns)
        )
    ),
})
```

```python
# settings.py
ASGI_APPLICATION = 'config.asgi.application'

INSTALLED_APPS += ['channels', 'daphne']

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}
```

---

## 2. Consumers

Consumers are async classes that handle WebSocket events.

### Simple echo consumer

```python
# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class EchoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({'message': 'Connected'}))

    async def disconnect(self, close_code):
        pass  # clean up if needed

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.send(text_data=json.dumps({
            'echo': data.get('message', '')
        }))
```

### Chat room consumer with channel groups

```python
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join channel group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,   # unique name for this connection
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        user = self.scope['user']

        # Broadcast to all connections in the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',  # maps to chat_message method
                'message': message,
                'username': user.username if user.is_authenticated else 'Anonymous',
            }
        )

    # Handler for group messages (type field maps to this method name)
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username'],
        }))
```

---

## 3. Routing

```python
# chat/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/echo/$', consumers.EchoConsumer.as_asgi()),
]
```

---

## 4. Database Access in Consumers

Use `database_sync_to_async` to call synchronous ORM operations safely:

```python
from channels.db import database_sync_to_async
from chat.models import Message


class ChatConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def save_message(self, room_name, user, text):
        from chat.models import Room, Message
        room = Room.objects.get(name=room_name)
        return Message.objects.create(room=room, author=user, body=text)

    @database_sync_to_async
    def get_recent_messages(self, room_name, count=50):
        from chat.models import Message
        return list(
            Message.objects
            .filter(room__name=room_name)
            .select_related('author')
            .order_by('-created_at')[:count]
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = await self.save_message(
            self.room_name, self.scope['user'], data['message']
        )
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',
                'message': data['message'],
                'username': self.scope['user'].username,
                'timestamp': message.created_at.isoformat(),
            }
        )
```

---

## 5. JavaScript Client

```html
<!-- templates/chat/room.html -->
<div id="messages"></div>
<input id="msg-input" type="text" placeholder="Type a message..." />
<button id="send-btn">Send</button>

<script>
const roomName = '{{ room_name }}';
const socket = new WebSocket(
    `ws://${window.location.host}/ws/chat/${roomName}/`
);

socket.onopen = () => {
    console.log('Connected to chat room:', roomName);
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const div = document.getElementById('messages');
    div.innerHTML += `<p><strong>${data.username}:</strong> ${data.message}</p>`;
};

socket.onclose = (event) => {
    console.warn('WebSocket closed:', event.code);
};

document.getElementById('send-btn').onclick = () => {
    const input = document.getElementById('msg-input');
    socket.send(JSON.stringify({ message: input.value }));
    input.value = '';
};
</script>
```

---

## 6. Live Notifications (Push from Server)

Send WebSocket messages from anywhere in Django (views, tasks, signals):

```python
# Send from a Celery task or any Django code
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def notify_user(user_id: int, payload: dict) -> None:
    """Push a notification to a specific user's WebSocket connection."""
    channel_layer = get_channel_layer()
    group_name = f'user_{user_id}'
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'notification.message',
            'payload': payload,
        }
    )
```

```python
# Consumer that subscribes the user to their personal group
class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user.is_authenticated:
            await self.close()
            return
        self.group_name = f'user_{user.pk}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event['payload']))
```

---

## 7. Running the ASGI Server

```powershell
# Development — Daphne ASGI server
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Or with uvicorn
pip install uvicorn
uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload
```

---

## Quick Reference

| Concept | Code |
|---|---|
| Install | `pip install channels channels-redis daphne` |
| ASGI app | `ASGI_APPLICATION = 'config.asgi.application'` |
| Channel layer | `CHANNEL_LAYERS = {'default': {'BACKEND': 'channels_redis.core.RedisChannelLayer'}}` |
| Consumer | Extend `AsyncWebsocketConsumer` |
| Join group | `await self.channel_layer.group_add(group, self.channel_name)` |
| Broadcast | `await self.channel_layer.group_send(group, {'type': 'event.name', ...})` |
| DB in consumer | `@database_sync_to_async` decorator |
| Push from views | `async_to_sync(channel_layer.group_send)(group, {...})` |
| Run server | `daphne config.asgi:application` |
