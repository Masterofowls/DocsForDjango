---
id: advanced-orm-and-relations
slug: /advanced-orm-and-relations
sidebar_position: 6
description: "Master ForeignKey, ManyToMany, select_related, prefetch_related, Q objects, and F expressions."
---

# Advanced ORM and Relations

## Overview

Once you understand basic QuerySets, the next step is mastering relational queries, query
optimisation, and Django's powerful expression system. This guide covers everything from
`select_related` to `F` expressions, `Q` objects, subqueries, and window functions.

---

## 1. ForeignKey — Many-to-One Relationships

```python
# models.py
class Author(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)


class Post(models.Model):
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,       # delete posts when author deleted
        related_name='posts',           # reverse access: author.posts.all()
    )
    title = models.CharField(max_length=255)
```

### `on_delete` options

| Option | Behaviour |
|---|---|
| `CASCADE` | Delete related objects |
| `PROTECT` | Raise ProtectedError — block deletion |
| `SET_NULL` | Set FK to NULL (requires `null=True`) |
| `SET_DEFAULT` | Set FK to field's default value |
| `SET(value)` | Set FK to a specific value or callable |
| `DO_NOTHING` | Leave dangling FK (use with caution) |
| `RESTRICT` | Like PROTECT but more nuanced (Django 3.1+) |

### Traversing relationships

```python
# Forward traversal (Post → Author)
post = Post.objects.get(pk=1)
author_name = post.author.name       # triggers a query

# Reverse traversal (Author → Posts)
author = Author.objects.get(pk=1)
posts = author.posts.all()           # uses related_name='posts'

# Filter across FK
posts_by_alice = Post.objects.filter(author__name='Alice')
posts_from_2024 = Post.objects.filter(author__date_joined__year=2024)
```

---

## 2. ManyToManyField

```python
class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)


class Post(models.Model):
    title = models.CharField(max_length=255)
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name='posts',
    )
```

### Working with M2M

```python
post = Post.objects.get(pk=1)
tag_python = Tag.objects.get(slug='python')
tag_django = Tag.objects.get(slug='django')

# Add tags
post.tags.add(tag_python, tag_django)

# Remove a tag
post.tags.remove(tag_python)

# Replace all tags
post.tags.set([tag_python, tag_django])

# Clear all tags
post.tags.clear()

# Filter posts by tag
django_posts = Post.objects.filter(tags__slug='django')

# Filter posts with multiple tags (AND — both must match)
from django.db.models import Q
both_tag_posts = Post.objects.filter(tags__slug='python').filter(tags__slug='django')
```

### Through model (custom join table)

```python
class PostTag(models.Model):
    """Custom through model with extra fields."""
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)
    added_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['post', 'tag']]


class Post(models.Model):
    tags = models.ManyToManyField(Tag, through='PostTag', blank=True)
```

---

## 3. OneToOneField

```python
class UserProfile(models.Model):
    user = models.OneToOneField(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='profile',
    )
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)

# Access
user = User.objects.get(pk=1)
bio = user.profile.bio   # reverse access via related_name='profile'
```

---

## 4. select_related — Avoid N+1 for FK

Without `select_related`, accessing `post.author.name` for 100 posts = 101 queries.

```python
# Bad — N+1 queries
posts = Post.objects.all()
for post in posts:
    print(post.author.name)   # 1 query per post!

# Good — JOINs author in one query
posts = Post.objects.select_related('author').all()
for post in posts:
    print(post.author.name)   # 0 extra queries

# Nested relationships
posts = Post.objects.select_related('author__profile').all()
```

Use `select_related` for:
- `ForeignKey` fields
- `OneToOneField` fields
- Nested FK chains (use `'a__b__c'` syntax)

---

## 5. prefetch_related — Avoid N+1 for M2M

`select_related` uses SQL JOINs (works for FK/O2O only). For M2M or reverse FK, use
`prefetch_related`, which runs separate queries then joins in Python.

```python
# Bad — N+1
posts = Post.objects.all()
for post in posts:
    print(post.tags.all())    # 1 query per post!

# Good — 2 queries total
posts = Post.objects.prefetch_related('tags').all()

# Combine both
posts = Post.objects.select_related('author').prefetch_related('tags', 'comments')

# Prefetch with custom queryset
from django.db.models import Prefetch

published_comments = Comment.objects.filter(is_approved=True)
posts = Post.objects.prefetch_related(
    Prefetch('comments', queryset=published_comments, to_attr='approved_comments')
)
# Access via: post.approved_comments (a list, not QuerySet)
```

---

## 6. Q Objects — Complex Filters

`Q` objects let you combine filter conditions with AND (`&`), OR (`|`), and NOT (`~`).

