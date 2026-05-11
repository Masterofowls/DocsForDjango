# Django Complete Guide: Installation to Advanced Development

This guide covers Django from zero to advanced production workflows.
It explains definitions, syntax, and usage with practical examples.

## 1. What Is Django?

Django is a high-level Python web framework focused on:

- Rapid development
- Clean architecture
- Security by default
- Reusable components

Core idea:

- Project: global configuration and root URL tree.
- App: focused feature module inside a project.

Example app boundaries:

- `accounts`: authentication and user profiles
- `blog`: posts, tags, comments
- `billing`: invoices and payments

## 2. Installation and Project Setup

### 2.1 Prerequisites

- Python 3.12+ (`python --version`)
- pip (`python -m pip --version`)
- Optional: virtual environment tooling (`venv`, `uv`)

### 2.2 Create and Activate a Virtual Environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

### 2.3 Install Django

```powershell
python -m pip install django
python -m django --version
```

### 2.4 Start a Project

```powershell
django-admin startproject config .
python manage.py runserver
```

Project structure:

```text
manage.py
config/
  __init__.py
  settings.py
  urls.py
  asgi.py
  wsgi.py
```

## 3. Create and Register Django Apps

### 3.1 Create an App

```powershell
python manage.py startapp blog
```

App structure:

```text
blog/
  admin.py
  apps.py
  models.py
  views.py
  tests.py
  migrations/
```

### 3.2 Register in `INSTALLED_APPS`

In `config/settings.py`:

```python
INSTALLED_APPS = [
  'django.contrib.admin',
  'django.contrib.auth',
  'django.contrib.contenttypes',
  'django.contrib.sessions',
  'django.contrib.messages',
  'django.contrib.staticfiles',
  'blog.apps.BlogConfig',
]
```

Definition:

- `AppConfig`: app metadata and startup hooks.

Syntax (`blog/apps.py`):

```python
from django.apps import AppConfig


class BlogConfig(AppConfig):
  default_auto_field = 'django.db.models.BigAutoField'
  name = 'blog'
```

## 4. Settings Deep Dive

`settings.py` controls global behavior.

Important settings:

- `DEBUG`: never `True` in production.
- `ALLOWED_HOSTS`: trusted host/domain names.
- `DATABASES`: DB engine and connection.
- `TIME_ZONE`, `USE_TZ`: timezone behavior.
- `STATIC_URL`, `MEDIA_URL`: static and uploaded file paths.
- `AUTH_USER_MODEL`: custom user model path.

Example with environment variables:

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'unsafe-dev-key')
DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

DATABASES = {
  'default': {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': BASE_DIR / 'db.sqlite3',
  },
}
```

## 5. URLs and Routing

### 5.1 Root URLConf

In `config/urls.py`:

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
  path('admin/', admin.site.urls),
  path('blog/', include('blog.urls')),
]
```

### 5.2 App URLConf

In `blog/urls.py`:

```python
from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
  path('', views.post_list, name='post_list'),
  path('<int:post_id>/', views.post_detail, name='post_detail'),
]
```

Definitions:

- `path()`: declarative URL route.
- `name`: stable identifier for reverse URL lookup.
- `include()`: mount sub-routes from apps.

Reverse URL usage:

```python
from django.urls import reverse
reverse('blog:post_detail', kwargs={'post_id': 5})
```

## 6. Models and ORM

### 6.1 Define Models

In `blog/models.py`:

```python
from django.conf import settings
from django.db import models


class Post(models.Model):
  title = models.CharField(max_length=200)
  slug = models.SlugField(unique=True)
  body = models.TextField()
  is_published = models.BooleanField(default=False)
  author = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name='posts',
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ['-created_at']
    indexes = [models.Index(fields=['slug'])]

  def __str__(self):
    return self.title
```

### 6.2 Migrations

```powershell
python manage.py makemigrations
python manage.py migrate
```

Definition:

- Migration: versioned schema change tracked in code.

### 6.3 ORM Queries

```python
from blog.models import Post

published = Post.objects.filter(is_published=True)
latest = Post.objects.select_related('author').first()
search = Post.objects.filter(title__icontains='django')
```

## 7. Views: Function and Class-Based

### 7.1 Function-Based Views (FBV)

In `blog/views.py`:

```python
from django.http import Http404
from django.shortcuts import render
from .models import Post


def post_list(request):
  posts = Post.objects.filter(is_published=True)
  return render(request, 'blog/post_list.html', {'posts': posts})


def post_detail(request, post_id):
  try:
    post = Post.objects.get(pk=post_id, is_published=True)
  except Post.DoesNotExist as exc:
    raise Http404('Post not found') from exc
  return render(request, 'blog/post_detail.html', {'post': post})
```

### 7.2 Class-Based Views (CBV)

