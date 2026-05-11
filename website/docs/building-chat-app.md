---
id: building-chat-app
slug: /building-chat-app
sidebar_position: 27
description: "Step-by-step tutorial: build a real-time chat application with Django Channels."
---

# Building a Chat Application

## Overview

This tutorial builds a real-time multi-room chat application using Django Channels, Redis, and
WebSockets. Users can create and join rooms, see who is online, and exchange messages that persist
to the database. It builds on the WebSockets fundamentals from the Channels guide and adds a
complete UI layer.

---

## 1. Setup

```powershell
python manage.py startapp chat
pip install channels channels-redis daphne
```

```python
# settings.py
INSTALLED_APPS += ['channels', 'daphne', 'chat']
ASGI_APPLICATION = 'config.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [('127.0.0.1', 6379)]},
    },
}
```

---

## 2. Models

```python
# chat/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Room(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_rooms'
    )
    members = models.ManyToManyField(User, blank=True, related_name='chat_rooms')
    is_private = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    body = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_system = models.BooleanField(default=False)  # join/leave messages

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['room', 'created_at'])]

    def __str__(self):
        return f'{self.author} in {self.room}: {self.body[:50]}'


class UserOnlineStatus(models.Model):
    """Track user presence across WebSocket connections."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='online_status')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} — {"online" if self.is_online else "offline"}'
```

```powershell
python manage.py makemigrations chat && python manage.py migrate
```

---

## 3. Consumers

```python
# chat/consumers.py
import json
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_slug = self.scope['url_route']['kwargs']['room_slug']
        self.room_group = f'chat_{self.room_slug}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        # Verify user has access to room
        if not await self.can_access_room():
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()
        await self.set_online(True)

        # Load recent message history
        messages = await self.get_recent_messages()
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages,
        }))

        # Announce user joined
        await self.channel_layer.group_send(
            self.room_group,
            {
                'type': 'user.joined',
                'username': self.user.username,
                'timestamp': datetime.now().isoformat(),
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group'):
            await self.channel_layer.group_discard(self.room_group, self.channel_name)
            await self.set_online(False)
            await self.channel_layer.group_send(
                self.room_group,
                {
                    'type': 'user.left',
                    'username': self.user.username,
                    'timestamp': datetime.now().isoformat(),
                }
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', 'message')

        if msg_type == 'message':
            body = data.get('body', '').strip()
            if not body or len(body) > 4000:
                return

            message = await self.save_message(body)
            await self.channel_layer.group_send(
                self.room_group,
                {
                    'type': 'chat.message',
                    'message_id': message.pk,
                    'body': body,
                    'username': self.user.username,
                    'timestamp': message.created_at.isoformat(),
                }
            )

        elif msg_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group,
                {
                    'type': 'user.typing',
                    'username': self.user.username,
                    'is_typing': data.get('is_typing', False),
                }
            )

    # Event handlers (type field -> method name with dots replaced by underscores)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_joined(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_left(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_typing(self, event):
        if event['username'] != self.user.username:
            await self.send(text_data=json.dumps(event))

    # Database helpers

    @database_sync_to_async
    def can_access_room(self):
        from chat.models import Room
        try:
            room = Room.objects.get(slug=self.room_slug)
            if room.is_private:
                return room.members.filter(pk=self.user.pk).exists()
            return True
        except Room.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, body):
        from chat.models import Room, Message
        room = Room.objects.get(slug=self.room_slug)
        return Message.objects.create(room=room, author=self.user, body=body)

    @database_sync_to_async
    def get_recent_messages(self, count=50):
        from chat.models import Room, Message
        room = Room.objects.get(slug=self.room_slug)
        messages = (
            Message.objects
            .filter(room=room)
            .select_related('author')
            .order_by('-created_at')[:count]
        )
        return [
            {
                'message_id': m.pk,
                'body': m.body,
                'username': m.author.username,
                'timestamp': m.created_at.isoformat(),
            }
            for m in reversed(list(messages))
        ]

    @database_sync_to_async
    def set_online(self, is_online):
        from chat.models import UserOnlineStatus
        UserOnlineStatus.objects.update_or_create(
            user=self.user,
            defaults={'is_online': is_online},
        )
```

