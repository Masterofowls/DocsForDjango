---
id: management-commands
slug: /management-commands
sidebar_position: 18
description: "Write custom Django management commands, with arguments, output, and scheduling."
---

# Management Commands

## Overview

Django management commands are scripts you run with `python manage.py <command>`. They are the
right place for maintenance tasks, data imports, seed scripts, scheduled jobs, and utility
operations. This guide covers writing commands, handling arguments, testing, and scheduling.

---

## 1. Built-in Commands Reference

```powershell
# Development
python manage.py runserver
python manage.py shell                  # interactive Python shell
python manage.py shell_plus             # (django-extensions) with model imports

# Database
python manage.py makemigrations
python manage.py migrate
python manage.py showmigrations
python manage.py sqlmigrate <app> <num> # show SQL for a migration
python manage.py dbshell               # open database CLI

# Static files
python manage.py collectstatic --noinput

# Inspecting
python manage.py check                 # run system checks
python manage.py inspectdb             # generate models from existing DB tables
python manage.py diffsettings          # show differences from defaults

# Users
python manage.py createsuperuser
python manage.py changepassword <username>
```

---

## 2. Creating a Custom Command

### Directory structure

```
blog/
  management/
    __init__.py
    commands/
      __init__.py
      send_digest.py      ← command name = filename (without .py)
```

### Basic command structure

```python
# blog/management/commands/send_digest.py
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from blog.models import Post


class Command(BaseCommand):
    help = 'Send a weekly digest email to all subscribers'

    def add_arguments(self, parser):
        # Positional argument
        parser.add_argument('days', type=int, nargs='?', default=7,
                            help='Number of days to include (default: 7)')

        # Optional flags
        parser.add_argument('--dry-run', action='store_true',
                            help='Preview without sending')
        parser.add_argument('--email', type=str, default=None,
                            help='Send only to this email address')

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        email = options.get('email')

        since = timezone.now() - timezone.timedelta(days=days)
        posts = Post.objects.filter(
            status='published',
            created_at__gte=since,
        ).select_related('author')

        if not posts.exists():
            self.stdout.write(self.style.WARNING(
                f'No posts found in the last {days} days.'
            ))
            return

        self.stdout.write(f'Found {posts.count()} posts to include.')

        if dry_run:
            self.stdout.write(self.style.NOTICE('[DRY RUN] Would send digest.'))
            for post in posts:
                self.stdout.write(f'  - {post.title}')
            return

        try:
            send_digest_emails(posts, email)
        except Exception as exc:
            raise CommandError(f'Failed to send digest: {exc}') from exc

        self.stdout.write(self.style.SUCCESS('Digest sent successfully.'))
```

---

## 3. Running the Command

```powershell
python manage.py send_digest
python manage.py send_digest 14            # last 14 days
python manage.py send_digest --dry-run
python manage.py send_digest --email admin@example.com
python manage.py help send_digest          # show usage
```

---

## 4. Output Styling

```python
# In handle():
self.stdout.write('Normal output')
self.stdout.write(self.style.SUCCESS('Operation completed'))
self.stdout.write(self.style.WARNING('Something to note'))
self.stdout.write(self.style.ERROR('Something went wrong'))
self.stdout.write(self.style.NOTICE('FYI message'))
self.stdout.write(self.style.HTTP_INFO('HTTP 1xx'))
self.stdout.write(self.style.HTTP_SUCCESS('HTTP 2xx'))
self.stdout.write(self.style.HTTP_REDIRECT('HTTP 3xx'))
self.stdout.write(self.style.HTTP_NOT_MODIFIED('HTTP 304'))
self.stdout.write(self.style.HTTP_NOT_FOUND('HTTP 404'))

# Progress with verbosity level
if options['verbosity'] >= 2:
    self.stdout.write(f'Processing post {post.pk}...')

# Stderr for errors
self.stderr.write('This goes to stderr')
```

---

## 5. Argument Patterns

