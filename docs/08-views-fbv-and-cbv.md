# Views: FBV and CBV

## Definition

A view handles HTTP requests and returns HTTP responses.

## Function-Based View Syntax

```python
from django.shortcuts import render
from .models import Post


def post_list(request):
  posts = Post.objects.filter(is_published=True)
  return render(request, 'blog/post_list.html', {'posts': posts})
```

## Class-Based View Syntax

```python
from django.views.generic import DetailView, ListView


class PostListView(ListView):
  model = Post
  template_name = 'blog/post_list.html'

  def get_queryset(self):
    return Post.objects.filter(is_published=True)
```

## Mixins Example

```python
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import CreateView


class PostCreateView(LoginRequiredMixin, CreateView):
  model = Post
  fields = ['title', 'slug', 'body']
```

## Response Types

```python
from django.http import JsonResponse


def ping(request):
  return JsonResponse({'ok': True})
```
