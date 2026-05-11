---
id: url-routing
slug: /url-routing
sidebar_position: 4
description: "Define URL patterns with path(), re_path(), include(), and custom converters."
---

# URL Routing

## Overview

Django's URL dispatcher maps an incoming request path to the view function or class that handles it.
Understanding URL configuration — from simple paths to namespaced, nested, and dynamically generated
routes — is fundamental to every Django application.

---

## 1. How URL Dispatching Works

When Django receives an HTTP request:

1. Django reads `ROOT_URLCONF` from settings (`config.urls`)
2. Loads `urlpatterns` from that module
3. Iterates the list **in order** until a pattern matches the request path
4. Calls the matched view function with the request and any captured arguments
5. Returns the view's `HttpResponse`

If no pattern matches, Django raises a `404 Not Found`.

---

## 2. `path()` — Simple Patterns

```python
from django.urls import path
from . import views

urlpatterns = [
    # Static path — no variables
    path('about/', views.about, name='about'),

    # Integer capture — passes pk as int
    path('posts/<int:pk>/', views.post_detail, name='post-detail'),

    # String capture (no slashes) — default converter
    path('posts/<str:title>/', views.post_by_title, name='post-title'),

    # Slug capture — letters, numbers, hyphens, underscores
    path('posts/<slug:slug>/', views.post_detail, name='post-detail'),

    # UUID capture
    path('items/<uuid:item_id>/', views.item_detail, name='item-detail'),

    # Path capture — allows forward slashes
    path('files/<path:filepath>/', views.serve_file, name='serve-file'),
]
```

### Built-in path converters

| Converter | Matches | Python type |
|---|---|---|
| `str` | Any non-empty string (no `/`) | `str` |
| `int` | Positive integer | `int` |
| `slug` | Letters, numbers, `-`, `_` | `str` |
| `uuid` | UUID string | `uuid.UUID` |
| `path` | Any non-empty string including `/` | `str` |

---

## 3. `re_path()` — Regex Patterns

Use when `path()` converters are not flexible enough:

```python
from django.urls import re_path

urlpatterns = [
    # Match year/month archives
    re_path(r'^articles/(?P<year>[0-9]{4})/$', views.year_archive, name='year-archive'),
    re_path(r'^articles/(?P<year>[0-9]{4})/(?P<month>[0-9]{2})/$',
            views.month_archive, name='month-archive'),

    # Optional trailing slash
    re_path(r'^search/?$', views.search, name='search'),
]
```

### Named groups (recommended)

```python
# Named: (?P<name>pattern) — view receives keyword arg 'year'
re_path(r'^archive/(?P<year>[0-9]{4})/$', views.archive)

# Unnamed: (pattern) — view receives positional arg
re_path(r'^archive/([0-9]{4})/$', views.archive)
```

Always use named groups — positional args break easily when patterns change.

---

## 4. `include()` — Splitting URL Configs

### Step 1 — Create app-level urls.py

```python
# blog/urls.py
from django.urls import path
from . import views

app_name = 'blog'   # ← required for namespacing

urlpatterns = [
    path('', views.PostListView.as_view(), name='post-list'),
    path('<slug:slug>/', views.PostDetailView.as_view(), name='post-detail'),
    path('create/', views.PostCreateView.as_view(), name='post-create'),
]
```

### Step 2 — Include in root urls.py

```python
# config/urls.py
from django.urls import include, path

urlpatterns = [
    path('blog/', include('blog.urls', namespace='blog')),
    path('users/', include('users.urls', namespace='users')),
    path('api/v1/', include('api.urls', namespace='api-v1')),
]
```

### Result: URL paths

| Pattern | Full URL |
|---|---|
| `blog:post-list` | `/blog/` |
| `blog:post-detail` with `slug='hello'` | `/blog/hello/` |
| `users:profile` | `/users/profile/` |

---

## 5. URL Namespacing

Namespaces let you refer to URLs by name without hardcoding paths, and avoid collisions between apps.

### Defining the namespace

Two ways — prefer the `app_name` approach (simpler):

```python
# blog/urls.py
app_name = 'blog'   # application namespace

urlpatterns = [
    path('<slug:slug>/', views.PostDetailView.as_view(), name='post-detail'),
]
```

Or when including:

```python
path('blog/', include(('blog.urls', 'blog')))
```

### Using namespaced URLs in templates

```html
<a href="{% url 'blog:post-detail' slug=post.slug %}">{{ post.title }}</a>
<a href="{% url 'blog:post-list' %}">All posts</a>
```

### Using namespaced URLs in Python code

