# Models and ORM Basics

## Definition

A model is a Python class mapped to a database table by Django ORM.

## Syntax

```python
from django.db import models


class Post(models.Model):
  title = models.CharField(max_length=200)
  slug = models.SlugField(unique=True)
  body = models.TextField()
  is_published = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return self.title
```

## Migrations

```powershell
python manage.py makemigrations
python manage.py migrate
```

## Basic Query Examples

```python
Post.objects.create(title='Intro', slug='intro', body='Body')
Post.objects.filter(is_published=True)
Post.objects.get(slug='intro')
Post.objects.order_by('-created_at')[:10]
```

## Model Meta Example

```python
class Meta:
  ordering = ['-created_at']
  indexes = [models.Index(fields=['slug'])]
```
