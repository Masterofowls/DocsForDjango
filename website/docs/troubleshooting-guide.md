---
id: troubleshooting-guide
slug: /troubleshooting-guide
sidebar_position: 36
description: "Django troubleshooting: common errors, debugging tools, query analysis, and error patterns."
---

# Troubleshooting Guide

## Overview

This guide catalogs the most common Django errors and their root causes, plus tools and
techniques for systematic debugging — from reading tracebacks to analysing slow queries
and diagnosing production issues without `DEBUG=True`.

---

## 1. Reading Tracebacks

Django tracebacks read bottom-up. The last frame is where the error occurred.

```
Traceback (most recent call last):
  File "django/core/handlers/exception.py", line 55, in inner
    response = get_response(request)
  ...
  File "blog/views.py", line 24, in post_detail    <-- YOUR CODE
    post = Post.objects.get(pk=pk)
  File "django/db/models/query.py", line 637, in get
    raise self.model.DoesNotExist(...)
blog.models.Post.DoesNotExist: Post matching query does not exist.
```

Key information: exception type, message, and the line in your code that triggered it.

---

## 2. Common Errors

### `DoesNotExist`

```python
# PROBLEM
post = Post.objects.get(pk=99)  # raises if not found

# FIX 1 — use get_object_or_404 in views
from django.shortcuts import get_object_or_404
post = get_object_or_404(Post, pk=pk)

# FIX 2 — use filter + first
post = Post.objects.filter(pk=pk).first()  # returns None if not found
```

### `MultipleObjectsReturned`

```python
# PROBLEM — more than one row matches
post = Post.objects.get(status='published')   # fails if >1 published

# FIX — be more specific or use filter().first()
post = Post.objects.filter(status='published').order_by('-created_at').first()
```

### `IntegrityError: NOT NULL / UNIQUE constraint`

```
django.db.utils.IntegrityError: UNIQUE constraint failed: blog_post.slug
```

```python
# FIX — check uniqueness before saving or use get_or_create
post, created = Post.objects.get_or_create(
    slug=slug,
    defaults={'title': title, 'author': user},
)
```

### `ImproperlyConfigured` / `AppRegistryNotReady`

```
django.core.exceptions.ImproperlyConfigured: ...
```

Most common causes:
1. `DJANGO_SETTINGS_MODULE` not set before importing models
2. Calling `django.setup()` missing in standalone scripts

```python
# standalone_script.py
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from blog.models import Post   # safe to import after setup()
```

### `OperationalError: no such table`

Migrations have not been run:

```bash
python manage.py showmigrations   # shows pending migrations
python manage.py migrate          # apply all
```

### `TemplateDoesNotExist`

```
django.template.exceptions.TemplateDoesNotExist: blog/post_detail.html
```

Check:
1. `TEMPLATES[0]['DIRS']` includes the template root
2. `APP_DIRS: True` (to find `app/templates/app/...`)
3. Template path matches exactly (case-sensitive on Linux)

```python
# settings.py
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],   # global templates folder
    'APP_DIRS': True,                   # app-level templates
    ...
}]
```

### `CSRF verification failed`

```
403 Forbidden: CSRF verification failed. Request aborted.
```

Ensure:
- `{% csrf_token %}` inside all `<form>` elements
- `CsrfViewMiddleware` in `MIDDLEWARE`
- AJAX requests send `X-CSRFToken` header

```html
<form method="post" action="{% url 'blog:post_create' %}">
    {% csrf_token %}
    ...
</form>
```

---

## 3. Debug Toolbar

```bash
pip install django-debug-toolbar
```

```python
# settings/development.py
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
INTERNAL_IPS = ['127.0.0.1']

# urls.py (project)
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
```

The toolbar shows: SQL queries, timings, templates used, cache hits, and signal activity.

---

## 4. Query Debugging

```python
# Django shell
from django.db import connection, reset_queries
from django.conf import settings
settings.DEBUG = True

reset_queries()
list(Post.objects.filter(status='published').select_related('author'))
print(f'{len(connection.queries)} queries')
for q in connection.queries:
    print(f"{q['time']}s  {q['sql'][:100]}")
```

Detect N+1 issues:

```python
# N+1: 1 query for posts + 1 per post for author
posts = Post.objects.all()[:10]
for p in posts:
    print(p.author.username)   # triggers extra query each time
```

Fix:

```python
posts = Post.objects.select_related('author').all()[:10]
```

---

## 5. Production Debugging (without DEBUG=True)

```bash
# View application logs
journalctl -u mysite -f --since "10 minutes ago"

# Django management shell on server
python manage.py shell

# Check for errors in Sentry (or similar)
# Check Redis connection
python manage.py shell -c "from django.core.cache import cache; print(cache.get('test') or cache.set('test', 1, 10))"

# Test database connectivity
python manage.py dbshell

# Run deploy check
python manage.py check --deploy
```

---

## 6. Migration Troubleshooting

```bash
# Show all migration state
python manage.py showmigrations

# Print SQL for a migration without running it
python manage.py sqlmigrate blog 0003

# Detect issues in migration history
python manage.py migrate --check

# Roll back one migration
python manage.py migrate blog 0002

# Fake a migration as applied (schema changed manually)
python manage.py migrate blog 0003 --fake
```

---

## 7. Static Files Issues

```bash
# Collect static files
python manage.py collectstatic --noinput

# Check where Django looks for statics
python manage.py findstatic admin/css/base.css
```

Common production issues:
- `STATIC_ROOT` not set → `collectstatic` has nowhere to put files
- Nginx not serving `/static/` or URL doesn't match `STATIC_URL`
- `ManifestStaticFilesStorage` hash mismatch after partial deploy (fix: clear and recollect)

---

## Quick Reference

| Error | Fix |
|---|---|
| `DoesNotExist` | Use `get_object_or_404` or `.filter().first()` |
| `MultipleObjectsReturned` | Add `.filter()` with more fields |
| `IntegrityError UNIQUE` | Use `get_or_create`, or check before saving |
| `AppRegistryNotReady` | Call `django.setup()` before model imports |
| No such table | Run `python manage.py migrate` |
| `TemplateDoesNotExist` | Check `TEMPLATES DIRS` and `APP_DIRS=True` |
| CSRF 403 | Add `{% csrf_token %}` to form |
| N+1 queries | Add `select_related` or `prefetch_related` |
| Debug queries | `reset_queries()` + `connection.queries` |
| Slow view | Add `django-debug-toolbar`; check SQL panel |
| Production error | `journalctl -u mysite -f`; check Sentry |
