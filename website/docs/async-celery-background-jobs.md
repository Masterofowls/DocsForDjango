---
id: async-celery-background-jobs
slug: /async-celery-background-jobs
sidebar_position: 21
description: "Background tasks with Celery, Redis broker, periodic tasks, and monitoring."
---

# Async and Celery Background Jobs

## Overview

Celery is the standard library for background task processing in Django. It lets you offload slow
operations (email sending, report generation, image processing) to worker processes, keeping your
HTTP responses fast. This guide covers setup, writing tasks, chaining, periodic tasks, and monitoring.

---

## 1. Installation and Setup

```powershell
pip install celery redis django-celery-beat django-celery-results
```

### Broker — Redis

```powershell
# Install Redis (Windows via Scoop)
scoop install redis
redis-server          # start broker
```

```python
# settings.py
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'django-db'          # stores results in database
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True             # track STARTED state
CELERY_TASK_TIME_LIMIT = 300                 # kill tasks after 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 240            # raise exception at 4 minutes

# For periodic tasks
INSTALLED_APPS += ['django_celery_beat', 'django_celery_results']
```

### celery.py

```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()        # finds tasks.py in all INSTALLED_APPS
```

```python
# config/__init__.py
from .celery import app as celery_app
__all__ = ['celery_app']
```

### Apply migrations

```powershell
python manage.py migrate      # creates celery_taskmeta table for results
```

---

## 2. Writing Tasks

```python
# blog/tasks.py
from celery import shared_task
from celery.utils.log import get_task_logger
from django.core.mail import send_mail

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id: int) -> str:
    """Send welcome email to a newly registered user."""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning('User %s not found — skipping welcome email.', user_id)
        return 'skipped'

    try:
        send_mail(
            subject='Welcome!',
            message=f'Hi {user.username}, welcome aboard!',
            from_email='noreply@myapp.com',
            recipient_list=[user.email],
        )
    except Exception as exc:
        logger.error('Failed to send email: %s', exc)
        raise self.retry(exc=exc)

    logger.info('Welcome email sent to %s', user.email)
    return f'sent:{user.email}'
```

### Calling tasks

```python
# Asynchronous (returns AsyncResult immediately)
send_welcome_email.delay(user.pk)

# With options
send_welcome_email.apply_async(
    args=[user.pk],
    countdown=60,          # delay 60 seconds
    expires=3600,          # expire if not started within 1 hour
    queue='high_priority',
)

# Synchronous (testing / development — skips broker)
send_welcome_email.apply(args=[user.pk])
```

---

## 3. Task Lifecycle and States

| State | Meaning |
|---|---|
| PENDING | Not yet picked up by worker |
| STARTED | Worker has started the task |
| SUCCESS | Completed successfully |
| FAILURE | Task raised an exception |
| RETRY | Being retried after failure |
| REVOKED | Cancelled before execution |

```python
from celery.result import AsyncResult

result = send_welcome_email.delay(user.pk)
print(result.id)           # task UUID
print(result.state)        # PENDING / SUCCESS / FAILURE
print(result.get(timeout=10))  # block until done (use sparingly!)
```

---

## 4. Task Classes (Complex Logic)

```python
from celery import Task


class ReportTask(Task):
    """Example of a custom task class with setup/teardown."""
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error('Task %s failed: %s', task_id, exc)
        # notify ops team, update DB, etc.

    def on_success(self, retval, task_id, args, kwargs):
        logger.info('Task %s succeeded.', task_id)


@shared_task(base=ReportTask, bind=True)
def generate_report(self, report_id: int) -> None:
    from reports.models import Report
    report = Report.objects.get(pk=report_id)
    report.status = 'processing'
    report.save(update_fields=['status'])

    try:
        result = do_heavy_computation(report)
        report.result = result
        report.status = 'done'
    except Exception as exc:
        report.status = 'failed'
        raise self.retry(exc=exc, max_retries=2)
    finally:
        report.save(update_fields=['status', 'result'])
```

---

## 5. Chaining and Grouping Tasks

```python
from celery import chain, group, chord


# Chain: process_image → generate_thumbnail → notify
pipeline = chain(
    process_image.s(image_id),
    generate_thumbnail.s(),       # receives result of previous task
    notify_user.s(user_id),
)
pipeline.delay()


# Group: run in parallel, collect results
job = group([
    send_welcome_email.s(uid) for uid in user_ids
])
result = job.apply_async()


# Chord: run group in parallel, then callback with all results
report_chord = chord(
    [generate_section.s(section_id) for section_id in sections],
    compile_report.s(report_id),   # called with list of all results
)
report_chord.delay()
```

---

## 6. Periodic Tasks with Celery Beat

```python
# settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'send-daily-digest': {
        'task': 'blog.tasks.send_digest',
        'schedule': crontab(hour=8, minute=0),   # daily at 08:00
    },
    'cleanup-old-sessions': {
        'task': 'accounts.tasks.cleanup_sessions',
        'schedule': crontab(hour=2, minute=0, day_of_week='sunday'),
    },
    'ping-healthcheck': {
        'task': 'core.tasks.ping',
        'schedule': 60.0,   # every 60 seconds
    },
}
```

---

## 7. Running Workers

```powershell
# Start worker (Terminal 1)
celery -A config worker --loglevel=info

# Start beat scheduler for periodic tasks (Terminal 2)
celery -A config beat --loglevel=info

# Flower — real-time monitoring UI (Terminal 3)
pip install flower
celery -A config flower --port=5555
# Open http://localhost:5555
```

### Named queues

```powershell
# Define queues
celery -A config worker -Q high_priority,default --loglevel=info

# Route tasks to queues
@shared_task(queue='high_priority')
def urgent_task(): ...
```

---

## 8. Testing Celery Tasks

```python
# blog/tests/test_tasks.py
from django.test import TestCase, override_settings
from unittest.mock import patch


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)  # run tasks synchronously
class SendWelcomeEmailTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='alice', email='alice@example.com', password='pass'
        )

    @patch('blog.tasks.send_mail')
    def test_sends_email(self, mock_send):
        from blog.tasks import send_welcome_email
        result = send_welcome_email.delay(self.user.pk)
        self.assertEqual(result.get(), f'sent:{self.user.email}')
        mock_send.assert_called_once()

    def test_missing_user(self):
        from blog.tasks import send_welcome_email
        result = send_welcome_email.delay(99999)
        self.assertEqual(result.get(), 'skipped')
```

---

## Quick Reference

| Task | Command |
|---|---|
| Start worker | `celery -A config worker --loglevel=info` |
| Start beat | `celery -A config beat --loglevel=info` |
| Monitor (Flower) | `celery -A config flower --port=5555` |
| Call async | `my_task.delay(args)` |
| Call with options | `my_task.apply_async(args=[], countdown=30)` |
| Retry in task | `raise self.retry(exc=exc)` |
| Chain | `chain(task1.s(), task2.s()).delay()` |
| Group | `group([task.s(x) for x in items]).apply_async()` |
| Test | `@override_settings(CELERY_TASK_ALWAYS_EAGER=True)` |
