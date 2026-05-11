# Content Management System

## Building a CMS with Django

Core model structure:

```python
from django.db import models
from django.conf import settings
from django.contrib.auth.models import Permission


class Page(models.Model):
  title = models.CharField(max_length=200)
  slug = models.SlugField(unique=True)
  content = models.TextField()
  author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
  is_published = models.BooleanField(default=False)
  published_at = models.DateTimeField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    permissions = [
      ('can_publish', 'Can publish pages'),
    ]


class Menu(models.Model):
  name = models.CharField(max_length=100)
  items = models.JSONField(default=list)  # Navigation structure


class Asset(models.Model):
  name = models.CharField(max_length=200)
  file = models.FileField(upload_to='assets/')
  uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
```

## Admin Interface

```python
from django.contrib import admin
from django.utils.html import format_html


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
  list_display = ('title', 'slug', 'author', 'status_badge', 'created_at')
  list_filter = ('is_published', 'created_at')
  search_fields = ('title', 'content')
  prepopulated_fields = {'slug': ('title',)}
  readonly_fields = ('created_at', 'updated_at')

  def status_badge(self, obj):
    if obj.is_published:
      return format_html('<span style="color: green;">✓ Published</span>')
    return format_html('<span style="color: gray;">Draft</span>')
```

## Rich Text Editor Integration

Use `django-ckeditor`:

```powershell
pip install django-ckeditor
```

Model:

```python
from ckeditor.fields import RichTextField


class Page(models.Model):
  title = models.CharField(max_length=200)
  content = RichTextField()  # WYSIWYG editor
```

## Version History

```python
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE


def save_page_revision(page, user):
  """Log page changes for auditing."""
  LogEntry.objects.create(
    user=user,
    content_type_id=ContentType.objects.get_for_model(Page).id,
    object_id=page.id,
    object_repr=str(page),
    action_flag=CHANGE,
    change_message='Page updated',
  )
```

## Publishing Workflow

```python
from django.utils import timezone


@transaction.atomic
def publish_page(page, user):
  if not user.has_perm('pages.can_publish'):
    raise PermissionDenied('User cannot publish pages')

  page.is_published = True
  page.published_at = timezone.now()
  page.save(update_fields=['is_published', 'published_at'])
  save_page_revision(page, user)
```
