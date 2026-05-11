---
id: django-admin-customization
slug: /django-admin-customization
sidebar_position: 15
description: "Customise the Django admin: list displays, filters, inline models, actions, and custom views."
---

# Django Admin Customisation

## Overview

Django's admin interface provides a full CRUD UI for your models out of the box. With a few lines
of code you can customise list displays, filters, search, inlines, custom actions, and even add
completely custom pages to the admin.

---

## 1. Registering Models

```python
# blog/admin.py
from django.contrib import admin
from .models import Post, Category, Tag

# Simple registration
admin.site.register(Category)

# With custom ModelAdmin
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    pass
```

---

## 2. List Display and Filtering

```python
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    # Columns shown in the list view
    list_display = ['title', 'author', 'status', 'created_at', 'is_featured']

    # Clickable column (by default only first column links to change form)
    list_display_links = ['title']

    # Editable directly in the list view
    list_editable = ['status', 'is_featured']

    # Right-side filter panel
    list_filter = ['status', 'category', 'created_at', 'author']

    # Search box (searches these fields)
    search_fields = ['title', 'body', 'author__email']

    # Default ordering
    ordering = ['-created_at']

    # Number of items per page
    list_per_page = 25

    # Date drill-down
    date_hierarchy = 'created_at'

    # Show total count for the current filter
    show_full_result_count = False   # set to False for large tables

    # Prepopulate slug from title (JavaScript-powered)
    prepopulated_fields = {'slug': ('title',)}
```

---

## 3. Custom List Display Fields

You can add computed columns by defining methods:

```python
from django.utils.html import format_html
from django.contrib import admin


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'word_count', 'preview_link']

    @admin.display(description='Words', ordering='body')
    def word_count(self, obj):
        return len(obj.body.split())

    @admin.display(description='Preview')
    def preview_link(self, obj):
        return format_html(
            '<a href="{}" target="_blank">View</a>',
            obj.get_absolute_url()
        )
```

---

## 4. Change Form Customisation

```python
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    # Group fields into sections
    fieldsets = [
        (None, {
            'fields': ['title', 'slug', 'author', 'status'],
        }),
        ('Content', {
            'fields': ['excerpt', 'body', 'hero_image'],
        }),
        ('SEO', {
            'classes': ['collapse'],   # collapsible by default
            'fields': ['meta_title', 'meta_description'],
        }),
        ('Publishing', {
            'fields': ['category', 'tags', 'created_at'],
        }),
    ]

    # Read-only fields
    readonly_fields = ['created_at', 'updated_at', 'view_count']

    # M2M field widget — filter_horizontal or filter_vertical
    filter_horizontal = ['tags']
    filter_vertical = []

    # Raw ID for FK fields with many options
    raw_id_fields = ['author']

    # Autocomplete for FK/M2M (requires search_fields on related admin)
    autocomplete_fields = ['category']
```

---

## 5. Inline Models

Inlines let you edit related objects on the same page as the parent.

### TabularInline (compact)

```python
from django.contrib import admin
from .models import Post, Comment


class CommentInline(admin.TabularInline):
    model = Comment
    fields = ['author', 'body', 'is_approved']
    extra = 0                # no empty extra rows
    max_num = 20
    readonly_fields = ['created_at']
    show_change_link = True  # link to full change form


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    inlines = [CommentInline]
```

### StackedInline (expanded)

```python
class PostImageInline(admin.StackedInline):
    model = PostImage
    fields = ['image', 'caption', 'order']
    extra = 1
```

---

## 6. Custom Actions

Actions appear in the action dropdown on the list page.

```python
from django.contrib import admin
from django.utils.translation import ngettext
from django.contrib import messages


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    actions = ['publish_posts', 'unpublish_posts']

    @admin.action(description='Mark selected posts as published')
    def publish_posts(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(
            request,
            ngettext(
                '%d post was published.',
                '%d posts were published.',
                updated,
            ) % updated,
            messages.SUCCESS,
        )

    @admin.action(description='Mark selected posts as draft')
    def unpublish_posts(self, request, queryset):
        queryset.update(status='draft')
        self.message_user(request, 'Posts set to draft.', messages.WARNING)
```

---

## 7. Custom Admin Views

Add completely custom pages to the admin:

```python
# blog/admin.py
from django.urls import path
from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('stats/', self.admin_site.admin_view(self.stats_view), name='post-stats'),
        ]
        return custom_urls + urls

    def stats_view(self, request):
        from .models import Post
        context = {
            **self.admin_site.each_context(request),
            'title': 'Post Statistics',
            'total': Post.objects.count(),
            'published': Post.objects.filter(status='published').count(),
        }
        return render(request, 'admin/blog/post_stats.html', context)
```

```html
<!-- templates/admin/blog/post_stats.html -->
{% extends "admin/base_site.html" %}
{% block content %}
<h1>Post Statistics</h1>
<p>Total: {{ total }}</p>
<p>Published: {{ published }}</p>
{% endblock %}
```

---

## 8. Customising the Admin Site

```python
# config/urls.py
admin.site.site_header = 'My App Admin'
admin.site.site_title = 'My App'
admin.site.index_title = 'Dashboard'
```

### Custom admin templates

Override by creating templates in `templates/admin/`:

```
templates/
  admin/
    base_site.html       ← override branding
    index.html           ← custom dashboard
    blog/
      post/
        change_list.html ← override for specific model
```

```html
<!-- templates/admin/base_site.html -->
{% extends "admin/base.html" %}
{% block branding %}
  <h1 id="site-name">
    <a href="{% url 'admin:index' %}">My Blog Admin</a>
  </h1>
{% endblock %}
```

---

## 9. Controlling Access and Permissions

```python
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return request.user.has_perm('blog.add_post')

    def has_change_permission(self, request, obj=None):
        if obj is not None:
            return obj.author == request.user or request.user.is_superuser
        return True

    def has_delete_permission(self, request, obj=None):
        if obj is not None:
            return obj.author == request.user or request.user.is_superuser
        return True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(author=request.user)
```

---

## Quick Reference

| Feature | Code |
|---|---|
| Register model | `@admin.register(Model)` |
| List columns | `list_display = ['field', 'method']` |
| Filter panel | `list_filter = ['field']` |
| Search | `search_fields = ['field', 'fk__field']` |
| Prepopulate slug | `prepopulated_fields = {'slug': ('title',)}` |
| Collapse section | `fieldsets = [('Title', {'classes': ['collapse'], ...})]` |
| Inline | `class InlineA(TabularInline): model=M; extra=0` |
| Custom action | `@admin.action(description='...')` |
| Custom column | `@admin.display(description='...')` |
| Raw id widget | `raw_id_fields = ['fk_field']` |
