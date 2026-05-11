---
id: content-management-system
slug: /content-management-system
sidebar_position: 28
description: "Build a headless CMS with Django: pages, content blocks, custom admin, and REST API."
---

# Content Management System

## Overview

This guide builds a headless CMS in Django with flexible content blocks, a custom admin editing
experience, revision history, and a REST API that any frontend can consume. The design follows a
"structured content" pattern where each page has typed, reusable blocks (text, image, quote, embed).

---

## 1. Setup

```powershell
python manage.py startapp cms
pip install djangorestframework django-ordered-model
```

```python
# settings.py
INSTALLED_APPS += ['cms', 'rest_framework', 'ordered_model']
```

---

## 2. Models

```python
# cms/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.text import slugify
from ordered_model.models import OrderedModel

User = get_user_model()


class Page(models.Model):
    DRAFT = 'draft'
    PUBLISHED = 'published'
    STATUS_CHOICES = [(DRAFT, 'Draft'), (PUBLISHED, 'Published')]

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children'
    )
    meta_description = models.TextField(blank=True, max_length=160)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=DRAFT, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='pages')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('cms:page_detail', args=[self.slug])


class Block(OrderedModel):
    """A content block attached to a page."""
    TEXT = 'text'
    IMAGE = 'image'
    QUOTE = 'quote'
    EMBED = 'embed'
    HERO = 'hero'
    BLOCK_TYPES = [
        (TEXT, 'Text'),
        (IMAGE, 'Image'),
        (QUOTE, 'Quote'),
        (EMBED, 'Embed'),
        (HERO, 'Hero'),
    ]

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name='blocks')
    block_type = models.CharField(max_length=20, choices=BLOCK_TYPES)
    # Flexible content stored as JSON
    content = models.JSONField(default=dict)

    order_with_respect_to = 'page'   # ordered per page

    class Meta(OrderedModel.Meta):
        pass

    def __str__(self):
        return f'{self.block_type} block on {self.page}'


class PageRevision(models.Model):
    """Snapshot of page + blocks for revision history."""
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name='revisions')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    snapshot = models.JSONField()             # full serialisation
    created_at = models.DateTimeField(auto_now_add=True)
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Rev {self.pk} of {self.page} by {self.created_by}'
```

---

## 3. Content Block Schema

Each block type uses the `content` JSONField with a defined schema:

```python
# Example content shapes per block type:

TEXT_BLOCK = {
    'heading': 'Section Heading',   # optional
    'body': '<p>Rich text...</p>',  # HTML or Markdown
    'style': 'default',             # default | callout | warning
}

IMAGE_BLOCK = {
    'image_url': '/media/images/photo.jpg',
    'alt': 'A descriptive caption',
    'caption': 'Optional caption text',
    'width': 'full',                # full | half | float-right
}

QUOTE_BLOCK = {
    'text': 'Quote content here...',
    'attribution': 'Author Name',
    'role': 'CEO, Acme Corp',
}

EMBED_BLOCK = {
    'embed_url': 'https://www.youtube.com/embed/xyz',
    'aspect_ratio': '16:9',
    'caption': 'Video caption',
}

HERO_BLOCK = {
    'headline': 'Main headline',
    'subheadline': 'Supporting text',
    'image_url': '/media/hero.jpg',
    'cta_text': 'Get started',
    'cta_url': '/signup/',
}
```

---

## 4. Admin

```python
# cms/admin.py
from django.contrib import admin
from django.utils import timezone
from ordered_model.admin import OrderedInlineModelAdminMixin, OrderedTabularInline
from .models import Page, Block, PageRevision
import json


class BlockInline(OrderedInlineModelAdminMixin, OrderedTabularInline):
    model = Block
    fields = ['block_type', 'content', 'order', 'move_up_down_links']
    readonly_fields = ['order', 'move_up_down_links']
    extra = 0


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    inlines = [BlockInline]
    list_display = ['title', 'slug', 'status', 'created_by', 'published_at']
    list_filter = ['status']
    search_fields = ['title', 'slug']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']
    actions = ['publish_pages', 'create_revision']

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def publish_pages(self, request, queryset):
        queryset.update(status=Page.PUBLISHED, published_at=timezone.now())
    publish_pages.short_description = 'Publish selected pages'

    def create_revision(self, request, queryset):
        for page in queryset:
            snapshot = {
                'title': page.title,
                'slug': page.slug,
                'meta_description': page.meta_description,
                'status': page.status,
                'blocks': [
                    {'block_type': b.block_type, 'content': b.content, 'order': b.order}
                    for b in page.blocks.order_by('order')
                ],
            }
            PageRevision.objects.create(
                page=page,
                created_by=request.user,
                snapshot=snapshot,
                comment='Manual revision',
            )
    create_revision.short_description = 'Save revision snapshot'


admin.site.register(PageRevision)
```

