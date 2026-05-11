---
id: views-fbv-and-cbv
slug: /views-fbv-and-cbv
sidebar_position: 9
description: "Function-based views (FBVs), class-based views (CBVs), generic views, mixins, and decorators."
---

# Views: FBV and CBV

## Overview

Django views receive an HTTP request and return an HTTP response. You can write views as functions
(FBVs) or as classes (CBVs). Both have a place in a well-structured project: FBVs are simpler
and more readable; CBVs offer reusability and Django's built-in generic views (ListView, DetailView,
etc.) dramatically reduce boilerplate.

---

## 1. Function-Based Views (FBVs)

The simplest view is a Python function:

```python
# blog/views.py
from django.http import HttpResponse, HttpRequest
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required

from .models import Post


def post_list(request: HttpRequest) -> HttpResponse:
    posts = Post.objects.filter(status='published').select_related('author')
    return render(request, 'blog/post_list.html', {'posts': posts})


def post_detail(request: HttpRequest, slug: str) -> HttpResponse:
    post = get_object_or_404(Post, slug=slug, status='published')
    return render(request, 'blog/post_detail.html', {'post': post})


@login_required
def post_create(request: HttpRequest) -> HttpResponse:
    if request.method == 'POST':
        form = PostForm(request.POST)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            return redirect('blog:post-detail', slug=post.slug)
    else:
        form = PostForm()
    return render(request, 'blog/post_form.html', {'form': form})
```

### HTTP method dispatch pattern

```python
def post_edit(request: HttpRequest, pk: int) -> HttpResponse:
    post = get_object_or_404(Post, pk=pk)

    if request.method == 'POST':
        form = PostForm(request.POST, instance=post)
        if form.is_valid():
            form.save()
            return redirect('blog:post-detail', slug=post.slug)
    else:
        form = PostForm(instance=post)

    return render(request, 'blog/post_form.html', {'form': form, 'post': post})
```

---

## 2. The `render`, `redirect`, and `get_object_or_404` Shortcuts

```python
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse

# render — builds HttpResponse with template context
response = render(request, 'blog/post.html', {'post': post})

# render with custom status code
return render(request, 'errors/404.html', {}, status=404)

# redirect — 302 by default
return redirect('blog:post-detail', slug=post.slug)

# redirect with permanent (301)
return redirect('blog:post-list', permanent=True)

# redirect to URL string
return redirect('/blog/')

# get_object_or_404 — avoids try/except
post = get_object_or_404(Post, pk=pk)
post = get_object_or_404(Post, slug=slug, status='published')
```

---

## 3. Class-Based Views (CBVs)

CBVs inherit from `View` and implement HTTP method handlers:

```python
from django.views import View
from django.http import HttpResponse


class PostDetailView(View):
    template_name = 'blog/post_detail.html'

    def get(self, request, slug):
        post = get_object_or_404(Post, slug=slug)
        return render(request, self.template_name, {'post': post})

    def post(self, request, slug):
        # Handle POST separately
        post = get_object_or_404(Post, slug=slug)
        # process form...
        return redirect('blog:post-list')
```

Register in urls.py using `.as_view()`:

```python
# blog/urls.py
from django.urls import path
from .views import PostDetailView

urlpatterns = [
    path('<slug:slug>/', PostDetailView.as_view(), name='post-detail'),
]
```

---

## 4. Generic Class-Based Views

Django provides pre-built CBVs for common patterns. They all follow a consistent API.

### ListView

```python
from django.views.generic import ListView

class PostListView(ListView):
    model = Post
    template_name = 'blog/post_list.html'
    context_object_name = 'posts'          # default is 'object_list'
    paginate_by = 10
    ordering = ['-created_at']

    def get_queryset(self):
        return Post.objects.filter(status='published').select_related('author')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['total_count'] = self.get_queryset().count()
        return context
```

### DetailView

```python
from django.views.generic import DetailView

class PostDetailView(DetailView):
    model = Post
    template_name = 'blog/post_detail.html'
    context_object_name = 'post'

    def get_queryset(self):
        return Post.objects.filter(status='published')

    def get_object(self, queryset=None):
        return get_object_or_404(Post, slug=self.kwargs['slug'])
```

### CreateView

```python
from django.views.generic.edit import CreateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy

class PostCreateView(LoginRequiredMixin, CreateView):
    model = Post
    template_name = 'blog/post_form.html'
    fields = ['title', 'body', 'category', 'status']
    success_url = reverse_lazy('blog:post-list')   # lazy because URL conf not ready

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)
```

### UpdateView

```python
from django.views.generic.edit import UpdateView

class PostUpdateView(LoginRequiredMixin, UpdateView):
    model = Post
    template_name = 'blog/post_form.html'
    fields = ['title', 'body', 'category', 'status']

    def get_success_url(self):
        return reverse_lazy('blog:post-detail', kwargs={'slug': self.object.slug})

    def get_queryset(self):
        # Only allow editing own posts
        return Post.objects.filter(author=self.request.user)
```