---

## 4. Routing and ASGI

```python
# chat/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_slug>[\w-]+)/$', consumers.ChatConsumer.as_asgi()),
]
```

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

---

## 5. Views and URLs

```python
# chat/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import Room


def room_list(request):
    rooms = Room.objects.filter(is_private=False).annotate(
        message_count=models.Count('messages')
    ).order_by('-message_count')
    return render(request, 'chat/room_list.html', {'rooms': rooms})


@login_required
def room_detail(request, slug):
    room = get_object_or_404(Room, slug=slug)
    if room.is_private and not room.members.filter(pk=request.user.pk).exists():
        return redirect('chat:room_list')
    room.members.add(request.user)  # auto-join on first visit
    return render(request, 'chat/room.html', {'room': room})
```

---

## 6. JavaScript Chat Client

```html
<!-- templates/chat/room.html -->
<div id="chat-messages" style="height:400px;overflow-y:scroll;"></div>
<div id="typing-indicator" style="height:1.2em;color:gray;"></div>
<form id="chat-form">
    <input id="chat-input" type="text" maxlength="4000" autocomplete="off" />
    <button type="submit">Send</button>
</form>

<script>
const roomSlug = '{{ room.slug }}';
const currentUser = '{{ request.user.username }}';

const ws = new WebSocket(`ws://${window.location.host}/ws/chat/${roomSlug}/`);
const messagesEl = document.getElementById('chat-messages');
const typingEl = document.getElementById('typing-indicator');
let typingTimeout;

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'history') {
        data.messages.forEach(renderMessage);
    } else if (data.type === 'chat.message') {
        renderMessage(data);
    } else if (data.type === 'user.joined') {
        appendSystem(`${data.username} joined`);
    } else if (data.type === 'user.left') {
        appendSystem(`${data.username} left`);
    } else if (data.type === 'user.typing') {
        typingEl.textContent = data.is_typing ? `${data.username} is typing...` : '';
    }
};

document.getElementById('chat-form').onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const body = input.value.trim();
    if (!body) return;
    ws.send(JSON.stringify({ type: 'message', body }));
    input.value = '';
    sendTyping(false);
};

document.getElementById('chat-input').oninput = () => {
    sendTyping(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => sendTyping(false), 2000);
};

function sendTyping(isTyping) {
    ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
}

function renderMessage(msg) {
    const isMine = msg.username === currentUser;
    const p = document.createElement('p');
    p.innerHTML = `<strong>${msg.username}</strong>: ${escapeHtml(msg.body)}
        <small style="color:gray">${new Date(msg.timestamp).toLocaleTimeString()}</small>`;
    p.style.textAlign = isMine ? 'right' : 'left';
    messagesEl.appendChild(p);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendSystem(text) {
    const p = document.createElement('p');
    p.textContent = text;
    p.style.color = 'gray';
    p.style.textAlign = 'center';
    messagesEl.appendChild(p);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}
</script>
```

---

## Quick Reference

| Feature | Code |
|---|---|
| Create app | `python manage.py startapp chat` |
| Room access check | `@database_sync_to_async def can_access_room()` |
| Message persistence | `Message.objects.create(room, author, body)` |
| History on connect | Query last 50 messages, return as JSON `history` event |
| Typing indicator | Broadcast `user.typing` event, auto-clear with setTimeout |
| XSS prevention | `escapeHtml()` in JS before inserting into DOM |
| Online status | `UserOnlineStatus.objects.update_or_create()` |
| Private rooms | `room.is_private` + `room.members.filter(pk=user.pk).exists()` |
