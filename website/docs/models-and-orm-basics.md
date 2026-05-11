---
id: models-and-orm-basics
slug: /models-and-orm-basics
sidebar_position: 5
description: "Define database models, field types, relationships, and run migrations."
---

# Models and ORM Basics

## Overview

Django's ORM (Object-Relational Mapper) lets you define your database schema using Python classes
and interact with the database without writing SQL. Each model class becomes a database table, each
field becomes a column, and model instances represent rows.

---

## 1. Your First Model

```python
# blog/models.py
from django.db import models
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Post(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    body = models.TextField()
    excerpt = models.TextField(blank=True, max_length=500)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posts',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return self.title

    def publish(self):
        self.status = self.STATUS_PUBLISHED
        self.published_at = timezone.now()
        self.save(update_fields=['status', 'published_at'])
```

---

## 2. Field Types Reference

### Text fields

```python
title = models.CharField(max_length=255)          # short text — required max_length
body = models.TextField()                          # unlimited text
slug = models.SlugField(max_length=255)            # URL-safe slug
email = models.EmailField()                        # validates email format
url = models.URLField()                            # validates URL format
ip = models.GenericIPAddressField()               # IPv4 or IPv6
uuid = models.UUIDField(default=uuid.uuid4)       # UUID primary key
```

### Numeric fields

```python
age = models.IntegerField()
count = models.PositiveIntegerField()             # must be >= 0
price = models.DecimalField(max_digits=10, decimal_places=2)  # money
ratio = models.FloatField()                       # floating point (imprecise)
```

### Boolean fields

```python
is_active = models.BooleanField(default=True)
is_verified = models.BooleanField(null=True)      # True/False/None (3 states)
```

### Date and time fields

```python
birthday = models.DateField()
created_at = models.DateTimeField(auto_now_add=True)   # set once on creation
updated_at = models.DateTimeField(auto_now=True)       # set on every save
duration = models.DurationField()
```

### File fields

```python
photo = models.ImageField(upload_to='avatars/%Y/%m/')
document = models.FileField(upload_to='documents/')
```

### Relationship fields

```python
# Many-to-one (ForeignKey)
author = models.ForeignKey('users.User', on_delete=models.CASCADE)

# Many-to-many
tags = models.ManyToManyField('Tag', blank=True)

# One-to-one
profile = models.OneToOneField('users.User', on_delete=models.CASCADE)
```

### Field options (shared)

```python
field = models.CharField(
    max_length=100,
    null=True,        # allows NULL in database
    blank=True,       # allows empty in forms
    default='',       # default value
    unique=True,      # unique constraint
    db_index=True,    # adds database index
    verbose_name='Display Name',
    help_text='Used in forms and admin',
    editable=False,   # excluded from forms and admin
)
```

Rule of thumb: `null=True` for non-string fields; `blank=True` for strings (empty string is the
null equivalent for text).

---

## 3. Migrations

After defining or changing models, create and apply migrations:

```powershell
# Step 1 — generate migration files
python manage.py makemigrations

# Step 2 — apply migrations to the database
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Show what SQL a migration will run
python manage.py sqlmigrate blog 0001

# Roll back to a specific migration
python manage.py migrate blog 0002
```

### What happens during `makemigrations`

Django compares your current model state against the last migration and generates a new file
in `app/migrations/` with the changes.

```
blog/migrations/
  0001_initial.py          ← CreateModel Post, Category
  0002_post_excerpt.py     ← AddField Post.excerpt
  0003_post_indexes.py     ← AddIndex Post.status
```

### Migration dependencies

```python
# blog/migrations/0002_post_excerpt.py
class Migration(migrations.Migration):
    dependencies = [
        ('blog', '0001_initial'),    # must run 0001 first
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='excerpt',
            field=models.TextField(blank=True, default=''),
        ),
    ]
```

### Data migrations

```python
# blog/migrations/0004_populate_excerpts.py
from django.db import migrations


def populate_excerpts(apps, schema_editor):
    Post = apps.get_model('blog', 'Post')
    for post in Post.objects.all():
        post.excerpt = post.body[:200]
        post.save(update_fields=['excerpt'])


class Migration(migrations.Migration):
    dependencies = [('blog', '0003_post_indexes')]

    operations = [
        migrations.RunPython(populate_excerpts, migrations.RunPython.noop),
    ]
```

---

## 4. The QuerySet API

A QuerySet is a lazy, chainable database query. It doesn't hit the database until you iterate,
call `len()`, convert to a list, or access a slice.

### Basic queries

```python
from blog.models import Post

# Get all records
posts = Post.objects.all()

# Filter records (WHERE)
drafts = Post.objects.filter(status='draft')
recent = Post.objects.filter(created_at__gte=timezone.now() - timedelta(days=7))

# Exclude records (WHERE NOT)
not_drafts = Post.objects.exclude(status='draft')

# Get a single object (raises DoesNotExist or MultipleObjectsReturned)
post = Post.objects.get(pk=1)
post = Post.objects.get(slug='my-post')

# Get or return None
post = Post.objects.filter(pk=99).first()   # returns None if not found

# Get or 404 (in views)
from django.shortcuts import get_object_or_404
post = get_object_or_404(Post, slug=slug)
```

### Ordering and slicing

```python
# Order ascending
posts = Post.objects.order_by('created_at')

# Order descending
posts = Post.objects.order_by('-created_at')

# Multiple fields
posts = Post.objects.order_by('status', '-created_at')

# Limit (LIMIT 10)
posts = Post.objects.all()[:10]

# Offset + limit (LIMIT 10 OFFSET 20)
posts = Post.objects.all()[20:30]
```

