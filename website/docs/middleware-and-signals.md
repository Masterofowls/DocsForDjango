---
id: middleware-and-signals
slug: /middleware-and-signals
sidebar_position: 17
description: "Django middleware pipeline, writing custom middleware, signals, and best practices."
---

# Middleware and Signals

## Overview

**Middleware** sits between the WSGI server and your views, processing every request and response.
**Signals** allow decoupled components to be notified when specific actions occur. Both are powerful
extension points for cross-cutting concerns like logging, authentication, and side effects.

---

## 1. The Middleware Stack

Middleware runs in order on the way in (request) and in reverse order on the way out (response).

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',        # 1st in, 1st out
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware', # last in, last out
]
```

Request flow: SecurityMiddleware → SessionMiddleware → ... → view → ... → SecurityMiddleware

---

## 2. Writing Middleware

### Function-based middleware (recommended)

```python
# myapp/middleware.py
import time
import logging

logger = logging.getLogger(__name__)


def timing_middleware(get_response):
    """Log the time taken to process each request."""
    def middleware(request):
        start = time.perf_counter()
        response = get_response(request)
        duration = time.perf_counter() - start
        logger.info(
            '%s %s took %.3fs → %s',
            request.method, request.path, duration, response.status_code
        )
        return response
    return middleware
```

```python
# settings.py — add to MIDDLEWARE
MIDDLEWARE = [
    ...
    'myapp.middleware.timing_middleware',
]
```

### Class-based middleware

```python
class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response   # called once on startup

    def __call__(self, request):
        # Code runs BEFORE the view (and later middleware)
        request._start_time = time.perf_counter()

        response = self.get_response(request)   # call view + remaining middleware

        # Code runs AFTER the view (and after later middleware)
        duration = time.perf_counter() - request._start_time
        response['X-Request-Duration'] = f'{duration:.3f}s'
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        """Called just before the view is called. Return None to continue."""
        return None

    def process_exception(self, request, exception):
        """Called if the view raises an exception. Return a response to handle it."""
        return None

    def process_template_response(self, request, response):
        """Called if the response has a render() method. Must return a response."""
        return response
```

---

## 3. Practical Middleware Examples

### Maintenance mode

```python
from django.http import HttpResponse


def maintenance_middleware(get_response):
    def middleware(request):
        from django.conf import settings
        if getattr(settings, 'MAINTENANCE_MODE', False):
            if not request.path.startswith('/admin/'):
                return HttpResponse(
                    '<h1>Under maintenance. Back soon!</h1>',
                    status=503,
                    content_type='text/html',
                )
        return get_response(request)
    return middleware
```

### Subdomain routing

```python
def subdomain_middleware(get_response):
    def middleware(request):
        host = request.get_host()
        subdomain = host.split('.')[0]
        request.subdomain = subdomain
        return get_response(request)
    return middleware
```

### HTTPS redirect (production)

```python
# Already handled by django.middleware.security.SecurityMiddleware
# settings.py
SECURE_SSL_REDIRECT = True          # redirect HTTP → HTTPS
SECURE_HSTS_SECONDS = 31536000      # 1 year HSTS header
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

---

## 4. Django Signals

Signals let senders notify a set of receivers when an action occurs.

### Built-in model signals

```python
from django.db.models.signals import (
    pre_save, post_save,     # before/after model.save()
    pre_delete, post_delete, # before/after model.delete()
    m2m_changed,             # M2M field changed
)
from django.db.models.signals import post_migrate  # after migrations
from django.core.signals import request_started, request_finished
from django.test.signals import setting_changed
```

### Connecting signals

```python
# blog/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Post


@receiver(post_save, sender=Post)
def on_post_saved(sender, instance, created, **kwargs):
    """Send notification email when a post is published."""
    if created:
        # Post was just created
        instance.generate_slug()
    elif instance.status == 'published' and instance.tracker.has_changed('status'):
        # Post was just published
        send_subscriber_notifications(instance)
```

### Register signals via AppConfig

```python
# blog/apps.py
from django.apps import AppConfig


class BlogConfig(AppConfig):
    name = 'blog'

    def ready(self):
        import blog.signals  # noqa: F401 — connects signal receivers
```

```python
# blog/__init__.py
default_app_config = 'blog.BlogConfig'
```

---

## 5. Custom Signals

Define your own signals for application-level events:

```python
# blog/signals.py
from django.dispatch import Signal

post_published = Signal()        # arguments: post
post_unpublished = Signal()


# In your view or model method:
def publish(self):
    self.status = 'published'
    self.save()
    post_published.send(sender=self.__class__, post=self)


# Receiver:
from django.dispatch import receiver
from .signals import post_published


@receiver(post_published)
def on_post_published(sender, post, **kwargs):
    notify_subscribers(post)
    invalidate_cache(post)
    post_to_social_media(post)
```

---

## 6. Common Signal Patterns

### Auto-create profile on user creation

```python
# accounts/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
```

### Invalidate cache on save

```python
from django.core.cache import cache


@receiver(post_save, sender=Post)
def invalidate_post_cache(sender, instance, **kwargs):
    cache.delete(f'post:{instance.pk}')
    cache.delete('post:list')
```

### Audit log

```python
# audit/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import AuditLog


def log_action(action, instance):
    AuditLog.objects.create(
        model_name=instance.__class__.__name__,
        object_id=instance.pk,
        action=action,
        timestamp=timezone.now(),
    )


@receiver(post_save)
def audit_save(sender, instance, created, **kwargs):
    if sender._meta.app_label not in ('audit', 'admin'):
        log_action('create' if created else 'update', instance)


@receiver(post_delete)
def audit_delete(sender, instance, **kwargs):
    if sender._meta.app_label not in ('audit', 'admin'):
        log_action('delete', instance)
```

---

## 7. Signal Best Practices

- Register receivers in `AppConfig.ready()` — never at module top-level
- Always use `sender=MyModel` to avoid receiving signals from all models
- Keep receivers thin — call service functions, do not embed logic in receivers
- Avoid triggering more signals inside a receiver (causes cascades)
- Use `dispatch_uid` to prevent duplicate receivers on server restart:

```python
@receiver(post_save, sender=Post, dispatch_uid='blog.signals.invalidate_cache')
def invalidate_post_cache(sender, instance, **kwargs): ...
```

---

## Quick Reference

| Task | Code |
|---|---|
| Function middleware | `def mw(get_response): def inner(req): ... return inner` |
| Class middleware | `class Mw: def __init__(self, gr): ... def __call__(self, r):` |
| Add to stack | `MIDDLEWARE = [..., 'app.middleware.MyMiddleware']` |
| Model signal | `@receiver(post_save, sender=Model)` |
| Custom signal | `sig = Signal(); sig.send(sender=Cls, ...)` |
| Register in AppConfig | `AppConfig.ready(): import app.signals` |
| Prevent duplicate | `dispatch_uid='unique.string'` |
