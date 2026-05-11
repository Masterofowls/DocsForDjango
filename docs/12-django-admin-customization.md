# Django Admin Customization

## Definition

Django admin is an auto-generated data management interface.

## Register Model Syntax

```python
from django.contrib import admin
from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
  list_display = ('id', 'title', 'is_published', 'created_at')
  list_filter = ('is_published', 'created_at')
  search_fields = ('title', 'body')
  prepopulated_fields = {'slug': ('title',)}
```

## Inline Example

```python
class CommentInline(admin.TabularInline):
  model = Comment
  extra = 1


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
  inlines = [CommentInline]
```

## Admin Actions

```python
@admin.action(description='Mark selected posts as published')
def mark_published(modeladmin, request, queryset):
  queryset.update(is_published=True)
```

## Security Notes

- Restrict admin users to trusted staff.
- Use least privilege permissions.
- Enable MFA on admin accounts.
