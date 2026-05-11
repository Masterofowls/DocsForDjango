---
id: installation-and-tooling
slug: /installation-and-tooling
sidebar_position: 1
description: "Install Python, pip, venv, and Django on Windows, macOS, and Linux with step-by-step examples."
---

# Installation and Tooling

## Overview

A correct local environment is the foundation of every Django project. This guide walks you through
installing Python, creating isolated virtual environments, installing Django and its ecosystem of
developer tools, configuring your editor, and running your first request — from a blank machine to
a working project.

---

## 1. Install Python

### Windows

1. Open [python.org/downloads](https://python.org/downloads) and download the latest **Python 3.12+** installer.
2. Run the installer. **Check "Add Python to PATH"** before clicking Install Now.
3. Verify in PowerShell:

```powershell
python --version        # Python 3.12.x
python -m pip --version # pip 24.x
```

4. If `python` is not found, add Python manually:

```powershell
$env:PATH += ";$env:LOCALAPPDATA\Programs\Python\Python312;$env:LOCALAPPDATA\Programs\Python\Python312\Scripts"
```

### macOS

Use [Homebrew](https://brew.sh):

```bash
brew install python@3.12
python3 --version
```

Add to your shell profile (`~/.zshrc`):

```bash
export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"
```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3.12-dev python3-pip
python3.12 --version
```

### Verify pip is up to date

```bash
python -m pip install --upgrade pip
pip --version
```

---

## 2. Create a Virtual Environment

A virtual environment isolates project dependencies so versions do not clash between projects.

### Step-by-step

```powershell
# 1. Navigate to your project root
cd C:\Projects

# 2. Create the project folder
mkdir myproject
cd myproject

# 3. Create the virtual environment
python -m venv .venv

# 4. Activate it
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

Your shell prompt now shows `(.venv)`.

### PowerShell execution policy fix (Windows only)

If you see `running scripts is disabled on this system`:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Deactivate when done

```bash
deactivate
```

### .gitignore for the venv

Always exclude it from version control:

```gitignore
.venv/
__pycache__/
*.pyc
*.pyo
.env
```

---

## 3. Install Django

```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Install latest Django
pip install django

# Pin to a specific LTS version (recommended for production)
pip install "django==4.2.*"

# Verify
python -m django --version   # 4.2.x or 5.x
```

---

## 4. Create a Django Project

```powershell
# django-admin startproject <config_name> <target_dir>
# Using "." puts all files directly in the current folder
django-admin startproject config .
```

Your directory structure:

```
myproject/
  config/
    __init__.py
    asgi.py
    settings.py
    urls.py
    wsgi.py
  manage.py
  .venv/
```

### Run the development server

```powershell
python manage.py runserver
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). You should see the Django rocket page.

### Change the port

```powershell
python manage.py runserver 8080
python manage.py runserver 0.0.0.0:8000   # accessible on your LAN
```

---

## 5. Create a Django App

A project contains one or more **apps** — reusable components with models, views, and templates.

```powershell
python manage.py startapp blog
```

Register it immediately in `config/settings.py`:

```python
INSTALLED_APPS = [
    # ... built-in apps ...
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Your app:
    'blog',
]
```

---

## 6. Install Developer Tooling

### All-in-one install

```powershell
pip install \
  django-debug-toolbar \
  black \
  ruff \
  mypy \
  django-stubs \
  pytest \
  pytest-django \
  factory-boy \
  coverage \
  ipython
```

### Save dependencies

```powershell
pip freeze > requirements.txt
```

Install on another machine:

```powershell
pip install -r requirements.txt
```

---

## 7. Configure django-debug-toolbar

`django-debug-toolbar` shows SQL queries, cache calls, template rendering time, and more in the browser.

### Install

```powershell
pip install django-debug-toolbar
```

### settings.py (development only)

```python
import os

INSTALLED_APPS = [
    # ...
    'debug_toolbar',
]

MIDDLEWARE = [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    # ... other middleware
]

# Only allow localhost
INTERNAL_IPS = ['127.0.0.1']
```

### urls.py

```python
from django.conf import settings
from django.urls import include, path

urlpatterns = [
    # ...
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
```

---

## 8. Configure Black (code formatter)

Black enforces consistent code style without configuration debates.

Create `pyproject.toml`:

```toml
[tool.black]
line-length = 88
target-version = ["py312"]
```

Format your code:

```powershell
black .
```

---

## 9. Configure Ruff (linter)

Ruff is an extremely fast linter written in Rust.

`pyproject.toml`:

```toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP"]
ignore = ["E501"]

[tool.ruff.lint.isort]
known-first-party = ["config"]
```

Run:

```powershell
ruff check .          # lint
ruff check --fix .    # auto-fix safe issues
```

---

## 10. Configure mypy (type checker)

`pyproject.toml`:

```toml
[tool.mypy]
python_version = "3.12"
django_settings_module = "config.settings"
plugins = ["mypy_django_plugin.main"]
strict = true
ignore_missing_imports = true
```

Run:

```powershell
mypy .
```

---

## 11. Configure pytest-django

Create `pytest.ini` (or add to `pyproject.toml`):

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_test.py
```

Or in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings"
python_files = ["tests.py", "test_*.py"]
```

Run tests:

```powershell
pytest
pytest -v                 # verbose
pytest --cov=. --cov-report=html   # with coverage
```

---

## 12. First Health Check Endpoint

Add a simple status endpoint to verify your setup end-to-end.

`config/urls.py`:

```python
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def health(request):
    return JsonResponse({'status': 'ok', 'django': 'running'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health, name='health'),
]
```

Run the server and test:

```powershell
python manage.py runserver
# In another terminal:
curl http://127.0.0.1:8000/health/
# {"status": "ok", "django": "running"}
```

---

## 13. Database setup (SQLite default)

Django uses SQLite by default — no setup needed for development.

Run migrations to create the initial schema:

```powershell
python manage.py migrate
```

Create a superuser for the admin:

```powershell
python manage.py createsuperuser
# Username: admin
# Email: admin@example.com
# Password: (choose a strong one)
```

Visit [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/).

---

## 14. VS Code Setup

Install the **Python** extension by Microsoft, then add `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": ".venv/Scripts/python.exe",
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "python.linting.ruffEnabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["."]
}
```

---

## 15. Environment Variables with python-dotenv

Never put secrets in settings.py directly.

```powershell
pip install python-dotenv
```

Create `.env` in the project root:

```dotenv
SECRET_KEY=your-development-secret-key-here
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=127.0.0.1,localhost
```

Load it in `settings.py`:

```python
from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ['SECRET_KEY']
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
```

---

## Summary Checklist

| Step | Command |
|---|---|
| Install Python | `python --version` |
| Create venv | `python -m venv .venv` |
| Activate venv | `.\.venv\Scripts\Activate.ps1` |
| Install Django | `pip install django` |
| Create project | `django-admin startproject config .` |
| Run server | `python manage.py runserver` |
| Run migrations | `python manage.py migrate` |
| Create superuser | `python manage.py createsuperuser` |
| Install tools | `pip install black ruff pytest pytest-django` |
| Save deps | `pip freeze > requirements.txt` |
