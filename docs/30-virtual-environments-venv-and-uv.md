# Virtual Environments: venv and uv

## Definition

Virtual environments isolate project dependencies from system Python,
preventing version conflicts.

## Using venv

Create:

```powershell
python -m venv .venv
```

Activate:

```powershell
.\.venv\Scripts\Activate.ps1
```

Deactivate:

```powershell
deactivate
```

Create requirements file:

```powershell
pip freeze > requirements.txt
```

Install from requirements:

```powershell
pip install -r requirements.txt
```

## Using uv (Modern Alternative)

Install uv:

```powershell
pip install uv
```

Create project:

```powershell
uv venv .venv
```

Activate:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install packages (faster than pip):

```powershell
uv pip install django
uv pip install -r requirements.txt
```

## Best Practices

- Always activate venv before installing packages.
- Commit requirements.txt to version control.
- Use separate requirements files for dev and prod:
  - requirements/base.txt
  - requirements/dev.txt
  - requirements/prod.txt

## pyproject.toml (Modern Approach)

```toml
[project]
name = "myapp"
version = "1.0.0"
dependencies = [
  "django==5.0.0",
  "djangorestframework==3.14.0",
]

[project.optional-dependencies]
dev = [
  "pytest-django",
  "black",
  "ruff",
]

[build-system]
requires = ["setuptools"]
build-backend = "setuptools.build_meta"
```

Install with uv:

```powershell
uv sync
uv sync --extra dev
```
