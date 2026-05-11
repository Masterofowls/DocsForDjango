# Installation and Tooling

## Definition

Installation covers preparing Python, virtual environments, Django,
and developer tooling for a reliable local workflow.

## Prerequisites

- Python 3.12+
- pip
- Git
- Optional: PostgreSQL, Redis

## Syntax and Commands

Create and activate virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Install Django and core tooling:

```powershell
python -m pip install django
python -m pip install django-debug-toolbar
python -m pip install black ruff mypy pytest pytest-django
```

Create project:

```powershell
django-admin startproject config .
python manage.py runserver
```

## Recommended Toolchain

- Formatter: Black
- Linter: Ruff
- Type checker: mypy
- Test runner: pytest + pytest-django

## Example: First Health Check Endpoint

In `config/urls.py` add:

```python
from django.http import JsonResponse
from django.urls import path


def health(request):
  return JsonResponse({'status': 'ok'})


urlpatterns = [
  path('health/', health, name='health'),
]
```

Open `http://127.0.0.1:8000/health/`.
