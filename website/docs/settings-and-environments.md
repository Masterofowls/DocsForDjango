---
id: settings-and-environments
slug: /settings-and-environments
sidebar_position: 3
description: "Manage dev/prod settings, environment variables, and secret management in Django."
---

# Settings and Environments

## Overview

Django's settings module is the single source of truth for every configuration decision in your
project. Mismanaged settings are one of the top causes of production incidents — secrets leaked to
version control, DEBUG left on in production, or wrong database credentials deployed. This guide
shows you how to split settings by environment, load secrets from environment variables, validate
configuration, and avoid every common mistake.

---

## 1. The Basics — settings.py Anatomy

```python
# config/settings.py
from pathlib import Path
import os

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Security ───────────────────────────────────────────────────────────────
SECRET_KEY = os.environ['SECRET_KEY']           # required — no default!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# ── Application registry ───────────────────────────────────────────────────
INSTALLED_APPS = [...]
MIDDLEWARE = [...]

# ── Routing ────────────────────────────────────────────────────────────────
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

# ── Templates ──────────────────────────────────────────────────────────────
TEMPLATES = [...]

# ── Database ───────────────────────────────────────────────────────────────
DATABASES = {'default': {...}}

# ── Auth ───────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'users.User'    # if using a custom user model
AUTH_PASSWORD_VALIDATORS = [...]
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/dashboard/'

# ── Internationalisation ───────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ── Static & Media ─────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── Default primary key type ───────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

---

## 2. Splitting Settings by Environment

The standard approach is a `settings/` package with one file per environment.

### Step 1 — Create the package

```powershell
mkdir config\settings
New-Item config\settings\__init__.py
```

### Step 2 — base.py (shared settings)

```python
# config/settings/base.py
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'blog.apps.BlogConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
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

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

### Step 3 — development.py

```python
# config/settings/development.py
from .base import *  # noqa: F401, F403
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-insecure-key-change-me')
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# SQLite for local development — zero setup
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Debug toolbar
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
INTERNAL_IPS = ['127.0.0.1']

# Show emails in the terminal instead of sending them
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Relaxed password requirements for dev
AUTH_PASSWORD_VALIDATORS = []

# Log all SQL queries
LOGGING = {
    'version': 1,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'loggers': {
        'django.db.backends': {'handlers': ['console'], 'level': 'DEBUG'},
    },
}
```

### Step 4 — production.py

```python
# config/settings/production.py
from .base import *  # noqa: F401, F403
import os

SECRET_KEY = os.environ['SECRET_KEY']        # must be set — crashes if missing
DEBUG = False
ALLOWED_HOSTS = os.environ['ALLOWED_HOSTS'].split(',')

# PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ['DB_HOST'],
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {'sslmode': 'require'},
        'CONN_MAX_AGE': 60,   # connection pooling
    }
}

# Security headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'

# Static files served by WhiteNoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
] + MIDDLEWARE[1:]

# Email — real SMTP
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ['EMAIL_HOST']
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ['EMAIL_HOST_USER']
EMAIL_HOST_PASSWORD = os.environ['EMAIL_HOST_PASSWORD']
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@example.com')

# Redis cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ['REDIS_URL'],
    }
}
```

### Step 5 — test.py

```python
# config/settings/test.py
from .base import *  # noqa: F401, F403

SECRET_KEY = 'test-secret-key'
DEBUG = False

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',   # in-memory DB — tests run faster
    }
}

# Disable migrations during testing (use --no-migrations flag or this)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',  # faster hashing in tests
]

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
```

### Step 6 — point manage.py and wsgi.py to the right file

```python
# manage.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

# config/wsgi.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
```

---

## 3. Environment Variables — the Right Way

### python-dotenv approach

```powershell
pip install python-dotenv
```

`.env` (never commit — add to .gitignore):

```dotenv
SECRET_KEY=django-insecure-change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=me@example.com
EMAIL_HOST_PASSWORD=app-specific-password
```

Load at the top of settings:

```python
from dotenv import load_dotenv
load_dotenv()
```

### django-environ approach (more powerful)

```powershell
pip install django-environ
```

```python
import environ

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ['localhost']),
)

# Read from .env file
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# Parse DATABASE_URL automatically
DATABASES = {'default': env.db()}        # reads DATABASE_URL
CACHES = {'default': env.cache()}        # reads CACHE_URL
```

---

## 4. Validating Required Settings

Add a check function to catch missing variables on startup:

```python
# config/settings/base.py (at the bottom)
def _require_env(name):
    value = os.environ.get(name)
    if not value:
        raise EnvironmentError(
            f"Required environment variable '{name}' is not set."
        )
    return value
```

Or use a management command approach:

```python
# apps/core/management/commands/check_env.py
from django.core.management.base import BaseCommand
import os

REQUIRED_VARS = [
    'SECRET_KEY', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'EMAIL_HOST_USER', 'REDIS_URL',
]

class Command(BaseCommand):
    help = 'Check all required environment variables are set'

    def handle(self, *args, **options):
        missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
        if missing:
            self.stderr.write(f"Missing env vars: {', '.join(missing)}")
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS('All required env vars are set.'))
```

Run before deploying:

```powershell
python manage.py check_env
```

---

## 5. DATABASES Configuration

### SQLite (development)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### PostgreSQL (production)

```powershell
pip install psycopg2-binary
```

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'sslmode': 'require',
            'connect_timeout': 10,
        },
    }
}
```

### dj-database-url (parse DATABASE_URL string)

```powershell
pip install dj-database-url
```

```python
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=60,
    )
}
```

`.env`:

```dotenv
DATABASE_URL=postgres://user:password@localhost:5432/dbname
```

---

## 6. Logging Configuration

```python
# config/settings/base.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'blog': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

---

## 7. Security Checklist for Production

Run the built-in deployment check:

```powershell
python manage.py check --deploy
```

Manually verify these settings before going live:

| Setting | Required Value |
|---|---|
| `DEBUG` | `False` |
| `SECRET_KEY` | Long random string (min 50 chars) |
| `ALLOWED_HOSTS` | Your actual domain(s) only |
| `SECURE_SSL_REDIRECT` | `True` |
| `SESSION_COOKIE_SECURE` | `True` |
| `CSRF_COOKIE_SECURE` | `True` |
| `SECURE_HSTS_SECONDS` | `31536000` (1 year) |
| `X_FRAME_OPTIONS` | `'DENY'` |
| `SECURE_CONTENT_TYPE_NOSNIFF` | `True` |

---

## 8. Generating a Secret Key

```python
# Run in Python shell
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

Or:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Quick Reference

| Task | How |
|---|---|
| Split settings | `config/settings/base.py`, `development.py`, `production.py` |
| Load .env | `python-dotenv` or `django-environ` |
| Set active config | `DJANGO_SETTINGS_MODULE=config.settings.production` |
| Validate settings | `python manage.py check --deploy` |
| Generate secret key | `get_random_secret_key()` |
| PostgreSQL URL | `dj-database-url` + `DATABASE_URL` env var |
