# Building a Posts App

## Project Structure

```text
posts/
  models.py
  views.py
  urls.py
  forms.py
  admin.py
  tests.py
  templates/
    posts/
      post_list.html
      post_detail.html
      post_form.html
```

## Models

```python
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class Category(models.Model):
  name = models.CharField(max_length=100, unique=True)
  slug = models.SlugField(unique=True)

  def __str__(self):
    return self.name


class Post(models.Model):
  title = models.CharField(max_length=200)
  slug = models.SlugField(unique=True)
  author = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name='posts',
  )
  category = models.ForeignKey(
    Category,
    on_delete=models.SET_NULL,
    null=True,
    related_name='posts',
  )
  body = models.TextField()
  is_published = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ['-created_at']
    indexes = [models.Index(fields=['slug'])]

  def __str__(self):
    return self.title
```

## Forms

```python
from django import forms
from .models import Post


class PostForm(forms.ModelForm):
  class Meta:
    model = Post
    fields = ['title', 'slug', 'category', 'body', 'is_published']

  def clean_slug(self):
    slug = self.cleaned_data['slug']
    if Post.objects.filter(slug=slug).exclude(pk=self.instance.pk).exists():
      raise forms.ValidationError('Slug must be unique.')
    return slug
```

## Views

```python
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Post, Category
from .forms import PostForm


def post_list(request):
  posts = Post.objects.filter(is_published=True).select_related('author', 'category')
  category = request.GET.get('category')
  if category:
    posts = posts.filter(category__slug=category)
  return render(request, 'posts/post_list.html', {'posts': posts})


@login_required
def post_create(request):
  if request.method == 'POST':
    form = PostForm(request.POST)
    if form.is_valid():
      post = form.save(commit=False)
      post.author = request.user
      post.save()
      return redirect('post_detail', slug=post.slug)
  else:
    form = PostForm()
  return render(request, 'posts/post_form.html', {'form': form})
```

## URLs

```python
from django.urls import path
from . import views

app_name = 'posts'

urlpatterns = [
  path('', views.post_list, name='post_list'),
  path('<slug:slug>/', views.post_detail, name='post_detail'),
  path('create/', views.post_create, name='post_create'),
]
```
