---
id: ci-cd-for-django
slug: /ci-cd-for-django
sidebar_position: 35
description: "CI/CD for Django with GitHub Actions: test, lint, build Docker, and deploy automatically."
---

# CI/CD for Django

## Overview

A CI/CD pipeline for Django automates testing, linting, security scanning, Docker image
building, and deployment on every push. This guide covers GitHub Actions workflows for all
four stages, with separate jobs per concern and deployment to a VPS via SSH or Docker Hub.

---

## 1. Directory Structure

```text
.github/
  workflows/
    ci.yml          # test + lint on every push
    cd.yml          # build + deploy on main branch merge
```

---

## 2. Test and Lint Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test (Python ${{ matrix.python-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: mysite
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: mysite_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U mysite"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    env:
      DATABASE_URL: postgres://mysite:secret@localhost:5432/mysite_test
      REDIS_URL: redis://localhost:6379/0
      SECRET_KEY: ci-test-secret-key-not-for-production
      DJANGO_SETTINGS_MODULE: config.settings.test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements/development.txt

      - name: Run migrations
        run: python manage.py migrate --noinput

      - name: Run tests
        run: pytest --cov=. --cov-report=xml --cov-fail-under=80

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: coverage.xml
          fail_ci_if_error: false

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - run: pip install ruff mypy django-stubs

      - name: Ruff lint
        run: ruff check .

      - name: Ruff format check
        run: ruff format --check .

      - name: Type check
        run: mypy . --ignore-missing-imports

  security:
    name: Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install pip-audit bandit
      - name: Audit dependencies
        run: pip-audit -r requirements/production.txt
      - name: Static analysis
        run: bandit -r . -x tests,migrations -ll
```

---

## 3. Build and Deploy Workflow

```yaml
# .github/workflows/cd.yml
name: CD

on:
  push:
    branches: [main]

jobs:
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.meta.outputs.tags }}

    steps:
      - uses: actions/checkout@v4

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=sha-

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/setup-buildx-action@v3

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build]
    environment: production

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /srv/mysite
            docker compose pull web
            docker compose up -d --no-deps web
            docker compose exec -T web python manage.py migrate --noinput
            docker compose exec -T web python manage.py collectstatic --noinput
            echo "Deployed $(date)"
```

---

## 4. Required GitHub Secrets

| Secret | Value |
|---|---|
| `PROD_HOST` | IP or hostname of production server |
| `PROD_USER` | SSH user (e.g. `deploy`) |
| `PROD_SSH_KEY` | Private SSH key (RSA or Ed25519) |

Set under **Settings → Secrets → Actions** in the repository.

---

## 5. Ruff Configuration

```toml
# ruff.toml
line-length = 88
target-version = "py312"

[lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM"]
ignore = ["E501"]   # line-length handled by formatter

[lint.per-file-ignores]
"*/migrations/*.py" = ["N"]    # migration name conventions differ
"tests/*" = ["S101"]           # allow asserts in tests
```

---

## 6. Pre-commit Hooks (local)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
      - id: ruff-format

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-merge-conflict
      - id: detect-private-key
```

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files   # run once on existing code
```

---

## Quick Reference

| Stage | Tool |
|---|---|
| Test runner | `pytest` with `pytest-django` |
| Lint + format | `ruff check .` / `ruff format .` |
| Type checking | `mypy` with `django-stubs` |
| Dependency audit | `pip-audit` |
| Static analysis | `bandit` |
| Docker image build | `docker/build-push-action` with GHCR |
| Remote deploy | `appleboy/ssh-action` |
| Local pre-commit | `pre-commit install` |
| Coverage report | `codecov/codecov-action` |
| Matrix testing | `strategy.matrix.python-version` |
