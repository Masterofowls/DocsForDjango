---
id: caching-and-performance
slug: /caching-and-performance
sidebar_position: 32
description: "Django caching with Redis, per-view and template fragment caching, and database query optimisation."
---

# Caching and Performance

## Overview

Performance improvements in Django fall into three categories: database query optimisation, caching
(memory-based), and HTTP-level response caching. This guide covers all three with Redis as the
cache backend, ORM query analysis, and strategies for high-traffic scenarios.

---

## 1. Cache Backend Configuration

### Redis (recommended for production)

```bash
pip install django-redis
```

```python
# settings/production.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'mysite',
        'TIMEOUT': 300,  # 5 minutes default
    }
}

# Use Redis for sessions too
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

### Local memory (development)

```python
# settings/development.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
```

---

## 2. Per-View Caching

```python
# views.py
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie, vary_on_headers

# Cache for 15 minutes — public, same response for everyone
@cache_page(60 * 15)
def product_list(request):
    products = Product.objects.filter(is_active=True)
    return render(request, 'store/product_list.html', {'products': products})

# Vary cache by user cookie (logged-in vs anonymous)
@cache_page(60 * 15)
@vary_on_cookie
def dashboard(request):
    ...
```

Cache in URL configuration (preferred for class-based views):

```python
# urls.py
from django.views.decorators.cache import cache_page
from .views import ProductListView

urlpatterns = [
    path('products/', cache_page(60 * 15)(ProductListView.as_view()), name='product_list'),
]
```

---

## 3. Low-Level Cache API

```python
from django.core.cache import cache

# Set with expiry
cache.set('product_count', Product.objects.count(), timeout=300)

# Get with fallback
count = cache.get('product_count')
if count is None:
    count = Product.objects.count()
    cache.set('product_count', count, timeout=300)

# get_or_set is the idiomatic one-liner
count = cache.get_or_set('product_count', Product.objects.count, 300)

# Delete
cache.delete('product_count')

# Multiple keys at once
cache.set_many({'key1': 'val1', 'key2': 'val2'}, timeout=300)
results = cache.get_many(['key1', 'key2'])

# Invalidate by prefix (requires django-redis)
from django_redis import get_redis_connection
con = get_redis_connection('default')
keys = con.keys('mysite:product_*')
if keys:
    con.delete(*keys)
```

---

## 4. Template Fragment Caching

```html
{% load cache %}

<!-- Cache sidebar for 30 minutes, vary by nothing -->
{% cache 1800 sidebar %}
    {% include "partials/sidebar.html" %}
{% endcache %}

<!-- Cache per-user navigation -->
{% cache 1800 user_nav request.user.pk %}
    {% include "partials/user_nav.html" %}
{% endcache %}

<!-- Cache product card by product id -->
{% cache 3600 product_card product.pk %}
    {% include "store/product_card.html" with product=product %}
{% endcache %}
```

---

## 5. Database Query Optimisation

### select_related and prefetch_related

```python
# N+1 problem — one query per post.author
posts = Post.objects.all()
for post in posts:
    print(post.author.username)  # NEW query each time

# select_related — JOIN for ForeignKey / OneToOne
posts = Post.objects.select_related('author', 'category').all()

# prefetch_related — separate query for ManyToMany / reverse FK
posts = Post.objects.prefetch_related('tags', 'comments').all()

# Combine both
posts = (
    Post.objects
    .select_related('author', 'category')
    .prefetch_related('tags')
    .filter(status=Post.PUBLISHED)
)
```

### Defer and only

```python
# Load only needed fields (smaller row, less memory)
posts = Post.objects.only('id', 'title', 'slug', 'created_at')

# Exclude expensive fields
posts = Post.objects.defer('body')  # skip large TextField
```

### Query analysis

```bash
# Django Debug Toolbar shows SQL queries in browser during development
pip install django-debug-toolbar
```

```python
# Check queries in tests or shell
from django.db import connection, reset_queries
from django.conf import settings
settings.DEBUG = True

reset_queries()
list(Post.objects.select_related('author').filter(status='published'))
print(f'{len(connection.queries)} queries:')
for q in connection.queries:
    print(q['sql'][:120])
```

### Explain / Analyze

```python
# Show PostgreSQL query plan
qs = Post.objects.filter(status='published').select_related('author')
print(qs.explain(verbose=True, analyze=True))
```

---

## 6. Database-Level Indexes

```python
# models.py
class Post(models.Model):
    status = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),     # composite
            models.Index(fields=['-created_at']),               # descending
            models.Index(
                fields=['status'],
                condition=models.Q(status='published'),         # partial index
                name='published_posts_idx',
            ),
        ]
```

---

## 7. Caching Patterns for APIs

```python
# Cache DRF list responses with cache_page
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

@method_decorator(cache_page(60 * 5), name='list')
class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
```

---

## Quick Reference

| Technique | Code |
|---|---|
| Per-view cache | `@cache_page(seconds)` |
| Cache per user | `@cache_page` + `@vary_on_cookie` |
| Template fragment | `{% cache seconds cache_key %}` |
| Low-level get/set | `cache.get_or_set('key', callable, timeout)` |
| Fix N+1 FK | `.select_related('author')` |
| Fix N+1 M2M | `.prefetch_related('tags')` |
| Defer large field | `.defer('body')` |
| Composite index | `models.Index(fields=['status', 'created_at'])` |
| Partial index | `models.Index(condition=Q(status='published'), ...)` |
| Query count | `len(connection.queries)` after `reset_queries()` |
| Query plan | `qs.explain(verbose=True, analyze=True)` |
