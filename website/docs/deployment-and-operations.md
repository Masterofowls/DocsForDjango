---
id: deployment-and-operations
slug: /deployment-and-operations
sidebar_position: 34
description: "Deploy Django to production with Gunicorn, Nginx, PostgreSQL, systemd, and Docker."
---

# Deployment and Operations

## Overview

Production Django deployment involves four moving parts: an application server (Gunicorn),
a reverse proxy (Nginx), a database (PostgreSQL), and a process manager (systemd or Docker).
This guide covers all four with a focus on security, reliability, and zero-downtime upgrades.

---

## 1. Production Requirements

```text
# requirements/production.txt
-r base.txt
gunicorn==21.2.0
psycopg[binary]==3.1.18
django-redis==5.4.0
sentry-sdk[django]==2.6.0
django-environ==0.11.2
whitenoise[brotli]==6.7.0
```

---

## 2. Production Settings

```python
# config/settings/production.py
from .base import *
import environ

env = environ.Env()
environ.Env.read_env('/etc/mysite/.env')

DEBUG = False
SECRET_KEY = env('SECRET_KEY')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

DATABASES = {'default': env.db('DATABASE_URL')}
CACHES = {'default': env.cache('REDIS_URL')}

# Static files — served via WhiteNoise (no need for Nginx to serve /static/)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# HTTPS
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Logging to stdout (systemd / Docker captures it)
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
```

---

## 3. Gunicorn Configuration

```python
# gunicorn.conf.py
import multiprocessing

bind = '127.0.0.1:8000'
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'          # or 'gevent' for I/O-heavy apps
worker_connections = 1000
timeout = 30
keepalive = 2

accesslog = '-'    # stdout
errorlog = '-'     # stdout
loglevel = 'info'
capture_output = True

# Reload on code changes (only in staging)
# reload = True

# Limit request line and headers
limit_request_line = 4094
limit_request_fields = 100
```

Start manually:

```bash
gunicorn config.wsgi:application --config gunicorn.conf.py
```

---

## 4. systemd Service

```ini
# /etc/systemd/system/mysite.service
[Unit]
Description=mysite Gunicorn daemon
Requires=mysite.socket
After=network.target

[Service]
Type=notify
User=mysite
Group=mysite
RuntimeDirectory=gunicorn
WorkingDirectory=/srv/mysite
ExecStart=/srv/mysite/venv/bin/gunicorn config.wsgi:application --config /srv/mysite/gunicorn.conf.py
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
EnvironmentFile=/etc/mysite/.env

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/mysite.socket
[Unit]
Description=mysite Gunicorn socket

[Socket]
ListenStream=/run/mysite.sock
SocketUser=www-data

[Install]
WantedBy=sockets.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mysite.socket
sudo systemctl enable --now mysite
sudo systemctl status mysite
```

---

## 5. Nginx Configuration

```nginx
# /etc/nginx/sites-available/mysite
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location / {
        proxy_pass http://unix:/run/mysite.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    location /media/ {
        alias /srv/mysite/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Deploy Script

```bash
#!/usr/bin/env bash
# deploy.sh — run on the server as the mysite user
set -e

APP=/srv/mysite
VENV=$APP/venv

cd $APP
git pull origin main

$VENV/bin/pip install -r requirements/production.txt --quiet
$VENV/bin/python manage.py migrate --noinput
$VENV/bin/python manage.py collectstatic --noinput --clear

# Graceful reload (no downtime)
sudo systemctl kill -s HUP mysite
echo "Deploy complete"
```

---

## 7. Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements/production.txt .
RUN pip install --no-cache-dir -r production.txt

COPY . .
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--config", "gunicorn.conf.py"]
```

```yaml
# docker-compose.yml
services:
  web:
    build: .
    env_file: .env
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"
    volumes:
      - media:/app/media

  db:
    image: postgres:16-alpine
    env_file: .env
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
  media:
```

---

## Quick Reference

| Task | Command |
|---|---|
| Collect static files | `python manage.py collectstatic --noinput` |
| Apply migrations | `python manage.py migrate --noinput` |
| Start Gunicorn (systemd) | `sudo systemctl start mysite` |
| Graceful reload | `sudo systemctl kill -s HUP mysite` |
| Reload Nginx | `sudo systemctl reload nginx` |
| View app logs | `journalctl -u mysite -f` |
| SSL certificate | `certbot --nginx -d example.com` |
| Deploy check | `python manage.py check --deploy` |
| DB shell | `python manage.py dbshell` |
| Create superuser | `python manage.py createsuperuser` |
