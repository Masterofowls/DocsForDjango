# External Auth Services and Django-Allauth

## Django-Allauth Installation

```powershell
pip install django-allauth
```

## Settings Configuration

```python
INSTALLED_APPS = [
  # ...
  'django.contrib.sites',
  'allauth',
  'allauth.account',
  'allauth.socialaccount',
  'allauth.socialaccount.providers.google',
  'allauth.socialaccount.providers.github',
]

AUTHENTICATION_BACKENDS = [
  'django.contrib.auth.backends.ModelBackend',
  'allauth.account.auth_backends.AuthenticationBackend',
]

SITE_ID = 1

# Allauth settings
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_AUTHENTICATION_METHOD = 'email'
LOGIN_REDIRECT_URL = '/'
ACCOUNT_LOGOUT_REDIRECT_URL = '/'
```

## Social Provider Setup

Google OAuth:

1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials (Client ID, Client Secret)
3. Add to Django admin: Sites → Socialaccount Providers → Google

Settings:

```python
SOCIALACCOUNT_PROVIDERS = {
  'google': {
    'SCOPE': [
      'profile',
      'email',
    ],
    'AUTH_PARAMS': {
      'access_type': 'online',
    },
  },
}
```

## Custom OAuth Backend

```python
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
  def pre_social_login(self, request, sociallogin):
    if sociallogin.is_existing:
      return

    if sociallogin.account.provider == 'google':
      user = sociallogin.user
      user.first_name = sociallogin.account.extra_data.get('given_name', '')
      user.last_name = sociallogin.account.extra_data.get('family_name', '')
```

Register in settings:

```python
SOCIALACCOUNT_ADAPTER = 'accounts.adapters.CustomSocialAccountAdapter'
```

## Template Usage

Login link:

```html
<a href='{% provider_login_url "google" %}'>Sign in with Google</a>
```

## Custom Authentication Backend

```python
from django.contrib.auth.backends import BaseBackend


class EmailBackend(BaseBackend):
  def authenticate(self, request, username=None, password=None):
    try:
      user = User.objects.get(email=username)
      if user.check_password(password):
        return user
    except User.DoesNotExist:
      pass
    return None

  def get_user(self, user_id):
    try:
      return User.objects.get(pk=user_id)
    except User.DoesNotExist:
      return None
```
