# Advanced ORM and Relations

## Relation Types

- `ForeignKey`: many-to-one
- `OneToOneField`: one-to-one
- `ManyToManyField`: many-to-many

## Syntax Example

```python
from django.conf import settings
from django.db import models


class Category(models.Model):
  name = models.CharField(max_length=100)


class Post(models.Model):
  title = models.CharField(max_length=200)
  author = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name='posts',
  )
  categories = models.ManyToManyField(Category, related_name='posts')
```

## Query Optimization

```python
Post.objects.select_related('author').prefetch_related('categories')
```

## Advanced Query Syntax

```python
from django.db.models import Count, F, Q

posts = Post.objects.filter(
  Q(title__icontains='django') | Q(author__username__icontains='admin'),
)

Post.objects.update(views=F('views') + 1)

stats = Post.objects.values('author__username').annotate(total=Count('id'))
```

## Safe Upserts

```python
post, created = Post.objects.update_or_create(
  title='Intro',
  defaults={'author_id': 1},
)
```
