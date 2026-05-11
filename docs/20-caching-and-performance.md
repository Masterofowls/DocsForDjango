# Caching and Performance

## Definition

Caching avoids repeated expensive computation and database work.

## Cache Backend Syntax

```python
CACHES = {
  'default': {
    'BACKEND': 'django.core.cache.backends.redis.RedisCache',
    'LOCATION': 'redis://127.0.0.1:6379/1',
  },
}
```

## Per-View Cache Syntax

```python
from django.views.decorators.cache import cache_page


@cache_page(60 * 5)
def homepage(request):
  ...
```

## Query Performance

- use `select_related` for FK joins
- use `prefetch_related` for M2M and reverse relations
- add indexes for frequent filters
- profile with debug toolbar in dev

## Pagination Example

```python
from django.core.paginator import Paginator

paginator = Paginator(Post.objects.filter(is_published=True), 20)
page_obj = paginator.get_page(request.GET.get('page'))
```