```python
from django.db.models import Q

# OR condition
posts = Post.objects.filter(
    Q(status='published') | Q(featured=True)
)

# AND condition (equivalent to chaining .filter())
posts = Post.objects.filter(
    Q(status='published') & Q(author__name='Alice')
)

# NOT condition
posts = Post.objects.filter(
    ~Q(status='draft')
)

# Complex combination
posts = Post.objects.filter(
    (Q(status='published') | Q(featured=True)) & ~Q(category=None)
)

# Build Q objects dynamically
def search_posts(query, status=None):
    q = Q(title__icontains=query) | Q(body__icontains=query)
    if status:
        q &= Q(status=status)
    return Post.objects.filter(q)
```

---

## 7. F Expressions — Reference Field Values

`F()` lets you reference a model field's value in a query without loading it to Python first.

```python
from django.db.models import F

# Increment a counter without loading the object
Post.objects.filter(pk=1).update(view_count=F('view_count') + 1)

# Compare two fields on the same row
# Find posts where view_count > comment_count
Post.objects.filter(view_count__gt=F('comment_count'))

# Use in annotations
from django.db.models import ExpressionWrapper, DurationField
posts = Post.objects.annotate(
    time_to_publish=ExpressionWrapper(
        F('published_at') - F('created_at'),
        output_field=DurationField(),
    )
)
```

---

## 8. Annotations and Aggregations

```python
from django.db.models import Count, Avg, Max, Min, Sum, Value
from django.db.models.functions import Coalesce

# Count related objects per row
authors = Author.objects.annotate(
    post_count=Count('posts'),
    published_count=Count('posts', filter=Q(posts__status='published')),
)

# Coalesce — handle NULL
authors = Author.objects.annotate(
    post_count=Coalesce(Count('posts'), Value(0))
)

# Aggregate the whole QuerySet
stats = Post.objects.aggregate(
    total=Count('id'),
    avg_views=Avg('view_count'),
    max_views=Max('view_count'),
)

# Group by (values() + annotate)
tag_counts = Tag.objects.values('name').annotate(
    post_count=Count('posts')
).order_by('-post_count')
```

---

## 9. Subqueries

```python
from django.db.models import OuterRef, Subquery

# Get the title of the latest post for each author
latest_post = Post.objects.filter(
    author=OuterRef('pk')
).order_by('-created_at').values('title')[:1]

authors = Author.objects.annotate(
    latest_post_title=Subquery(latest_post)
)
```

---

## 10. Window Functions (Django 2.0+)

```python
from django.db.models import Window
from django.db.models.functions import Rank, RowNumber, Lead, Lag

# Rank posts by view count within each category
posts = Post.objects.annotate(
    rank=Window(
        expression=Rank(),
        partition_by=[F('category')],
        order_by=F('view_count').desc(),
    )
)

# Row number
posts = Post.objects.annotate(
    row_num=Window(
        expression=RowNumber(),
        order_by=F('created_at').asc(),
    )
)
```

---

## 11. Raw SQL (when needed)

```python
# Safe — parameterized
posts = Post.objects.raw(
    'SELECT * FROM blog_post WHERE status = %s ORDER BY created_at DESC',
    ['published']
)

# Execute arbitrary SQL
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute(
        'UPDATE blog_post SET view_count = view_count + 1 WHERE id = %s',
        [post_id]
    )

# Named params (platform-specific — PostgreSQL prefers %s)
with connection.cursor() as cursor:
    cursor.execute('SELECT count(*) FROM blog_post')
    row = cursor.fetchone()
    total = row[0]
```

---

## 12. Query Optimisation Checklist

1. **Use `select_related`** for every FK/O2O you'll access in a loop
2. **Use `prefetch_related`** for every M2M or reverse FK
3. **Use `only()` / `defer()`** to fetch only needed columns
4. **Use `values()` / `values_list()`** when you don't need model instances
5. **Use `exists()`** instead of `count()` when checking existence
6. **Use `update()` / `delete()`** instead of looping and calling `.save()`
7. **Add indexes** on frequently filtered fields
8. **Use `django-debug-toolbar`** to count SQL queries per request

```python
# Only fetch columns you need
posts = Post.objects.only('id', 'title', 'slug')

# Even lighter — returns dicts (no model overhead)
posts = Post.objects.values('id', 'title', 'slug')

# Returns list of tuples
post_titles = Post.objects.values_list('title', flat=True)

# Existence check — faster than count()
if Post.objects.filter(author=user).exists():
    print('User has posts')
```

---

## Quick Reference

| Feature | Code |
|---|---|
| FK filter | `Post.objects.filter(author__name='Alice')` |
| Reverse FK | `author.posts.all()` |
| Add M2M | `post.tags.add(tag)` |
| N+1 FK fix | `Post.objects.select_related('author')` |
| N+1 M2M fix | `Post.objects.prefetch_related('tags')` |
| OR filter | `filter(Q(a=1) \| Q(b=2))` |
| Field ref | `update(count=F('count') + 1)` |
| Count related | `annotate(cnt=Count('posts'))` |
| Aggregate | `aggregate(avg=Avg('views'))` |
| Group by | `values('field').annotate(cnt=Count('id'))` |