### DeleteView

```python
from django.views.generic.edit import DeleteView

class PostDeleteView(LoginRequiredMixin, DeleteView):
    model = Post
    template_name = 'blog/post_confirm_delete.html'
    success_url = reverse_lazy('blog:post-list')

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user)
```

### TemplateView

```python
from django.views.generic import TemplateView

class AboutView(TemplateView):
    template_name = 'about.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'About Us'
        return context
```

### RedirectView

```python
from django.views.generic.base import RedirectView

# In urls.py
urlpatterns = [
    path('old/', RedirectView.as_view(url='/new/', permanent=True)),
    path('home/', RedirectView.as_view(pattern_name='index')),
]
```

---

## 5. Mixins

Mixins add reusable behaviour to CBVs without deep inheritance.

### LoginRequiredMixin

```python
from django.contrib.auth.mixins import LoginRequiredMixin

class PostCreateView(LoginRequiredMixin, CreateView):
    login_url = '/accounts/login/'   # redirect here if not authenticated
    redirect_field_name = 'next'
    # ...
```

### PermissionRequiredMixin

```python
from django.contrib.auth.mixins import PermissionRequiredMixin

class PostPublishView(PermissionRequiredMixin, UpdateView):
    permission_required = 'blog.can_publish'
    # ...
```

### UserPassesTestMixin

```python
from django.contrib.auth.mixins import UserPassesTestMixin

class AuthorOnlyView(UserPassesTestMixin, UpdateView):
    def test_func(self):
        post = self.get_object()
        return self.request.user == post.author
```

### Custom mixin

```python
class OwnershipMixin:
    """Restrict queryset to objects owned by the logged-in user."""
    def get_queryset(self):
        return super().get_queryset().filter(author=self.request.user)


class PostUpdateView(LoginRequiredMixin, OwnershipMixin, UpdateView):
    model = Post
    fields = ['title', 'body']
```

---

## 6. View Decorators (FBV)

```python
from django.contrib.auth.decorators import login_required, permission_required
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from django.views.decorators.cache import cache_page, never_cache
from django.views.decorators.csrf import csrf_exempt

# Require authentication
@login_required
def my_view(request): ...

# Require permission
@permission_required('blog.add_post')
def add_post(request): ...

# Restrict HTTP methods
@require_http_methods(['GET', 'POST'])
def contact(request): ...

@require_POST
def like_post(request, pk): ...

# Cache for 15 minutes
@cache_page(60 * 15)
def post_list(request): ...

# Never cache (e.g. sensitive data)
@never_cache
def account_settings(request): ...

# Stacking decorators (applied bottom-up)
@login_required
@require_POST
def publish_post(request, pk): ...
```

### Applying decorators to CBVs

```python
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

@method_decorator(cache_page(60 * 15), name='dispatch')
class PostListView(ListView):
    model = Post
```

---

## 7. Returning JSON Responses

```python
from django.http import JsonResponse

def api_post_count(request):
    count = Post.objects.filter(status='published').count()
    return JsonResponse({'count': count})

# Return a list
def api_tags(request):
    tags = list(Tag.objects.values('id', 'name', 'slug'))
    return JsonResponse({'tags': tags})

# Error response
def api_bad_request(request):
    return JsonResponse({'error': 'Invalid input'}, status=400)
```

---

## 8. Pagination

```python
from django.core.paginator import Paginator

def post_list(request):
    posts = Post.objects.filter(status='published')
    paginator = Paginator(posts, 10)   # 10 per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, 'blog/post_list.html', {'page_obj': page_obj})
```

```html
<!-- templates/blog/post_list.html -->
{% for post in page_obj %}
  <h2>{{ post.title }}</h2>
{% endfor %}

{% if page_obj.has_previous %}
  <a href="?page={{ page_obj.previous_page_number }}">Previous</a>
{% endif %}

Page {{ page_obj.number }} of {{ page_obj.paginator.num_pages }}

{% if page_obj.has_next %}
  <a href="?page={{ page_obj.next_page_number }}">Next</a>
{% endif %}
```

---

## Quick Reference

| Pattern | Code |
|---|---|
| FBV with template | `return render(request, 'template.html', context)` |
| Redirect | `return redirect('view-name', slug=slug)` |
| Get or 404 | `get_object_or_404(Model, pk=pk)` |
| List view | `class V(ListView): model=M; paginate_by=10` |
| Detail view | `class V(DetailView): model=M; slug_field='slug'` |
| Create view | `class V(LoginRequiredMixin, CreateView): fields=[...]` |
| Require login | `@login_required` / `LoginRequiredMixin` |
| Require POST | `@require_POST` |
| JSON response | `JsonResponse({'key': 'value'})` |
| Pagination | `Paginator(qs, per_page).get_page(n)` |
