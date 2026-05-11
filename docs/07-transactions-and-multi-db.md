# Transactions and Multi-Database

## Definition

Transactions ensure related write operations are atomic.

## Atomic Syntax

```python
from django.db import transaction


@transaction.atomic
def publish_post(post):
  post.is_published = True
  post.save(update_fields=['is_published'])
```

## Row Locking

```python
with transaction.atomic():
  post = Post.objects.select_for_update().get(pk=1)
  post.views += 1
  post.save(update_fields=['views'])
```

## Multi-Database Settings

```python
DATABASES = {
  'default': {...},
  'analytics': {...},
}
```

Query against a specific DB:

```python
Post.objects.using('analytics').filter(is_published=True)
```

## Router Skeleton

```python
class AnalyticsRouter:
  def db_for_read(self, model, **hints):
    if model._meta.app_label == 'analytics':
      return 'analytics'
    return None
```
