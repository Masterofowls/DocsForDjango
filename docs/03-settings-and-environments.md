# Settings and Environments

## Definition

Django settings control behavior for security, database, static assets,
installed apps, and middleware.

## Environment Split

Common pattern:

- `settings/base.py`
- `settings/dev.py`
- `settings/prod.py`

## Syntax Example

```python
import os

DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'unsafe-dev-key')
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost').split(',')
```

Database syntax:

```python
DATABASES = {
  'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': os.getenv('DB_NAME', 'app'),
    'USER': os.getenv('DB_USER', 'app'),
    'PASSWORD': os.getenv('DB_PASSWORD', ''),
    'HOST': os.getenv('DB_HOST', 'localhost'),
    'PORT': os.getenv('DB_PORT', '5432'),
  },
}
```

## Production Checklist

- `DEBUG = False`
- secure key from environment
- strict `ALLOWED_HOSTS`
- secure cookies and HTTPS headers