### Lookups (field__lookup)

```python
# Exact (default)
Post.objects.filter(status='published')
Post.objects.filter(status__exact='published')

# Case-insensitive exact
Post.objects.filter(title__iexact='hello world')

# Contains
Post.objects.filter(title__contains='Django')
Post.objects.filter(title__icontains='django')   # case-insensitive

# Starts/ends with
Post.objects.filter(title__startswith='How to')
Post.objects.filter(title__endswith='guide')

# IN list
Post.objects.filter(status__in=['draft', 'published'])

# Numeric comparisons
Post.objects.filter(view_count__gt=100)       # >
Post.objects.filter(view_count__gte=100)      # >=
Post.objects.filter(view_count__lt=100)       # <
Post.objects.filter(view_count__lte=100)      # <=

# Date parts
Post.objects.filter(created_at__year=2024)
Post.objects.filter(created_at__month=6)
Post.objects.filter(created_at__date=date(2024, 6, 15))

# NULL check
Post.objects.filter(published_at__isnull=True)
Post.objects.filter(category__isnull=False)

# Range (BETWEEN)
Post.objects.filter(price__range=(10, 100))
```

### Aggregations

```python
from django.db.models import Count, Avg, Max, Min, Sum

# Count
total = Post.objects.count()
published_count = Post.objects.filter(status='published').count()

# Aggregate (returns a dict)
from django.db.models import Avg, Max
stats = Post.objects.aggregate(
    avg_views=Avg('view_count'),
    max_views=Max('view_count'),
)
# {'avg_views': 142.5, 'max_views': 9823}

# Annotate (adds a calculated column per row)
from django.db.models import Count
categories = Category.objects.annotate(
    post_count=Count('posts')
).order_by('-post_count')
```

---

## 5. Creating, Updating, and Deleting

```python
# Create — instantiate then save
post = Post(title='Hello', slug='hello', body='...')
post.save()

# Create — shortcut (single query)
post = Post.objects.create(title='Hello', slug='hello', body='...')

# Update a single instance
post.title = 'Updated Title'
post.save()                                    # updates all fields
post.save(update_fields=['title'])             # updates only title (faster)

# Bulk update (efficient — single UPDATE query)
Post.objects.filter(status='draft').update(status='published')

# Get or create (atomic, no duplicates)
category, created = Category.objects.get_or_create(
    slug='python',
    defaults={'name': 'Python'},
)

# Update or create
post, created = Post.objects.update_or_create(
    slug='my-post',
    defaults={'title': 'My Updated Post', 'body': '...'},
)

# Delete
post.delete()                                  # delete one object
Post.objects.filter(status='draft').delete()  # bulk delete
```

---

## 6. Model Meta Options

```python
class Post(models.Model):
    # ...

    class Meta:
        # Table name (default: appname_modelname)
        db_table = 'blog_posts'

        # Default ordering for all queries
        ordering = ['-created_at']

        # Plural name in admin
        verbose_name = 'post'
        verbose_name_plural = 'posts'

        # Composite unique constraint
        unique_together = [['author', 'slug']]     # legacy
        constraints = [
            models.UniqueConstraint(
                fields=['author', 'slug'],
                name='unique_author_slug',
            )
        ]

        # Database indexes
        indexes = [
            models.Index(fields=['status', '-created_at'], name='post_status_created_idx'),
        ]

        # Abstract base class (not a real table)
        abstract = True

        # Permissions for this model
        permissions = [
            ('can_publish', 'Can publish posts'),
        ]
```

---

## 7. Model Methods

```python
class Post(models.Model):
    # ...

    def __str__(self):
        """String representation — shown in admin and shell."""
        return self.title

    def get_absolute_url(self):
        """Canonical URL for this object — used by admin 'View on site'."""
        from django.urls import reverse
        return reverse('blog:post-detail', kwargs={'slug': self.slug})

    @property
    def is_published(self) -> bool:
        return self.status == self.STATUS_PUBLISHED

    @classmethod
    def published(cls):
        """Custom class method to get published posts."""
        return cls.objects.filter(status=cls.STATUS_PUBLISHED)
```

---

## 8. Custom Managers

```python
class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status='published')

    def recent(self, days=30):
        cutoff = timezone.now() - timedelta(days=days)
        return self.get_queryset().filter(published_at__gte=cutoff)


class Post(models.Model):
    # ...
    objects = models.Manager()           # default manager (keep this first)
    published = PublishedManager()       # custom manager

# Usage
posts = Post.published.all()
recent_posts = Post.published.recent(days=7)
```

---

## Quick Reference

| Task | Code |
|---|---|
| Create migration | `python manage.py makemigrations` |
| Apply migrations | `python manage.py migrate` |
| All records | `Model.objects.all()` |
| Filter | `Model.objects.filter(field=value)` |
| Single record | `Model.objects.get(pk=1)` |
| Or None | `Model.objects.filter(...).first()` |
| Or 404 | `get_object_or_404(Model, pk=1)` |
| Create | `Model.objects.create(field=value)` |
| Bulk update | `Model.objects.filter(...).update(field=val)` |
| Delete | `Model.objects.filter(...).delete()` |
| Count | `Model.objects.filter(...).count()` |
| Aggregate | `Model.objects.aggregate(avg=Avg('field'))` |
| Annotate | `Model.objects.annotate(cnt=Count('related'))` |
