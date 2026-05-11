# External Databases

## Definition

Use external databases (PostgreSQL, MySQL, MongoDB) for production instead
of SQLite, with multi-database support for analytics and scaling.

## PostgreSQL Configuration

Install driver:

```powershell
python -m pip install psycopg2-binary
```

Settings:

```python
DATABASES = {
  'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': os.getenv('DB_NAME', 'app_db'),
    'USER': os.getenv('DB_USER', 'app_user'),
    'PASSWORD': os.getenv('DB_PASSWORD', ''),
    'HOST': os.getenv('DB_HOST', 'localhost'),
    'PORT': os.getenv('DB_PORT', '5432'),
  },
}
```

## Multiple Databases

```python
DATABASES = {
  'default': {...},
  'analytics': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': 'analytics_db',
    'HOST': 'analytics.example.com',
  },
}
```

Query against specific DB:

```python
Post.objects.using('analytics').filter(is_published=True)
```

## Database Router

```python
class AnalyticsRouter:
  def db_for_read(self, model, **hints):
    if model._meta.app_label == 'analytics':
      return 'analytics'
    return 'default'

  def db_for_write(self, model, **hints):
    if model._meta.app_label == 'analytics':
      return 'analytics'
    return 'default'

  def allow_relation(self, obj1, obj2, **hints):
    return True

  def allow_migrate(self, db, app_label, model_name=None, **hints):
    return True
```

Register in settings:

```python
DATABASE_ROUTERS = ['config.routers.AnalyticsRouter']
```

## Connection Pooling (PgBouncer)

For high-concurrency apps, use connection pooling:

```python
DATABASES = {
  'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': 'app_db',
    'HOST': 'pgbouncer.example.com',
    'PORT': '6432',  # PgBouncer port
  },
}
```

## Health Checks

```python
from django.db import connections


def db_health(request):
  try:
    connections['default'].ensure_connection()
    return JsonResponse({'db': 'ok'})
  except Exception as e:
    return JsonResponse({'db': 'error', 'detail': str(e)}, status=503)
```
