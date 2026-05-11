# WebSockets with Channels

## Definition

Django Channels extends Django for protocols like WebSockets and background
events with ASGI.

## Install

```powershell
python -m pip install channels
```

## Settings

```python
INSTALLED_APPS = [
  # ...
  'channels',
]

ASGI_APPLICATION = 'config.asgi.application'
```

## Consumer Syntax

```python
from channels.generic.websocket import AsyncWebsocketConsumer
import json


class ChatConsumer(AsyncWebsocketConsumer):
  async def connect(self):
    await self.accept()

  async def receive(self, text_data):
    data = json.loads(text_data)
    await self.send(text_data=json.dumps({'echo': data}))
```

## Routing Syntax

```python
from django.urls import re_path
from .consumers import ChatConsumer

websocket_urlpatterns = [
  re_path(r'ws/chat/$', ChatConsumer.as_asgi()),
]
```