```python
from django.urls import reverse
from django.shortcuts import redirect

# Build a URL string
url = reverse('blog:post-detail', kwargs={'slug': 'my-post'})
# → '/blog/my-post/'

# Redirect to a named URL
return redirect('blog:post-list')
return redirect(reverse('blog:post-detail', kwargs={'slug': slug}))
```

---

## 6. Passing Extra Data to Views

### Extra kwargs to the view

```python
path('special/', views.some_view, {'template': 'special.html'}, name='special'),
```

The view receives `template` as a keyword argument:

```python
def some_view(request, template='default.html'):
    return render(request, template)
```

---

## 7. Custom Path Converters

When the built-in converters don't match your use case:

```python
# blog/converters.py
class FourDigitYearConverter:
    regex = r'[0-9]{4}'

    def to_python(self, value: str) -> int:
        return int(value)

    def to_url(self, value: int) -> str:
        return f'{value:04d}'
```

Register and use:

```python
# blog/urls.py
from django.urls import path, register_converter
from . import converters, views

register_converter(converters.FourDigitYearConverter, 'yyyy')

urlpatterns = [
    path('archive/<yyyy:year>/', views.year_archive, name='year-archive'),
]
```

---

## 8. Redirects

### Permanent redirect from old URL to new

```python
from django.views.generic import RedirectView

urlpatterns = [
    # 301 permanent redirect
    path('old-path/', RedirectView.as_view(url='/new-path/', permanent=True)),

    # 302 temporary redirect to named URL
    path('temp/', RedirectView.as_view(pattern_name='blog:post-list')),
]
```

### Redirect with preserved query string

```python
path('search/', RedirectView.as_view(
    url='/new-search/',
    query_string=True,    # appends ?q=... from original request
    permanent=False,
)),
```

---

## 9. Serving Static and Media Files in Development

```python
# config/urls.py
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ...
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## 10. 404 and 500 Custom Pages

### Define custom views

```python
# config/views.py
from django.shortcuts import render

def page_not_found(request, exception):
    return render(request, 'errors/404.html', status=404)

def server_error(request):
    return render(request, 'errors/500.html', status=500)

def permission_denied(request, exception):
    return render(request, 'errors/403.html', status=403)
```

### Wire them in urls.py

```python
# config/urls.py
from . import views

handler404 = 'config.views.page_not_found'
handler500 = 'config.views.server_error'
handler403 = 'config.views.permission_denied'
```

These only take effect when `DEBUG = False`.

---

## 11. URL Patterns for DRF APIs

```python
# api/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('posts', views.PostViewSet, basename='post')
router.register('users', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include('rest_framework.urls')),    # login/logout for browsable API
]
```

---

## 12. URL Testing

```python
# tests/test_urls.py
from django.test import TestCase
from django.urls import reverse, resolve
from blog.views import PostDetailView


class URLTest(TestCase):
    def test_post_detail_resolves(self):
        resolver = resolve('/blog/my-post/')
        self.assertEqual(resolver.view_name, 'blog:post-detail')

    def test_post_detail_reverse(self):
        url = reverse('blog:post-detail', kwargs={'slug': 'my-post'})
        self.assertEqual(url, '/blog/my-post/')

    def test_post_list_returns_200(self):
        response = self.client.get(reverse('blog:post-list'))
        self.assertEqual(response.status_code, 200)
```

---

## 13. Common URL Mistakes

### Missing trailing slash

```python
# Wrong — will redirect to /blog/ when DEBUG is True (annoying in dev)
path('blog', views.blog_list)

# Correct
path('blog/', views.blog_list)
```

Control redirect behaviour via `APPEND_SLASH`:

```python
# settings.py
APPEND_SLASH = True   # default — adds trailing slash and 301s
```

### Forgetting `app_name` for namespacing

```python
# blog/urls.py — must have this for {% url 'blog:...' %} to work
app_name = 'blog'
```

Without `app_name`, `{% url 'blog:post-list' %}` raises `NoReverseMatch`.

---

## Quick Reference

| Task | Code |
|---|---|
| Static path | `path('about/', views.about, name='about')` |
| Integer param | `path('post/<int:pk>/', views.detail)` |
| Slug param | `path('post/<slug:slug>/', views.detail)` |
| Include app URLs | `path('blog/', include('blog.urls'))` |
| Namespace | `app_name = 'blog'` in app urls.py |
| Reverse URL | `reverse('blog:post-list')` |
| Template URL | `{% url 'blog:post-detail' slug=post.slug %}` |
| Redirect view | `RedirectView.as_view(url='/new/')` |
| Custom 404 | `handler404 = 'config.views.page_not_found'` |
