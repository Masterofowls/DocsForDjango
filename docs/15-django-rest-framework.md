# Django REST Framework

## Definition

DRF adds API primitives: serializers, viewsets, routers, permissions,
authentication classes, pagination, and schema support.

## Install

```powershell
python -m pip install djangorestframework
```

## Settings

```python
INSTALLED_APPS = [
  # ...
  'rest_framework',
]
```

## Serializer Syntax

```python
from rest_framework import serializers


class PostSerializer(serializers.ModelSerializer):
  class Meta:
    model = Post
    fields = ['id', 'title', 'slug', 'body', 'created_at']
```

## ViewSet Syntax

```python
from rest_framework.viewsets import ModelViewSet


class PostViewSet(ModelViewSet):
  serializer_class = PostSerializer

  def get_queryset(self):
    return Post.objects.filter(is_published=True)
```

## Router Syntax

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('posts', PostViewSet, basename='post')
urlpatterns = router.urls
```
