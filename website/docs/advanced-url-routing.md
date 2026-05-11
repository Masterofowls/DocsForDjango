---
id: advanced-url-routing
slug: /advanced-url-routing
sidebar_position: 12
description: "Advanced URL patterns, custom converters, reverse resolution, namespacing, and route optimisation."
---

# Advanced URL Routing

## Overview

Beyond the basics of `path()` and `include()`, Django's URL system supports custom converters,
conditional routing, versioned APIs, i18n URL patterns, and more. This guide covers the advanced
features you need for production routing.

---

## 1. Path Converters — Full Reference

Built-in converters:

| Converter | Matches | Python type |
|---|---|---|
| `<str:name>` | Any non-empty string, no slash | `str` |
| `<int:pk>` | One or more digits | `int` |
| `<slug:slug>` | Alphanumeric, hyphens, underscores | `str` |
| `<uuid:id>` | Formatted UUID `8-4-4-4-12` | `uuid.UUID` |
| `<path:file>` | Any string including slashes | `str` |

```python
from django.urls import path

urlpatterns = [
    path('users/<int:pk>/', views.user_detail),
    path('posts/<slug:slug>/', views.post_detail),
    path('files/<path:file_path>/', views.serve_file),  # path allows slashes
    path('orders/<uuid:order_id>/', views.order_detail),
]
```

---

## 2. Custom Path Converters

Create a converter class with `regex`, `to_python`, and `to_url` methods:

```python
# myapp/converters.py
class FourDigitYearConverter:
    regex = r'\d{4}'   # raw string — no < >

    def to_python(self, value: str) -> int:
        return int(value)

    def to_url(self, value: int) -> str:
        return str(value)


class SlugOrIdConverter:
    """Match either a slug or a numeric ID."""
    regex = r'[0-9]+|[a-z0-9-]+'

    def to_python(self, value: str):
        try:
            return int(value)
        except ValueError:
            return value

    def to_url(self, value) -> str:
        return str(value)
```

Register and use:

```python
# config/urls.py
from django.urls import register_converter, path
from myapp.converters import FourDigitYearConverter

register_converter(FourDigitYearConverter, 'yyyy')

urlpatterns = [
    path('archive/<yyyy:year>/', views.archive, name='archive'),
]
```

---

## 3. Regular Expression URLs

Use `re_path()` when path converters aren't flexible enough:

```python
from django.urls import re_path

urlpatterns = [
    # Named groups
    re_path(r'^articles/(?P<year>[0-9]{4})/(?P<month>[0-9]{2})/$',
            views.archive_month),

    # Optional trailing slash
    re_path(r'^about/?$', views.about),

    # Format extensions (.json, .xml)
    re_path(r'^api/posts\.(?P<format>json|xml)$', views.api_posts),

    # Article with title in multiple parts
    re_path(r'^wiki/(?P<title>[^/]+(?:/[^/]+)*)$', views.wiki_page),
]
```

---

## 4. URL Namespacing

Namespaces prevent name collisions when multiple apps define views with the same name.

### App namespace

```python
# blog/urls.py
app_name = 'blog'

urlpatterns = [
    path('', views.post_list, name='post-list'),
    path('<slug:slug>/', views.post_detail, name='post-detail'),
    path('create/', views.post_create, name='post-create'),
]
```

### Instance namespace (for multiple includes of the same app)

```python
# config/urls.py
urlpatterns = [
    path('en/blog/', include(('blog.urls', 'blog'), namespace='blog-en')),
    path('fr/blog/', include(('blog.urls', 'blog'), namespace='blog-fr')),
]
```

### Reversing namespaced URLs

```python
# In views
from django.urls import reverse
url = reverse('blog:post-detail', kwargs={'slug': post.slug})

# In templates
{% url 'blog:post-detail' slug=post.slug %}

# Instance namespace
{% url 'blog-en:post-list' %}
```

---

## 5. `include()` Patterns

### Include by path

```python
# config/urls.py
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('blog/', include('blog.urls')),
    path('api/v1/', include('api.v1.urls')),
    path('accounts/', include('django.contrib.auth.urls')),
]
```

### Include a list of patterns inline

```python
extra_patterns = [
    path('reports/', views.reports),
    path('export/', views.export),
]

urlpatterns = [
    path('dashboard/', include(extra_patterns)),
]
```

### Nested namespaces

