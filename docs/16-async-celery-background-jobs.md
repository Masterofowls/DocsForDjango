# Async, Celery, and Background Jobs

## Definition

Use async views for non-blocking I/O and Celery for long-running background
work that should not block request-response cycles.

## Async View Syntax

```python
from django.http import JsonResponse


async def status(request):
  return JsonResponse({'service': 'ok'})
```

## Celery Setup (Concept)

Install:

```powershell
python -m pip install celery redis
```

Task example:

```python
from celery import shared_task


@shared_task
def send_welcome_email(user_id):
  # send email via SMTP provider
  return user_id
```

Trigger from view:

```python
send_welcome_email.delay(request.user.id)
```

## Best Practices

- Keep tasks idempotent.
- Add retry policies.
- Separate critical and non-critical queues.