---

## 5. REST API (Headless CMS)

```python
# cms/serializers.py
from rest_framework import serializers
from .models import Page, Block


class BlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = ['id', 'block_type', 'content', 'order']


class PageListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'meta_description', 'published_at']


class PageDetailSerializer(serializers.ModelSerializer):
    blocks = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'meta_description', 'published_at', 'blocks']

    def get_blocks(self, obj):
        blocks = obj.blocks.order_by('order')
        return BlockSerializer(blocks, many=True).data
```

```python
# cms/views.py
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from .models import Page
from .serializers import PageListSerializer, PageDetailSerializer


class PageListAPIView(ListAPIView):
    serializer_class = PageListSerializer
    permission_classes = [AllowAny]
    queryset = Page.objects.filter(status=Page.PUBLISHED).order_by('title')


class PageDetailAPIView(RetrieveAPIView):
    serializer_class = PageDetailSerializer
    permission_classes = [AllowAny]
    queryset = Page.objects.filter(status=Page.PUBLISHED)
    lookup_field = 'slug'
```

```python
# cms/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('api/pages/', views.PageListAPIView.as_view(), name='page_list'),
    path('api/pages/<slug:slug>/', views.PageDetailAPIView.as_view(), name='page_detail'),
]
```

---

## 6. Template Rendering

```html
<!-- templates/cms/page.html -->
{% for block in page.blocks.all %}
    {% if block.block_type == 'text' %}
        {% if block.content.heading %}
            <h2>{{ block.content.heading }}</h2>
        {% endif %}
        <div class="prose">{{ block.content.body|safe }}</div>

    {% elif block.block_type == 'image' %}
        <figure class="block-image block-image--{{ block.content.width|default:'full' }}">
            <img src="{{ block.content.image_url }}" alt="{{ block.content.alt }}" loading="lazy" />
            {% if block.content.caption %}
                <figcaption>{{ block.content.caption }}</figcaption>
            {% endif %}
        </figure>

    {% elif block.block_type == 'quote' %}
        <blockquote>
            <p>{{ block.content.text }}</p>
            <footer>{{ block.content.attribution }}, {{ block.content.role }}</footer>
        </blockquote>

    {% elif block.block_type == 'embed' %}
        <div class="embed-wrapper" style="aspect-ratio:{{ block.content.aspect_ratio|default:'16/9' }}">
            <iframe src="{{ block.content.embed_url }}" allowfullscreen loading="lazy"></iframe>
        </div>

    {% elif block.block_type == 'hero' %}
        <section class="hero" style="background-image:url('{{ block.content.image_url }}')">
            <h1>{{ block.content.headline }}</h1>
            <p>{{ block.content.subheadline }}</p>
            <a href="{{ block.content.cta_url }}" class="btn">{{ block.content.cta_text }}</a>
        </section>
    {% endif %}
{% endfor %}
```

---

## Quick Reference

| Feature | Code |
|---|---|
| Page model | `Page` with `slug`, `status`, `parent` FK |
| Ordered blocks | `Block(OrderedModel)` with `order_with_respect_to = 'page'` |
| Flexible content | `content = models.JSONField(default=dict)` |
| Revision history | `PageRevision` with `snapshot = JSONField()` |
| Drag-and-drop admin | `OrderedInlineModelAdminMixin` + `OrderedTabularInline` |
| REST API | `PageListAPIView`, `PageDetailAPIView` with `slug` lookup |
| Block rendering | Template `{% if block.block_type == 'text' %}` dispatch |