```python
urlpatterns = [
    path('api/', include([
        path('v1/', include('api.v1.urls', namespace='api-v1')),
        path('v2/', include('api.v2.urls', namespace='api-v2')),
    ])),
]
```

---

## 6. `reverse()` and `reverse_lazy()`

```python
from django.urls import reverse, reverse_lazy

# Basic reverse
url = reverse('blog:post-list')            # '/blog/'
url = reverse('blog:post-detail', args=[slug])
url = reverse('blog:post-detail', kwargs={'slug': slug})

# With query string (manual)
url = reverse('blog:post-list') + '?page=2&status=published'

# reverse_lazy — used in class attributes (class body evaluated before URLconf is loaded)
from django.views.generic.edit import CreateView

class PostCreateView(CreateView):
    success_url = reverse_lazy('blog:post-list')   # safe at class definition time
```

---

## 7. URL Patterns with Extra Arguments

Pass extra keyword arguments to any view:

```python
urlpatterns = [
    path('special/', views.page, {'template': 'special.html'}, name='special'),
    path('archived/<int:pk>/', views.post_detail, {'archived': True}),
]
```

View receives them alongside URL captures:

```python
def page(request, template='default.html'):
    return render(request, template, {})
```

---

## 8. Redirects in URL Configuration

```python
from django.views.generic import RedirectView

urlpatterns = [
    # Permanent redirect (301)
    path('old-blog/', RedirectView.as_view(url='/blog/', permanent=True)),

    # Redirect to named URL
    path('home/', RedirectView.as_view(pattern_name='index', permanent=False)),

    # Preserve URL query string
    path('search/', RedirectView.as_view(
        url='/new-search/',
        permanent=False,
        query_string=True,      # append original ?q=... to new URL
    )),
]
```

---

## 9. i18n URL Patterns

```python
# settings.py
USE_I18N = True
LANGUAGE_CODE = 'en'
LANGUAGES = [('en', 'English'), ('fr', 'French'), ('de', 'German')]

# config/urls.py
from django.conf.urls.i18n import i18n_patterns
from django.utils.translation import gettext_lazy as _

urlpatterns = [
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),
] + i18n_patterns(
    path('', views.home, name='home'),
    path(_('about/'), views.about, name='about'),
    prefix_default_language=False,  # / instead of /en/ for default
)
```

Generates URLs like `/about/`, `/fr/about/`, `/de/about/`.

---

## 10. Testing URL Patterns

```python
# tests/test_urls.py
from django.test import TestCase, Client
from django.urls import reverse, resolve


class URLTests(TestCase):
    def test_post_list_url_resolves(self):
        view = resolve('/blog/')
        self.assertEqual(view.view_name, 'blog:post-list')

    def test_post_list_accessible(self):
        response = self.client.get(reverse('blog:post-list'))
        self.assertEqual(response.status_code, 200)

    def test_nonexistent_url_returns_404(self):
        response = self.client.get('/does-not-exist/')
        self.assertEqual(response.status_code, 404)

    def test_redirect_url(self):
        response = self.client.get('/old-blog/')
        self.assertRedirects(response, '/blog/', status_code=301)
```

---

## 11. Common Patterns

### Versioned API URLs

```python
# config/urls.py
urlpatterns = [
    path('api/v1/', include('api.urls', namespace='api-v1')),
]

# api/urls.py
app_name = 'api-v1'
urlpatterns = [
    path('posts/', PostListAPIView.as_view(), name='post-list'),
    path('posts/<int:pk>/', PostDetailAPIView.as_view(), name='post-detail'),
]
```

### Catch-all for SPA

```python
# Serve React/Vue app for all unmatched paths
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    # SPA catch-all — must be last
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html')),
]
```

---

## Quick Reference

| Task | Code |
|---|---|
| Integer capture | `path('items/<int:pk>/', view)` |
| Slug capture | `path('posts/<slug:slug>/', view)` |
| Regex pattern | `re_path(r'^year/(?P<yr>\d{4})/$', view)` |
| Custom converter | `register_converter(MyConverter, 'name')` |
| Namespace | `app_name = 'blog'` in urls.py |
| Reverse in view | `reverse('blog:post-detail', kwargs={'slug': s})` |
| Reverse in template | `{% url 'blog:post-detail' slug=post.slug %}` |
| Reverse lazy | `success_url = reverse_lazy('blog:list')` |
| Redirect in urls | `RedirectView.as_view(url='/new/')` |
| Extra kwargs | `path('x/', view, {'key': 'val'})` |
