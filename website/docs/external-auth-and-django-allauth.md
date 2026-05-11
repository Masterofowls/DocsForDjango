---
id: external-auth-and-django-allauth
slug: /external-auth-and-django-allauth
sidebar_position: 16
description: "Social login, email verification, and OAuth with django-allauth."
---

# External Auth and django-allauth

## Overview

`django-allauth` provides a complete authentication ecosystem: email/password, email verification,
password reset, and social authentication (Google, GitHub, Apple, and 100+ providers) with a
single consistent API. This guide covers installation, email auth, social auth, and customisation.

---

## 1. Installation

```powershell
pip install django-allauth
pip install django-allauth[socialaccount]   # includes social providers
```

### settings.py

```python
INSTALLED_APPS = [
    # ...
    'django.contrib.sites',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    # Social providers — add only what you need
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
]

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',          # admin login
    'allauth.account.auth_backends.AuthenticationBackend', # allauth
]

# Email is the unique identifier (not username)
ACCOUNT_LOGIN_METHODS = {'email'}                # allauth 0.65+
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'        # 'optional' or 'none'
ACCOUNT_USERNAME_REQUIRED = False               # optional — drop username

# Redirects
LOGIN_REDIRECT_URL = '/dashboard/'
ACCOUNT_LOGOUT_REDIRECT_URL = '/'
```

### URL configuration

```python
# config/urls.py
urlpatterns = [
    path('accounts/', include('allauth.urls')),
    # Provides: /accounts/signup/, /accounts/login/, /accounts/logout/,
    # /accounts/email/, /accounts/password/*, /accounts/confirm-email/*
    # /accounts/social/*, /accounts/google/login/, etc.
]
```

### Apply migrations

```powershell
python manage.py migrate
python manage.py createcachetable   # if using DatabaseCache
```

---

## 2. Email Backend (Development)

During development use the console backend to see emails in the terminal:

```python
# settings/development.py
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

### Production email (SMTP)

```python
# settings/production.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'       # or smtp.mailgun.org, smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = env('SENDGRID_API_KEY')
DEFAULT_FROM_EMAIL = 'noreply@myapp.com'
```

---

## 3. Templates

Create override templates in `templates/account/`:

```
templates/
  account/
    login.html
    signup.html
    email.html            ← manage email addresses
    email_confirm.html    ← confirm email landing page
    password_change.html
    password_reset.html
    password_reset_done.html
    password_reset_from_key.html
  socialaccount/
    login.html
    signup.html
```

```html
<!-- templates/account/login.html -->
{% extends 'base.html' %}
{% load allauth account %}

{% block content %}
<h1>Log In</h1>
<form method="post">
  {% csrf_token %}
  {% render_form form %}
  <button type="submit">Log In</button>
</form>

{% get_providers as socialaccount_providers %}
{% if socialaccount_providers %}
  <hr>
  <h2>Or log in with</h2>
  {% include 'socialaccount/snippets/provider_list.html' %}
{% endif %}

<p><a href="{% url 'account_signup' %}">No account? Register</a></p>
{% endblock %}
```

---

## 4. Social Authentication — Google

### Step 1 — Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Enable **Google+ API** / **OAuth consent screen**
4. Create credentials → **OAuth client ID** → Web application
5. Authorised redirect URIs: `http://localhost:8000/accounts/google/login/callback/`

### Step 2 — Add to database (via admin)

```
1. Go to /admin/ → Sites → Change "example.com" to "localhost:8000" (dev)
2. Go to Social Applications → Add Social Application
   - Provider: Google
   - Name: Google
   - Client ID: <your OAuth client id>
   - Secret: <your client secret>
   - Sites: move your site to Chosen sites
3. Save
```

### Step 3 — Add to settings

```python
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'OAUTH_PKCE_ENABLED': True,
    }
}
```

### Step 4 — Login button in template

```html
{% load socialaccount %}
<a href="{% provider_login_url 'google' %}">
  Log in with Google
</a>
```

---

## 5. Social Authentication — GitHub

### Step 1 — GitHub OAuth App setup

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `http://localhost:8000`
3. Callback URL: `http://localhost:8000/accounts/github/login/callback/`

### Step 2 — Add to database (via management command)

```powershell
# Or via admin panel same as Google (Step 2 above)
```

### Step 3 — Settings

```python
SOCIALACCOUNT_PROVIDERS = {
    'github': {
        'SCOPE': ['user:email'],
    }
}
```

### Step 4 — Login button

```html
{% load socialaccount %}
<a href="{% provider_login_url 'github' %}">Log in with GitHub</a>
```

---

## 6. Customising Account Behaviour

### Custom signup form (extra fields)

```python
# accounts/forms.py
from allauth.account.forms import SignupForm
from django import forms


class CustomSignupForm(SignupForm):
    first_name = forms.CharField(max_length=30, label='First name')
    last_name = forms.CharField(max_length=30, label='Last name')

    def save(self, request):
        user = super().save(request)
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.save()
        return user
```

```python
# settings.py
ACCOUNT_SIGNUP_FORM_CLASS = 'accounts.forms.CustomSignupForm'
```

### Account adapter

```python
# accounts/adapters.py
from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class CustomAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        return getattr(settings, 'ALLOW_REGISTRATION', True)

    def get_login_redirect_url(self, request):
        if request.user.is_staff:
            return '/admin/'
        return '/dashboard/'
```

```python
# settings.py
ACCOUNT_ADAPTER = 'accounts.adapters.CustomAccountAdapter'
```

### Social account adapter (link accounts by email)

```python
# accounts/adapters.py (continued)
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """Auto-link social account to existing user with same email."""
        from allauth.account.models import EmailAddress
        if sociallogin.is_existing:
            return
        email = sociallogin.account.extra_data.get('email')
        if not email:
            return
        try:
            email_address = EmailAddress.objects.get(email__iexact=email)
            sociallogin.connect(request, email_address.user)
        except EmailAddress.DoesNotExist:
            pass
```

```python
# settings.py
SOCIALACCOUNT_ADAPTER = 'accounts.adapters.CustomSocialAccountAdapter'
```

---

## 7. Profile Update View

```python
# accounts/views.py
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import ProfileForm


@login_required
def profile(request):
    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            return redirect('accounts:profile')
    else:
        form = ProfileForm(instance=request.user)
    return render(request, 'accounts/profile.html', {'form': form})
```

---

## 8. Signals — Post-Registration Hook

```python
# accounts/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from allauth.account.signals import user_signed_up
from .models import Profile


@receiver(user_signed_up)
def on_user_signed_up(request, user, **kwargs):
    """Called after allauth completes sign-up (social or email)."""
    Profile.objects.get_or_create(user=user)
    # Send welcome email, set defaults, etc.
```

---

## Quick Reference

| Setting | Value |
|---|---|
| Login by email | `ACCOUNT_LOGIN_METHODS = {'email'}` |
| Email verification | `ACCOUNT_EMAIL_VERIFICATION = 'mandatory'` |
| Custom signup form | `ACCOUNT_SIGNUP_FORM_CLASS = 'app.forms.MyForm'` |
| Custom adapter | `ACCOUNT_ADAPTER = 'app.adapters.MyAdapter'` |
| Social adapter | `SOCIALACCOUNT_ADAPTER = 'app.adapters.MySocialAdapter'` |
| Social scopes | `SOCIALACCOUNT_PROVIDERS = {'google': {'SCOPE': [...]}}` |
| Login URL | `{% provider_login_url 'google' %}` |
| Post-signup hook | `user_signed_up` signal |
