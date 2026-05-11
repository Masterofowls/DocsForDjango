---
id: logging-and-observability
slug: /logging-and-observability
sidebar_position: 33
description: "Django structured logging, error tracking with Sentry, metrics, and health checks."
---

# Logging and Observability

## Overview

Observability in a Django application means being able to understand what is happening in
production at any moment. This guide covers structured logging configuration, error tracking
with Sentry, request-level metrics, health check endpoints, and log aggregation patterns.

---

## 1. Django Logging Configuration

```python
# settings/base.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {name}: {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'filters': {
        'require_debug_false': {'()': 'django.utils.log.RequireDebugFalse'},
        'require_debug_true': {'()': 'django.utils.log.RequireDebugTrue'},
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'console_prod': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'json',   # structured JSON for log aggregators
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
            'include_html': True,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['mail_admins', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',            # set to WARNING in production
            'propagate': False,
        },
        'myapp': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

---

## 2. Structured Logging in Code

```python
import logging
import structlog     # pip install structlog

logger = logging.getLogger(__name__)


# Basic Python logging
def process_order(order_id: int):
    logger.info('Processing order', extra={'order_id': order_id})
    try:
        order = Order.objects.get(pk=order_id)
        logger.debug('Order loaded', extra={'order_id': order_id, 'status': order.status})
        # ... process ...
        logger.info('Order processed', extra={
            'order_id': order_id,
            'total': str(order.total_price),
            'user_id': order.user_id,
        })
    except Order.DoesNotExist:
        logger.error('Order not found', extra={'order_id': order_id})
        raise
    except Exception as exc:
        logger.exception('Unexpected error processing order', extra={'order_id': order_id})
        raise
```

---

## 3. Sentry Error Tracking

```bash
pip install sentry-sdk
```

```python
# settings/production.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_sdk.init(
    dsn=env('SENTRY_DSN'),
    integrations=[
        DjangoIntegration(
            transaction_style='url',
            middleware_spans=True,
            signals_spans=True,
            cache_spans=True,
        ),
        LoggingIntegration(
            level=logging.INFO,       # capture INFO and above as breadcrumbs
            event_level=logging.ERROR,  # send ERROR and above as Sentry events
        ),
        CeleryIntegration(),
    ],
    traces_sample_rate=0.1,    # 10% of transactions for performance monitoring
    profiles_sample_rate=0.1,  # 10% of transactions for profiling
    environment=env('ENVIRONMENT', default='production'),
    send_default_pii=False,    # never send PII by default
    before_send=filter_sensitive_data,
)
```

```python
# Scrub sensitive fields before sending to Sentry
def filter_sensitive_data(event, hint):
    if 'request' in event:
        headers = event['request'].get('headers', {})
        for key in ('Authorization', 'Cookie', 'Set-Cookie'):
            if key in headers:
                headers[key] = '[Filtered]'
    return event
```

---

## 4. Request Logging Middleware

```python
# core/middleware.py
import time
import uuid
import logging

logger = logging.getLogger('requests')


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = str(uuid.uuid4())[:8]
        request.request_id = request_id
        start = time.monotonic()

        response = self.get_response(request)

        duration_ms = round((time.monotonic() - start) * 1000)
        user_id = request.user.pk if hasattr(request, 'user') and request.user.is_authenticated else None

        logger.info('Request', extra={
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': duration_ms,
            'user_id': user_id,
            'ip': self.get_client_ip(request),
        })
        return response

    @staticmethod
    def get_client_ip(request):
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
```

```python
# settings.py
MIDDLEWARE = [
    ...
    'core.middleware.RequestLoggingMiddleware',
]
```

---

## 5. Health Check Endpoint

```python
# core/views.py
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import time


def health_check(request):
    checks = {}
    status = 200

    # Database
    try:
        start = time.monotonic()
        connection.ensure_connection()
        checks['database'] = {'status': 'ok', 'latency_ms': round((time.monotonic() - start) * 1000)}
    except Exception as exc:
        checks['database'] = {'status': 'error', 'detail': str(exc)}
        status = 503

    # Cache
    try:
        start = time.monotonic()
        cache.set('health_check', 'ok', timeout=10)
        assert cache.get('health_check') == 'ok'
        checks['cache'] = {'status': 'ok', 'latency_ms': round((time.monotonic() - start) * 1000)}
    except Exception as exc:
        checks['cache'] = {'status': 'error', 'detail': str(exc)}
        status = 503

    return JsonResponse(
        {'status': 'healthy' if status == 200 else 'degraded', 'checks': checks},
        status=status,
    )
```

```python
# urls.py
path('health/', views.health_check, name='health_check'),
```

---

## 6. JSON Structured Logging (production)

```bash
pip install python-json-logger
```

```python
# settings/production.py — override LOGGING to use JSON formatter everywhere
LOGGING = {
    ...
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
}
```

JSON logs are easily ingested by Datadog, Papertrail, Loggly, AWS CloudWatch, and Elasticsearch.

---

## Quick Reference

| Need | Tool / Pattern |
|---|---|
| Basic logging | `logging.getLogger(__name__)` |
| Structured JSON logs | `python-json-logger` formatter |
| Error tracking + alerting | Sentry SDK with `DjangoIntegration` |
| Request-level trace | `RequestLoggingMiddleware` |
| Health endpoint | `/health/` view checking DB + cache |
| DB query logging | `django.db.backends` logger at DEBUG |
| Slow query analysis | `django.db.backends` + connection.queries |
| Log rotation | `RotatingFileHandler(maxBytes=10MB, backupCount=5)` |
| Email on 500 | `mail_admins` handler on `django.request` at ERROR |
| Scrub PII in Sentry | `before_send` callback filtering headers |
