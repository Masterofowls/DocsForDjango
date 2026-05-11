# Project Structure and Apps

## Definitions

- Project: top-level configuration and deployment boundary.
- App: modular business domain feature.

## Typical Structure

```text
config/
apps/
  accounts/
  blog/
  billing/
templates/
static/
manage.py
```

## App Creation Syntax

```powershell
python manage.py startapp blog
```

Register app in `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
  # ...
  'blog.apps.BlogConfig',
]
```

## App Boundaries

Use one app per domain:

- `accounts`: authentication, profile
- `blog`: content and editorial workflow
- `billing`: invoices and payments

## Example: AppConfig

```python
from django.apps import AppConfig


class BlogConfig(AppConfig):
  default_auto_field = 'django.db.models.BigAutoField'
  name = 'blog'

  def ready(self):
    import blog.signals  # noqa: F401
```
