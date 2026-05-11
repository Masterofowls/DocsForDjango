---
id: users-auth-and-permissions
slug: /users-auth-and-permissions
sidebar_position: 14
description: "Django authentication, custom user models, login/logout, permissions, and groups."
---

# Users, Auth, and Permissions

## Overview

Django ships with a full authentication system: users, passwords, groups, permissions, and session
management. This guide covers the built-in auth app, building a custom User model, login/logout
views, restricting access, and setting up fine-grained permissions.

---

## 1. Custom User Model (Do This First!)

Always create a custom User model at the start of a project. Changing it later is very painful.

### Step 1 — Create an accounts app

```powershell
python manage.py startapp accounts
```

### Step 2 — Define the custom model

```python
# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model — add extra fields here."""
    email = models.EmailField(unique=True)   # make email unique
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    bio = models.TextField(blank=True)

    # Use email as the login identifier
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']   # required for createsuperuser besides email

    def __str__(self):
        return self.email
```

### Step 3 — Point AUTH_USER_MODEL

```python
# settings.py
AUTH_USER_MODEL = 'accounts.User'   # must be set before first migration
```

### Step 4 — Create a custom UserAdmin

```python
# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username', 'is_staff', 'is_active', 'date_joined']
    fieldsets = UserAdmin.fieldsets + (
        ('Profile', {'fields': ('avatar', 'bio')}),
    )
```

### Step 5 — Migrate

```powershell
python manage.py makemigrations accounts
python manage.py migrate
python manage.py createsuperuser
```

---

## 2. Built-in Authentication URLs

```python
# config/urls.py
from django.urls import path, include

urlpatterns = [
    path('accounts/', include('django.contrib.auth.urls')),
    # Provides: login, logout, password_change, password_reset, etc.
]
```

This adds these URL patterns:

| Pattern | View name |
|---|---|
| `accounts/login/` | `login` |
| `accounts/logout/` | `logout` |
| `accounts/password_change/` | `password_change` |
| `accounts/password_change/done/` | `password_change_done` |
| `accounts/password_reset/` | `password_reset` |
| `accounts/password_reset/done/` | `password_reset_done` |
| `accounts/reset/<uidb64>/<token>/` | `password_reset_confirm` |
| `accounts/reset/done/` | `password_reset_complete` |

### Settings for login/logout redirects

```python
# settings.py
LOGIN_URL = '/accounts/login/'         # redirect here if @login_required
LOGIN_REDIRECT_URL = '/dashboard/'     # redirect after successful login
LOGOUT_REDIRECT_URL = '/'             # redirect after logout
```

---

## 3. Login/Logout Templates

The built-in views look for templates in `registration/`. Create:

```html
<!-- templates/registration/login.html -->
{% extends 'base.html' %}

{% block title %}Login{% endblock %}

{% block content %}
<form method="post">
  {% csrf_token %}
  {{ form.as_p }}
  <input type="hidden" name="next" value="{{ next }}">
  <button type="submit">Log In</button>
</form>
<p><a href="{% url 'password_reset' %}">Forgot password?</a></p>
{% endblock %}
```

---

## 4. Custom Login / Registration Views

```python
# accounts/views.py
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import RegisterForm


def register(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Account created successfully!')
            return redirect('dashboard')
    else:
        form = RegisterForm()
    return render(request, 'accounts/register.html', {'form': form})


def logout_view(request):
    if request.method == 'POST':   # POST-only logout is more secure
        logout(request)
        return redirect('home')
    return render(request, 'accounts/logout_confirm.html')


@login_required
def dashboard(request):
    return render(request, 'accounts/dashboard.html')
```

### Registration form

```python
# accounts/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User


class RegisterForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']

    def clean_email(self):
        email = self.cleaned_data['email']
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('An account with this email already exists.')
        return email.lower()
```

---

## 5. Decorating Views with Authentication

### FBVs

```python
from django.contrib.auth.decorators import login_required, permission_required

@login_required
def profile(request): ...

@login_required(login_url='/login/')
def settings(request): ...

@permission_required('blog.add_post')
def write_post(request): ...

@permission_required('blog.add_post', raise_exception=True)  # 403 not redirect
def write_post(request): ...
```

### CBVs

```python
from django.contrib.auth.mixins import (
    LoginRequiredMixin,
    PermissionRequiredMixin,
    UserPassesTestMixin,
)

class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'dashboard.html'

class PostCreateView(PermissionRequiredMixin, CreateView):
    permission_required = 'blog.add_post'

class MyPostUpdateView(UserPassesTestMixin, UpdateView):
    def test_func(self):
        return self.get_object().author == self.request.user
```

---

## 6. Permissions

### Model-level permissions

Django auto-creates four permissions per model: `add_<model>`, `view_<model>`,
`change_<model>`, `delete_<model>`.

```python
# Check permissions
request.user.has_perm('blog.add_post')
request.user.has_perm('blog.delete_post')
request.user.has_perms(['blog.add_post', 'blog.change_post'])

# In templates
{% if perms.blog.add_post %}
  <a href="{% url 'blog:post-create' %}">Write Post</a>
{% endif %}
```

### Custom permissions

```python
class Post(models.Model):
    class Meta:
        permissions = [
            ('can_publish', 'Can publish post'),
            ('can_feature', 'Can feature post on homepage'),
        ]
```

```powershell
python manage.py migrate   # creates the new permissions
```

### Granting permissions

```python
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from blog.models import Post

content_type = ContentType.objects.get_for_model(Post)
permission = Permission.objects.get(codename='can_publish', content_type=content_type)

user.user_permissions.add(permission)
user.user_permissions.remove(permission)
group.permissions.add(permission)
```

---

## 7. Groups

Groups bundle permissions for easy assignment:

```python
from django.contrib.auth.models import Group, Permission

# Create group
editors = Group.objects.create(name='Editors')
editors.permissions.add(*Permission.objects.filter(codename__in=[
    'add_post', 'change_post', 'can_publish',
]))

# Assign user to group
user.groups.add(editors)
user.groups.remove(editors)

# Check group membership
user.groups.filter(name='Editors').exists()
```

---

## 8. Password Management

```python
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm

@login_required
def change_password(request):
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            # Keep user logged in after password change
            update_session_auth_hash(request, user)
            messages.success(request, 'Password updated.')
            return redirect('accounts:settings')
    else:
        form = PasswordChangeForm(request.user)
    return render(request, 'accounts/change_password.html', {'form': form})
```

### Password validation (settings)

```python
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
```

---

## Quick Reference

| Task | Code |
|---|---|
| Custom user model | `class User(AbstractUser): ...` + `AUTH_USER_MODEL` |
| Login required | `@login_required` / `LoginRequiredMixin` |
| Check permission | `request.user.has_perm('app.codename')` |
| Check in template | `{% if perms.blog.add_post %}` |
| Custom permission | `class Meta: permissions = [('code', 'Name')]` |
| Grant permission | `user.user_permissions.add(perm)` |
| Login user | `login(request, user)` |
| Logout user | `logout(request)` |
| Authenticate | `authenticate(request, username=u, password=p)` |
| Password validators | `AUTH_PASSWORD_VALIDATORS` in settings |