```python
from django.views.generic import DetailView, ListView
from .models import Post


class PostListView(ListView):
  model = Post
  template_name = 'blog/post_list.html'
  context_object_name = 'posts'

  def get_queryset(self):
    return Post.objects.filter(is_published=True).select_related('author')


class PostDetailView(DetailView):
  model = Post
  template_name = 'blog/post_detail.html'
  context_object_name = 'post'
```

## 8. Templates, Static Files, and Inheritance

### 8.1 Template Syntax

`templates/base.html`:

```html
<!doctype html>
<html lang='en'>
  <head>
    <meta charset='utf-8'>
    <title>{% block title %}My Site{% endblock %}</title>
  </head>
  <body>
    <header><h1>My Site</h1></header>
    <main>{% block content %}{% endblock %}</main>
  </body>
</html>
```

`templates/blog/post_list.html`:

```html
{% extends 'base.html' %}
{% block title %}Posts{% endblock %}
{% block content %}
  <ul>
    {% for post in posts %}
      <li><a href='{% url "blog:post_detail" post.id %}'>{{ post.title }}</a></li>
    {% empty %}
      <li>No posts yet.</li>
    {% endfor %}
  </ul>
{% endblock %}
```

Syntax highlights:

- `{{ variable }}` output escaping
- `{% tag %}` control logic
- `{% extends %}` and `{% block %}` inheritance

### 8.2 Static Files

In template:

```html
{% load static %}
<link rel='stylesheet' href='{% static "css/site.css" %}'>
```

## 9. Forms and Validation

### 9.1 ModelForm

In `blog/forms.py`:

```python
from django import forms
from .models import Post


class PostForm(forms.ModelForm):
  class Meta:
    model = Post
    fields = ['title', 'slug', 'body', 'is_published']

  def clean_title(self):
    title = self.cleaned_data['title'].strip()
    if len(title) < 5:
      raise forms.ValidationError('Title must be at least 5 characters.')
    return title
```

Usage in view:

```python
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from .forms import PostForm


@login_required
def post_create(request):
  if request.method == 'POST':
    form = PostForm(request.POST)
    if form.is_valid():
      post = form.save(commit=False)
      post.author = request.user
      post.save()
      return redirect('blog:post_detail', post_id=post.id)
  else:
    form = PostForm()

  return render(request, 'blog/post_form.html', {'form': form})
```

## 10. Users, Authentication, and Permissions

### 10.1 Built-in Auth

Django auth components:

- User model
- Groups and permissions
- Authentication backends
- Session middleware

Useful imports:

```python
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, permission_required
```

Login example:

```python
def login_view(request):
  if request.method == 'POST':
    username = request.POST.get('username', '')
    password = request.POST.get('password', '')
    user = authenticate(request, username=username, password=password)
    if user is not None:
      login(request, user)
```

### 10.2 Custom User Model (Recommended)

In `accounts/models.py`:

```python
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
  pass
```

In settings:

```python
AUTH_USER_MODEL = 'accounts.User'
```

## 11. Django Admin

### 11.1 Register Models

In `blog/admin.py`:

```python
from django.contrib import admin
from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
  list_display = ('id', 'title', 'author', 'is_published', 'created_at')
  list_filter = ('is_published', 'created_at')
  search_fields = ('title', 'body', 'author__username')
  prepopulated_fields = {'slug': ('title',)}
  autocomplete_fields = ('author',)
```

### 11.2 Create Superuser

```powershell
python manage.py createsuperuser
python manage.py runserver
```

Then open `/admin/`.

## 12. Middleware, Signals, and Request Lifecycle

### 12.1 Middleware

Definition:

- Middleware is a request/response hook chain around view execution.

Custom middleware (`core/middleware.py`):

```python
import time


class RequestTimingMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    started = time.perf_counter()
    response = self.get_response(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response['X-Request-Time-ms'] = f'{elapsed_ms:.2f}'
    return response
```

### 12.2 Signals

Definition:

- Signals dispatch events between decoupled components.

Example (`blog/signals.py`):

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Post


@receiver(post_save, sender=Post)
def on_post_saved(sender, instance, created, **kwargs):
  if created:
    # Example side effect: queue notifications
    pass
```

## 13. Query Optimization and Performance

Key tools:

- `select_related()` for foreign keys
- `prefetch_related()` for reverse/many-to-many
- DB indexes
- pagination
- caching

Example:

```python
posts = (
  Post.objects.filter(is_published=True)
  .select_related('author')
  .prefetch_related('author__groups')
)
```

Caching example in settings:

```python
CACHES = {
  'default': {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    'LOCATION': 'django-cache',
  },
}
```

## 14. Testing

Django test command:

```powershell
python manage.py test
```

Example test (`blog/tests.py`):

```python
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from .models import Post


