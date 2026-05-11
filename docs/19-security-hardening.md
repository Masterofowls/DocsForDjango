# Security Hardening

## Core Security Controls

- CSRF protection
- automatic template escaping
- SQL injection protection via ORM
- clickjacking protection

## Production Settings Syntax

```python
DEBUG = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

## Input and Output Security

- validate all external input
- sanitize uploaded files
- avoid `mark_safe` unless necessary
- enforce strict permission checks

## Password and Auth Controls

- strong password validators
- lockout/rate limiting for login endpoints
- MFA for admin users
