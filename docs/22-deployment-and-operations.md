# Deployment and Operations

## Definition

Deployment is the release workflow from code to stable production runtime.

## Baseline Flow

1. build container/image
2. run tests
3. apply migrations
4. collect static files
5. deploy app + health checks

## Command Syntax

```powershell
python manage.py migrate
python manage.py collectstatic --noinput
```

## App Servers

- WSGI: Gunicorn + Nginx
- ASGI: Uvicorn/Daphne + reverse proxy

## Operational Checklist

- database backups
- secret rotation
- rolling or blue/green deploys
- health/readiness probes
- rollback plan
