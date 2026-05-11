---
id: virtual-environments-venv-and-uv
slug: /virtual-environments-venv-and-uv
sidebar_position: 29
description: "Python virtual environment management with venv, pip, pip-tools, and uv."
---

# Virtual Environments — venv and uv

## Overview

Isolating project dependencies from the system Python installation is non-negotiable for reliable,
reproducible Django projects. This guide covers the standard `venv`/`pip` toolchain, `pip-tools`
for deterministic lockfiles, and the modern `uv` tool which replaces both pip and venv with a
faster, Rust-based alternative.

---

## 1. Standard venv Workflow

### Create and activate

```bash
# Create
python -m venv .venv

# Activate — Linux / macOS
source .venv/bin/activate

# Activate — Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate — Windows (CMD)
.venv\Scripts\activate.bat
```

The shell prompt changes to show `(.venv)` when active.

### Install packages

```bash
pip install django djangorestframework pillow

# Verify installation
pip list | grep -i django
```

### Freeze dependencies

```bash
pip freeze > requirements.txt
```

The `requirements.txt` file captures every installed package and exact version:

```
Django==5.0.3
djangorestframework==3.15.1
pillow==10.3.0
```

### Recreate environment from requirements

```bash
python -m venv .venv
source .venv/bin/activate   # or Windows equivalent
pip install -r requirements.txt
```

---

## 2. Separate Development and Production Requirements

Keep dev-only tools (testing, linting) out of production images.

```
requirements/
    base.txt        # shared across all environments
    production.txt  # adds gunicorn, psycopg2-binary, sentry-sdk
    development.txt # adds pytest, black, ruff, django-debug-toolbar
```

```
# requirements/base.txt
Django==5.0.3
djangorestframework==3.15.1
Pillow==10.3.0
```

```
# requirements/production.txt
-r base.txt
gunicorn==22.0.0
psycopg2-binary==2.9.9
sentry-sdk==2.1.1
```

```
# requirements/development.txt
-r base.txt
pytest==8.1.1
pytest-django==4.8.0
black==24.3.0
ruff==0.4.1
django-debug-toolbar==4.3.0
coverage==7.4.4
```

```bash
# Development install
pip install -r requirements/development.txt

# Production install
pip install -r requirements/production.txt
```

---

## 3. pip-tools for Deterministic Lockfiles

`pip-tools` separates abstract requirements (what you need) from locked requirements (exact versions
with all transitive dependencies resolved):

```bash
pip install pip-tools
```

```
# requirements/base.in  (abstract)
Django>=5.0
djangorestframework>=3.15
Pillow>=10.0
```

```bash
# Resolve and lock
pip-compile requirements/base.in -o requirements/base.txt

# Upgrade all packages to latest compatible versions
pip-compile --upgrade requirements/base.in -o requirements/base.txt

# Sync environment to locked file (removes unneeded packages too)
pip-sync requirements/development.txt
```

The generated `requirements/base.txt` includes hashes for reproducibility:

```
django==5.0.3 \
    --hash=sha256:abc123...
```

---

## 4. uv — Fast Modern Tooling

`uv` is a Rust-based tool by Astral that replaces `pip`, `venv`, `pip-tools`, and `virtualenv`.
It is 10–100x faster than pip for resolving and installing packages.

### Install uv

```bash
# Linux / macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verify
uv --version
```

### Create and use a project

```bash
# Create new project with virtual environment
uv init myproject
cd myproject
# .venv is created automatically

# Add dependencies
uv add django djangorestframework pillow

# Add dev-only dependencies
uv add --dev pytest pytest-django black ruff coverage

# Run commands in the venv without activating
uv run python manage.py runserver
uv run pytest
uv run black .
```

### uv with an existing project

```bash
# Initialise uv in existing project (creates pyproject.toml if missing)
uv init

# Install from requirements.txt
uv pip install -r requirements.txt

# Sync from pyproject.toml
uv sync

# Sync with dev dependencies included
uv sync --dev
```

### uv project structure (`pyproject.toml`)

```toml
[project]
name = "myproject"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "django>=5.0",
    "djangorestframework>=3.15",
    "pillow>=10.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0",
    "pytest-django>=4.8",
    "black>=24.0",
    "ruff>=0.4",
    "coverage>=7.0",
]

[tool.uv]
dev-dependencies = []
```

### uv lockfile

Running `uv add` or `uv sync` generates `uv.lock` — a detailed cross-platform lockfile that
replaces `requirements.txt`. Commit this file to version control.

```bash
# Check for outdated dependencies
uv lock --check

# Upgrade a specific package
uv add django@latest

# Upgrade all
uv lock --upgrade
```

---

## 5. .gitignore for Virtual Environments

```
# .gitignore
.venv/
venv/
env/
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/
.uv/
```

---

## 6. Python Version Management

### With pyenv (Linux / macOS)

```bash
# Install Python 3.12
pyenv install 3.12.3

# Set project Python version
pyenv local 3.12.3

# uv reads .python-version automatically
uv python install 3.12
```

### With py launcher (Windows)

```powershell
# List installed versions
py --list

# Create venv with specific version
py -3.12 -m venv .venv
```

### With uv

```bash
# Install a specific Python version
uv python install 3.12.3

# Pin project Python version
uv python pin 3.12.3   # writes .python-version

# Create venv with specific version
uv venv --python 3.12
```

---

## 7. Environment Variables with python-decouple

```bash
pip install python-decouple   # or: uv add python-decouple
```

```python
# settings.py
from decouple import config, Csv

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv(), default='localhost,127.0.0.1')
DATABASE_URL = config('DATABASE_URL', default='sqlite:///db.sqlite3')
```

```
# .env (never commit this file)
SECRET_KEY=your-very-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://user:pass@localhost/dbname
```

---

## Quick Reference

| Task | venv / pip | uv |
|---|---|---|
| Create environment | `python -m venv .venv` | `uv venv` or `uv init` |
| Activate | `source .venv/bin/activate` | Not required — use `uv run` |
| Install package | `pip install django` | `uv add django` |
| Install requirements | `pip install -r requirements.txt` | `uv pip install -r requirements.txt` |
| Freeze lockfile | `pip freeze > requirements.txt` | `uv lock` (creates `uv.lock`) |
| Sync environment | `pip-sync requirements.txt` | `uv sync` |
| Run command | `.venv/bin/python manage.py ...` | `uv run python manage.py ...` |
| Dev dependencies | Separate `requirements/development.txt` | `uv add --dev pkg` |