class BlogViewTests(TestCase):
  def setUp(self):
    user = get_user_model().objects.create_user(
      username='alice',
      password='secret1234',
    )
    Post.objects.create(
      title='Intro to Django',
      slug='intro-to-django',
      body='Body',
      is_published=True,
      author=user,
    )
    self.client = Client()

  def test_post_list_returns_200(self):
    response = self.client.get(reverse('blog:post_list'))
    self.assertEqual(response.status_code, 200)
    self.assertContains(response, 'Intro to Django')
```

## 15. Security Essentials

Built-in protections:

- CSRF middleware
- XSS escaping in templates
- SQL injection protection via ORM
- clickjacking protection headers

Production checklist:

- `DEBUG = False`
- secure `SECRET_KEY`
- HTTPS everywhere
- `SESSION_COOKIE_SECURE = True`
- `CSRF_COOKIE_SECURE = True`
- strong `ALLOWED_HOSTS`

## 16. Deployment Basics

Common flow:

1. Configure production settings.
2. Run migrations.
3. Collect static files.
4. Serve app via Gunicorn/Uvicorn.
5. Reverse proxy with Nginx/Caddy.

Commands:

```powershell
python manage.py migrate
python manage.py collectstatic --noinput
```

## 17. Advanced Django Topics

### 17.1 Async Views

```python
from django.http import JsonResponse


async def health(request):
  return JsonResponse({'status': 'ok'})
```

### 17.2 Celery for Background Jobs

Use Celery when tasks should run out-of-band:

- emails
- reports
- external API retries

### 17.3 Django REST Framework (DRF)

Install:

```powershell
python -m pip install djangorestframework
```

Add to apps:

```python
INSTALLED_APPS = [
  # ...
  'rest_framework',
]
```

Simple API view:

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def api_status(request):
  return Response({'service': 'blog', 'status': 'ok'})
```

### 17.4 Custom Management Commands

Path:

```text
blog/management/commands/rebuild_index.py
```

Template:

```python
from django.core.management.base import BaseCommand


class Command(BaseCommand):
  help = 'Rebuilds the search index'

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS('Index rebuilt'))
```

Run:

```powershell
python manage.py rebuild_index
```

## 18. Recommended Conventions

- One app per bounded domain.
- Keep business logic out of templates.
- Prefer explicit service layers for complex workflows.
- Add typed settings helpers for environment variables.
- Write tests for every bug fix.

## 19. Common Errors and Fixes

- `No module named ...`: virtual environment not active.
- `DisallowedHost`: missing host in `ALLOWED_HOSTS`.
- `no such table`: migrations not applied.
- static files missing: run `collectstatic` and check static config.

## 20. Next Steps

- Split settings into `base.py`, `dev.py`, `prod.py`.
- Add CI for tests and linting.
- Add observability: structured logs, error monitoring, tracing.
- Add typed API schemas and OpenAPI docs.

## 21. Relationships Deep Dive

### 21.1 One-to-One

Use this when one record should own exactly one related record.

```python
from django.conf import settings
from django.db import models


class Profile(models.Model):
  user = models.OneToOneField(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name='profile',
  )
  bio = models.TextField(blank=True)
```

### 21.2 Many-to-Many

```python
class Tag(models.Model):
  name = models.CharField(max_length=64, unique=True)


class Post(models.Model):
  # ...existing fields
  tags = models.ManyToManyField(Tag, related_name='posts', blank=True)
```

Reverse usage:

```python
post.tags.all()
tag.posts.filter(is_published=True)
```

### 21.3 Through Models

Use `through` when relation itself has extra attributes.

```python
class PostTag(models.Model):
  post = models.ForeignKey('Post', on_delete=models.CASCADE)
  tag = models.ForeignKey('Tag', on_delete=models.CASCADE)
  added_by = models.ForeignKey('auth.User', on_delete=models.CASCADE)
  added_at = models.DateTimeField(auto_now_add=True)


class Post(models.Model):
  # ...existing fields
  tags = models.ManyToManyField('Tag', through='PostTag')
```

## 22. Advanced QuerySet Patterns

### 22.1 Conditional Logic with `Q`

```python
from django.db.models import Q

posts = Post.objects.filter(
  Q(title__icontains='django') | Q(body__icontains='django'),
  is_published=True,
)
```

### 22.2 Field-Aware Updates with `F`

```python
from django.db.models import F

Post.objects.filter(is_published=True).update(view_count=F('view_count') + 1)
```

### 22.3 `get_or_create()` and `update_or_create()`

```python
tag, created = Tag.objects.get_or_create(name='django')

post, created = Post.objects.update_or_create(
  slug='intro-to-django',
  defaults={'title': 'Intro to Django', 'is_published': True},
)
```

### 22.4 Aggregation and Annotation

