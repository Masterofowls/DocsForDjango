# Troubleshooting Guide

## Common Errors

### `DisallowedHost`

Cause: host not in `ALLOWED_HOSTS`.
Fix: add host/domain and redeploy.

### `OperationalError: no such table`

Cause: migrations not applied.
Fix:

```powershell
python manage.py makemigrations
python manage.py migrate
```

### Static files missing in production

Cause: static files not collected or misconfigured static root.
Fix:

```powershell
python manage.py collectstatic --noinput
```

### Auth redirects looping

Cause: login URL misconfigured or permission middleware conflict.
Fix: verify `LOGIN_URL`, route names, and decorators.

## Debug Tactics

- inspect application logs first
- reproduce locally with same env vars
- isolate failing app and endpoint
- add temporary instrumentation and remove after fix
