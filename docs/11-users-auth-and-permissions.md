# Users, Auth, and Permissions

## Definition

Django auth provides identity, authentication, groups, and permissions.

## Authentication Syntax

```python
from django.contrib.auth import authenticate, login, logout


def login_view(request):
  user = authenticate(
    request,
    username=request.POST.get('username', ''),
    password=request.POST.get('password', ''),
  )
  if user is not None:
    login(request, user)
```

## Custom User Model

```python
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
  pass
```

Set in settings:

```python
AUTH_USER_MODEL = 'accounts.User'
```

## Permission Checks

```python
from django.contrib.auth.decorators import permission_required


@permission_required('blog.change_post', raise_exception=True)
def edit_post(request, post_id):
  ...
```

## Groups Example

```python
from django.contrib.auth.models import Group, Permission

editors, _ = Group.objects.get_or_create(name='Editors')
perm = Permission.objects.get(codename='change_post')
editors.permissions.add(perm)
```
