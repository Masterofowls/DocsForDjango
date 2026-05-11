---
id: security-hardening
slug: /security-hardening
sidebar_position: 31
description: "Django security hardening: HTTPS, CSRF, headers, SQL injection, secrets, and OWASP Top 10."
---

# Security Hardening

## Overview

Django ships with many security features out of the box, but they require deliberate configuration.
This guide covers OWASP Top 10 mitigations in the Django context: input validation, authentication
hardening, HTTPS enforcement, HTTP security headers, secrets management, and rate limiting.

---

## 1. Production Settings Checklist

```python
# config/settings/production.py
from .base import *

# 1. HTTPS enforcement
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000          # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# 2. Frame options (clickjacking)
X_FRAME_OPTIONS = 'DENY'

# 3. Content type sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# 4. XSS filter (legacy header, still useful)
SECURE_BROWSER_XSS_FILTER = True

# 5. Referrer policy
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# 6. Allowed hosts — never '*' in production
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

# 7. Debug MUST be False
DEBUG = False
```

Run Django's built-in security check before every deployment:

```bash
python manage.py check --deploy
```

---

## 2. Secret Key Management

Never hard-code `SECRET_KEY` or any credentials:

```python
# settings/base.py
import environ

env = environ.Env()
environ.Env.read_env('.env')

SECRET_KEY = env('SECRET_KEY')
DATABASE_URL = env.db()
```

Generate a strong secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

```
# .env — never commit this file
SECRET_KEY=django-insecure-REPLACE-WITH-64-CHAR-RANDOM-STRING
```

```
# .gitignore
.env
*.env
secrets/
```

---

## 3. SQL Injection Prevention

Always use the ORM. The ORM parameterises all queries:

```python
# SAFE — ORM parameterises automatically
users = User.objects.filter(username=request.GET['username'])

# SAFE — raw query with bound parameters
users = User.objects.raw(
    'SELECT * FROM auth_user WHERE username = %s',
    [request.GET['username']]
)

# DANGEROUS — never do this
username = request.GET['username']
users = User.objects.raw(f'SELECT * FROM auth_user WHERE username = "{username}"')
```

---

## 4. Cross-Site Scripting (XSS)

Django's template engine escapes by default. Rules to follow:

```html
<!-- SAFE — auto-escaped -->
<p>{{ user.bio }}</p>

<!-- UNSAFE — mark_safe bypasses escaping -->
<p>{{ user.bio|safe }}</p>   <!-- Only use if content is pre-sanitised -->
```

For user-generated HTML (rich text editors), sanitise with `bleach`:

```bash
pip install bleach
```

```python
import bleach

ALLOWED_TAGS = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'blockquote', 'h2', 'h3']
ALLOWED_ATTRIBUTES = {'a': ['href', 'rel']}
ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']

def sanitise_html(html: str) -> str:
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
```

```python
# models.py
from django.db import models

class Post(models.Model):
    body_raw = models.TextField()           # raw user input
    body_html = models.TextField(blank=True)  # sanitised HTML

    def save(self, *args, **kwargs):
        self.body_html = sanitise_html(self.body_raw)
        super().save(*args, **kwargs)
```

---

## 5. CSRF Protection

Django's `CsrfViewMiddleware` is enabled by default. For AJAX:

```javascript
// Get CSRF token from cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Include in AJAX headers
fetch('/api/endpoint/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify({ key: 'value' }),
});
```

For DRF with session authentication, configure CSRF:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',  # enforces CSRF
        'rest_framework.authentication.TokenAuthentication',    # token = no CSRF needed
    ],
}
```

---

## 6. Password Security

```python
# settings.py
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Use Argon2 (stronger than PBKDF2)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]
```

```bash
pip install argon2-cffi bcrypt
```

---

## 7. Rate Limiting

```bash
pip install django-ratelimit
```

```python
# views.py
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', block=True)
def login_view(request):
    ...

@ratelimit(key='user', rate='100/h', block=True)
@login_required
def api_expensive_endpoint(request):
    ...
```

---

## 8. Sensitive Data in Logs

```python
# Never log passwords, tokens, or PII
import logging
logger = logging.getLogger(__name__)

# BAD
logger.info(f'Login attempt: user={request.POST["username"]} pass={request.POST["password"]}')

# GOOD
logger.info(f'Login attempt: user={request.POST.get("username")}')
```

Configure log filtering to scrub sensitive fields:

```python
# settings.py
LOGGING = {
    'version': 1,
    'filters': {
        'require_debug_false': {'()': 'django.utils.log.RequireDebugFalse'},
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
}
```

---

## 9. File Upload Security

```python
# forms.py
import magic  # python-magic

ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'application/pdf'}
MAX_UPLOAD_MB = 10

def clean_file(self):
    f = self.cleaned_data['file']
    if f.size > MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(f'File too large. Maximum {MAX_UPLOAD_MB} MB.')
    # Validate MIME from content, not filename extension
    mime = magic.from_buffer(f.read(2048), mime=True)
    f.seek(0)
    if mime not in ALLOWED_TYPES:
        raise ValidationError(f'Unsupported file type: {mime}')
    return f
```

```python
# settings.py
MEDIA_ROOT = '/srv/media/'         # outside web root
MEDIA_URL = '/media/'

# Never serve user uploads via Nginx directly — serve via Django view with auth check:
# X-Accel-Redirect (Nginx) or FileResponse (Django)
```

---

## Quick Reference

| Threat | Django Mitigation |
|---|---|
| SQL injection | Always use ORM; parameterise raw queries |
| XSS | Template auto-escaping; `bleach` for user HTML |
| CSRF | `CsrfViewMiddleware` (default on); `X-CSRFToken` for AJAX |
| Clickjacking | `X_FRAME_OPTIONS = 'DENY'` |
| Insecure transport | `SECURE_SSL_REDIRECT = True` + HSTS |
| Sensitive data exposure | `DEBUG=False`; HTTPS; never log passwords |
| Broken auth | Argon2 hasher; 12-char min password; rate-limit login |
| Malicious uploads | Validate MIME from content; limit size; store outside web root |
| Secrets in code | `django-environ`; `.env` in `.gitignore` |
| Deployment check | `python manage.py check --deploy` |