```python
def add_arguments(self, parser):
    # Required positional
    parser.add_argument('username', type=str)

    # Multiple values (nargs='+' means 1+, '*' means 0+)
    parser.add_argument('emails', nargs='+', type=str)

    # Integer with default
    parser.add_argument('--batch-size', type=int, default=100)

    # Boolean flag
    parser.add_argument('--force', action='store_true', default=False)

    # Choice from list
    parser.add_argument('--format', choices=['json', 'csv', 'xml'], default='json')

    # Multiple values with named flag
    parser.add_argument('--tag', action='append', dest='tags',
                        help='Can repeat: --tag sports --tag news')

    # Mutually exclusive group
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--create', action='store_true')
    group.add_argument('--delete', action='store_true')
```

---

## 6. Practical Examples

### Seed data command

```python
# blog/management/commands/seed_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from blog.models import Category, Post
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with sample data'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=20,
                            help='Number of posts to create')
        parser.add_argument('--flush', action='store_true',
                            help='Delete existing data first')

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Flushing existing data...')
            Post.objects.all().delete()
            Category.objects.all().delete()

        user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@example.com', 'is_staff': True},
        )

        categories = [
            Category.objects.get_or_create(name=name)[0]
            for name in ['Tech', 'Business', 'Science']
        ]

        for i in range(options['count']):
            Post.objects.create(
                title=f'Sample Post {i + 1}',
                body=f'Content for post {i + 1}.' * 20,
                author=user,
                category=random.choice(categories),
                status='published',
            )

        self.stdout.write(self.style.SUCCESS(
            f"Created {options['count']} posts."
        ))
```

### Data migration command

```python
# blog/management/commands/backfill_slugs.py
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from blog.models import Post


class Command(BaseCommand):
    help = 'Backfill slugs for posts that are missing them'

    def handle(self, *args, **options):
        posts = Post.objects.filter(slug='')
        total = posts.count()
        self.stdout.write(f'Found {total} posts without slugs.')

        updated = 0
        for post in posts.iterator(chunk_size=100):
            base_slug = slugify(post.title)
            slug = base_slug
            counter = 1
            while Post.objects.filter(slug=slug).exclude(pk=post.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            post.slug = slug
            post.save(update_fields=['slug'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f'Updated {updated} posts.'))
```

---

## 7. Testing Management Commands

```python
# blog/tests/test_commands.py
from io import StringIO
from django.test import TestCase
from django.core.management import call_command


class SeedDataCommandTests(TestCase):
    def test_creates_posts(self):
        out = StringIO()
        call_command('seed_data', '--count', '5', stdout=out)
        from blog.models import Post
        self.assertEqual(Post.objects.count(), 5)
        self.assertIn('Created 5 posts', out.getvalue())

    def test_flush_option(self):
        from blog.models import Post
        Post.objects.create(title='Old', slug='old', body='x')
        call_command('seed_data', '--count', '2', '--flush', stdout=StringIO())
        self.assertEqual(Post.objects.count(), 2)
```

---

## 8. Scheduling Commands

### Using cron (Linux/macOS)

```bash
# crontab -e
0 8 * * 1 /path/to/venv/bin/python /path/to/manage.py send_digest >> /var/log/digest.log 2>&1
```

### Using Windows Task Scheduler

```powershell
schtasks /create /tn "DjangoDigest" /tr "C:\Python\python.exe C:\myapp\manage.py send_digest" /sc WEEKLY /d MON /st 08:00
```

### Using Celery Beat (recommended for production)

```python
# celery.py / config
from celery.schedules import crontab

CELERYBEAT_SCHEDULE = {
    'send-weekly-digest': {
        'task': 'blog.tasks.send_digest',
        'schedule': crontab(hour=8, minute=0, day_of_week='monday'),
    },
}
```

---

## Quick Reference

| Task | Code |
|---|---|
| Create command | `blog/management/commands/mycommand.py` |
| Required arg | `parser.add_argument('name', type=str)` |
| Optional flag | `parser.add_argument('--dry-run', action='store_true')` |
| Success output | `self.stdout.write(self.style.SUCCESS('Done'))` |
| Raise error | `raise CommandError('Something failed')` |
| Call in tests | `call_command('mycommand', '--flag', stdout=out)` |
| Verbosity level | `options['verbosity']` (0=quiet, 1=normal, 2=verbose) |