```python
from django.db.models import Count

authors = (
  Post.objects.filter(is_published=True)
  .values('author__username')
  .annotate(total=Count('id'))
  .order_by('-total')
)
```

## 23. Transactions and Data Consistency

Use transactions when multiple writes must succeed or fail together.

```python
from django.db import transaction


@transaction.atomic
def publish_and_audit(post_id):
  post = Post.objects.select_for_update().get(pk=post_id)
  post.is_published = True
  post.save(update_fields=['is_published'])
  # Add related audit record write here.
```

If an exception is raised inside the atomic block, all DB changes roll back.

## 24. Response Types and Error Handling

Common response classes:

- `HttpResponse`: generic text/binary response.
- `JsonResponse`: JSON payload.
- `FileResponse`: large file streaming.
- `StreamingHttpResponse`: chunked data output.

Examples:

```python
from django.http import FileResponse, JsonResponse


def ping(request):
  return JsonResponse({'ok': True}, status=200)


def download_report(request):
  file_obj = open('reports/monthly.pdf', 'rb')
  return FileResponse(file_obj, as_attachment=True, filename='monthly.pdf')
```

Custom error handlers in `config/urls.py`:

```python
handler404 = 'core.views.error_404'
handler500 = 'core.views.error_500'
```

## 25. Forms: Rendering, Formsets, and Validation

### 25.1 Render and Error Display

```html
<form method='post'>
  {% csrf_token %}
  {{ form.non_field_errors }}
  {% for field in form %}
    <div>
      {{ field.label_tag }}
      {{ field }}
      {{ field.errors }}
    </div>
  {% endfor %}
  <button type='submit'>Save</button>
</form>
```

### 25.2 Cross-Field Validation

```python
from django import forms


class PublishForm(forms.Form):
  publish_now = forms.BooleanField(required=False)
  publish_at = forms.DateTimeField(required=False)

  def clean(self):
    cleaned = super().clean()
    if not cleaned.get('publish_now') and not cleaned.get('publish_at'):
      raise forms.ValidationError('Choose publish_now or provide publish_at.')
    return cleaned
```

### 25.3 Formsets

```python
from django.forms import formset_factory

TagFormSet = formset_factory(PostForm, extra=2)
```

## 26. Users, Groups, and Permission Patterns

Assign permissions:

```python
from django.contrib.auth.models import Group, Permission

editors, _ = Group.objects.get_or_create(name='Editors')
perm = Permission.objects.get(codename='change_post')
editors.permissions.add(perm)
```

Check permissions in views:

```python
from django.contrib.auth.decorators import permission_required


@permission_required('blog.change_post', raise_exception=True)
def edit_post(request, post_id):
  ...
```

Use class-based mixins:

```python
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.views.generic import UpdateView


class PostUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UpdateView):
  permission_required = 'blog.change_post'
```

## 27. Template Filters, Tags, and Context Processors

Built-in filters:

```html
{{ post.title|upper }}
{{ post.created_at|date:'Y-m-d H:i' }}
{{ post.body|truncatewords:30 }}
```

Custom filter (`blog/templatetags/blog_extras.py`):

```python
from django import template

register = template.Library()


@register.filter
def initials(value):
  return ''.join([part[0] for part in value.split() if part])
```

Context processor (`core/context_processors.py`):

```python
def site_context(request):
  return {'SITE_NAME': 'DocsForDjango'}
```

Register in settings under `TEMPLATES[0]['OPTIONS']['context_processors']`.

## 28. Logging and Observability

Minimal production logging config:

```python
LOGGING = {
  'version': 1,
  'disable_existing_loggers': False,
  'formatters': {
    'standard': {
      'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
    },
  },
  'handlers': {
    'console': {
      'class': 'logging.StreamHandler',
      'formatter': 'standard',
    },
  },
  'loggers': {
    'django': {
      'handlers': ['console'],
      'level': 'INFO',
      'propagate': True,
    },
  },
}
```

Tips:

- Use structured logs in production.
- Include request id / correlation id when possible.
- Separate app logs from access logs.

## 29. Email and Notification Basics

Settings:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'noreply@example.com'
EMAIL_HOST_PASSWORD = 'change-me'
DEFAULT_FROM_EMAIL = 'noreply@example.com'
```

Usage:

```python
from django.core.mail import send_mail

send_mail(
  subject='Welcome',
  message='Thanks for joining.',
  from_email='noreply@example.com',
  recipient_list=['user@example.com'],
)
```

## 30. Final Production Checklist

- Use a custom user model from project start.
- Keep secrets in environment variables.
- Add DB backups and restore drills.
- Enable caching and optimize slow query paths.
- Add health checks and readiness checks.
- Run tests and migrations in CI before deploy.
- Add monitoring, alerting, and log retention policies.

---

This document is intended to be rendered through Doxygen using the repository
`Doxyfile` and build scripts in `scripts/`.
