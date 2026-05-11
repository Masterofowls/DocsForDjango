# Middleware and Signals

## Middleware Definition

Middleware is a request/response processing chain around views.

## Middleware Syntax

```python
import time


class RequestTimingMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    start = time.perf_counter()
    response = self.get_response(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response['X-Request-Time-ms'] = f'{elapsed_ms:.2f}'
    return response
```

## Signal Definition

Signals are event hooks emitted by Django or app code.

## Signal Syntax

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Post


@receiver(post_save, sender=Post)
def on_post_saved(sender, instance, created, **kwargs):
  if created:
    # Example: enqueue notification job
    pass
```

## Best Practices

- Keep signals lightweight.
- Move heavy work to async jobs.
- Avoid hidden side effects for critical business logic.
