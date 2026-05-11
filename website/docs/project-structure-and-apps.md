---
id: project-structure-and-apps
slug: /project-structure-and-apps
sidebar_position: 2
description: "Understand Django project layout, app design principles, and the settings/urls/wsgi files."
---

# Project Structure and Apps

## Overview

Understanding Django's project layout is essential before writing any code. A Django project is a
Python package that configures and wires together one or more **apps** — reusable components that
each own a slice of your application's domain. This guide walks through every file and directory,
explains the purpose of each component, and shows you how to structure a real project.

---

## 1. What Gets Created by `startproject`

```powershell
django-admin startproject config .
```

```
myproject/               ← project root (git repo root)
  config/                ← inner Python package (project config)
    __init__.py          ← marks this as a package
    settings.py          ← all project configuration
    urls.py              ← root URL dispatcher
    asgi.py              ← ASGI server entry point (async/WebSockets)
    wsgi.py              ← WSGI server entry point (traditional)
  manage.py              ← CLI entry point for all Django commands
  db.sqlite3             ← SQLite database (created after migrate)
  .env                   ← environment variables (never commit!)
  requirements.txt       ← Python dependencies
  pyproject.toml         ← tool configuration (black, ruff, mypy)
```

### manage.py

You never edit this file. It sets `DJANGO_SETTINGS_MODULE` and delegates to Django's CLI.

Common commands:

```powershell
python manage.py runserver          # start dev server
python manage.py migrate            # apply database migrations
python manage.py makemigrations     # generate migration files
python manage.py createsuperuser    # create admin user
python manage.py shell              # interactive Python shell
python manage.py test               # run test suite
python manage.py collectstatic      # gather static files for production
python manage.py check              # system checks (finds config errors)
```

---

## 2. What `startapp` Creates

```powershell
python manage.py startapp blog
```

```
blog/
  __init__.py
  admin.py         ← register models with the admin site
  apps.py          ← AppConfig class (app metadata and ready())
  migrations/      ← auto-generated migration files
    __init__.py
  models.py        ← database models (ORM)
  tests.py         ← test cases
  views.py         ← request handlers
```

Files you will typically add yourself:

```
blog/
  urls.py          ← app-level URL patterns
  forms.py         ← Django forms
  serializers.py   ← DRF serializers (if building an API)
  services.py      ← business logic (keep views thin)
  selectors.py     ← complex queries
  templates/
    blog/
      list.html
      detail.html
  static/
    blog/
      blog.css
```

---

## 3. Register Apps in settings.py

After creating an app, register it immediately:

```python
# config/settings.py
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'debug_toolbar',
    # Local apps — use dotted AppConfig path (preferred)
    'blog.apps.BlogConfig',
    'users.apps.UsersConfig',
    'orders.apps.OrdersConfig',
]
```

### AppConfig (apps.py)

```python
# blog/apps.py
from django.apps import AppConfig


class BlogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'blog'
    verbose_name = 'Blog'

    def ready(self):
        # Import signal handlers when Django starts
        import blog.signals  # noqa: F401
```

---

## 4. Multi-App Project Layout

For a real project with multiple domains, use this flat structure:

```
myproject/
  config/
    __init__.py
    settings/
      __init__.py
      base.py         ← shared settings
      development.py  ← dev overrides
      production.py   ← prod overrides
      test.py         ← test overrides
    urls.py
    wsgi.py
    asgi.py
  apps/
    users/
    blog/
    orders/
    payments/
    notifications/
  manage.py
  requirements/
    base.txt
    development.txt
    production.txt
  docs/
  tests/
    integration/
    e2e/
```

Point manage.py to the settings package:

```python
# manage.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
```

---

## 5. settings.py — Key Sections Explained

```python
from pathlib import Path
import os

# BASE_DIR is the project root (where manage.py lives)
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY — load from environment, never hardcode
SECRET_KEY = os.environ['SECRET_KEY']
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# INSTALLED_APPS — every active app listed here
INSTALLED_APPS = [...]

# MIDDLEWARE — applied in order top-to-bottom on request,
#              bottom-to-top on response
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ROOT_URLCONF — the module that contains the root urlpatterns list
ROOT_URLCONF = 'config.urls'

# TEMPLATES — Django's template engine settings
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],   # global templates
        'APP_DIRS': True,                   # auto-discovers app/templates/
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# DATABASES
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# STATIC FILES
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'  # for collectstatic

# MEDIA FILES (user uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

---

## 6. Root urls.py

```python
# config/urls.py
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('blog/', include('blog.urls', namespace='blog')),
    path('api/', include('api.urls', namespace='api')),
    path('users/', include('users.urls', namespace='users')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    import debug_toolbar
    urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
```

### App-level urls.py

```python
# blog/urls.py
from django.urls import path
from . import views

app_name = 'blog'   # namespace

urlpatterns = [
    path('', views.PostListView.as_view(), name='post-list'),
    path('<slug:slug>/', views.PostDetailView.as_view(), name='post-detail'),
    path('create/', views.PostCreateView.as_view(), name='post-create'),
    path('<slug:slug>/edit/', views.PostUpdateView.as_view(), name='post-update'),
    path('<slug:slug>/delete/', views.PostDeleteView.as_view(), name='post-delete'),
]
```

---

## 7. asgi.py and wsgi.py

### wsgi.py — synchronous deployments (Gunicorn, uWSGI)

```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()
```

Production startup:

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### asgi.py — async, WebSockets (Daphne, Uvicorn)

```python
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_asgi_application()
```

With Channels (for WebSocket support):

```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chat.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(chat.routing.websocket_urlpatterns)
    ),
})
```

---

## 8. Django System Check

Always run this after structural changes:

```powershell
python manage.py check
python manage.py check --deploy   # also checks production security settings
```

Example output on a clean project:

```
System check identified no issues (0 silenced).
```

---

## 9. Recommended Patterns

### Keep views thin — use service layer

```python
# Bad: business logic in view
def create_order(request):
    order = Order(user=request.user, ...)
    order.save()
    send_email(order)
    update_inventory(order)
    return redirect('orders:detail', pk=order.pk)

# Good: delegate to a service function
from orders.services import place_order

def create_order(request):
    order = place_order(user=request.user, data=request.POST)
    return redirect('orders:detail', pk=order.pk)
```

### One app = one domain

Each app should own a single responsibility:

| App | Responsibility |
|---|---|
| `users` | Custom user model, profile, auth views |
| `blog` | Posts, categories, comments |
| `orders` | Cart, orders, line items |
| `payments` | Stripe integration, invoices |
| `notifications` | Email/SMS/push logic |

---

## Summary

| Concept | Where it lives |
|---|---|
| Project config | `config/settings.py` |
| URL routing | `config/urls.py` → `app/urls.py` |
| Data models | `app/models.py` |
| Request handlers | `app/views.py` |
| Business logic | `app/services.py` |
| HTML templates | `app/templates/app/` |
| Static files | `app/static/app/` |
| Tests | `app/tests/` or `tests/` |
| Migrations | `app/migrations/` |
