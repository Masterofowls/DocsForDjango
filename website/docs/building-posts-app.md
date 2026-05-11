---
id: building-posts-app
slug: /building-posts-app
sidebar_position: 25
description: "Step-by-step tutorial: build a full-featured blog posts application in Django."
---

# Building a Posts Application

## Overview

This tutorial builds a complete blog-style posts application from scratch. You will create models,
views, templates, forms, URL routing, pagination, search, and an RSS feed. By the end you will have
a working multi-user blog with categories, tags, comments, and draft/publish workflow.

---

## 1. Create the App

```powershell
python manage.py startapp blog
```

```python
# settings.py
INSTALLED_APPS += ['blog']
```

---

## 2. Models

```python
# blog/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.text import slugify

User = get_user_model()


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Post(models.Model):
    DRAFT = 'draft'
    PUBLISHED = 'published'
    STATUS_CHOICES = [(DRAFT, 'Draft'), (PUBLISHED, 'Published')]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts'
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts')
    body = models.TextField()
    excerpt = models.TextField(blank=True, max_length=400)
    cover_image = models.ImageField(upload_to='covers/%Y/%m/', blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=DRAFT, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    views = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['status', 'published_at']),
            models.Index(fields=['author', 'status']),
        ]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('blog:post_detail', args=[self.slug])

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        if not self.excerpt and self.body:
            self.excerpt = self.body[:397] + '...'
        super().save(*args, **kwargs)


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Comment by {self.author} on {self.post}'
```

```powershell
python manage.py makemigrations blog
python manage.py migrate
```

---

## 3. URL Configuration

```python
# blog/urls.py
from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
    path('', views.PostListView.as_view(), name='post_list'),
    path('create/', views.PostCreateView.as_view(), name='post_create'),
    path('<slug:slug>/', views.PostDetailView.as_view(), name='post_detail'),
    path('<slug:slug>/edit/', views.PostUpdateView.as_view(), name='post_edit'),
    path('<slug:slug>/delete/', views.PostDeleteView.as_view(), name='post_delete'),
    path('<slug:slug>/publish/', views.publish_post, name='post_publish'),
    path('category/<slug:slug>/', views.CategoryDetailView.as_view(), name='category'),
    path('search/', views.SearchView.as_view(), name='search'),
]
```

```python
# config/urls.py
urlpatterns += [path('blog/', include('blog.urls', namespace='blog'))]
```

---

## 4. Views

```python
# blog/views.py
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect
from django.db.models import Q, F
from django.utils import timezone
from .models import Post, Category
from .forms import PostForm, CommentForm


class PostListView(ListView):
    model = Post
    template_name = 'blog/post_list.html'
    context_object_name = 'posts'
    paginate_by = 10

    def get_queryset(self):
        return (
            Post.objects
            .filter(status=Post.PUBLISHED)
            .select_related('author', 'category')
            .prefetch_related('tags')
        )


class PostDetailView(DetailView):
    model = Post
    template_name = 'blog/post_detail.html'

    def get_object(self, queryset=None):
        post = get_object_or_404(
            Post.objects.select_related('author', 'category').prefetch_related('tags', 'comments__author'),
            slug=self.kwargs['slug'],
            status=Post.PUBLISHED,
        )
        # Increment view count atomically
        Post.objects.filter(pk=post.pk).update(views=F('views') + 1)
        return post

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['comment_form'] = CommentForm()
        ctx['comments'] = self.object.comments.filter(is_approved=True).select_related('author')
        return ctx

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        self.object = self.get_object()
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.post = self.object
            comment.author = request.user
            comment.save()
            return redirect(self.object.get_absolute_url())
        return self.get(request, *args, **kwargs)


class PostCreateView(LoginRequiredMixin, CreateView):
    model = Post
    form_class = PostForm
    template_name = 'blog/post_form.html'

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)


class PostUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Post
    form_class = PostForm
    template_name = 'blog/post_form.html'

    def test_func(self):
        return self.get_object().author == self.request.user or self.request.user.is_staff


class PostDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Post
    template_name = 'blog/post_confirm_delete.html'
    success_url = '/blog/'

    def test_func(self):
        return self.get_object().author == self.request.user or self.request.user.is_staff


@login_required
def publish_post(request, slug):
    post = get_object_or_404(Post, slug=slug, author=request.user)
    post.status = Post.PUBLISHED
    post.published_at = timezone.now()
    post.save(update_fields=['status', 'published_at'])
    return redirect(post.get_absolute_url())


class CategoryDetailView(ListView):
    template_name = 'blog/category_detail.html'
    context_object_name = 'posts'
    paginate_by = 10

    def get_queryset(self):
        self.category = get_object_or_404(Category, slug=self.kwargs['slug'])
        return (
            Post.objects
            .filter(category=self.category, status=Post.PUBLISHED)
            .select_related('author')
        )

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['category'] = self.category
        return ctx


class SearchView(ListView):
    template_name = 'blog/search.html'
    context_object_name = 'posts'
    paginate_by = 10

    def get_queryset(self):
        query = self.request.GET.get('q', '').strip()
        if not query:
            return Post.objects.none()
        return (
            Post.objects
            .filter(
                Q(title__icontains=query) |
                Q(body__icontains=query) |
                Q(excerpt__icontains=query),
                status=Post.PUBLISHED,
            )
            .select_related('author', 'category')
        )

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['query'] = self.request.GET.get('q', '')
        return ctx
```

---

## 5. Forms

```python
# blog/forms.py
from django import forms
from .models import Post, Comment


class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['title', 'category', 'tags', 'body', 'excerpt', 'cover_image']
        widgets = {
            'body': forms.Textarea(attrs={'rows': 20}),
            'excerpt': forms.Textarea(attrs={'rows': 3}),
            'tags': forms.CheckboxSelectMultiple(),
        }


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['body']
        widgets = {'body': forms.Textarea(attrs={'rows': 4})}
```

---

## 6. Admin

```python
# blog/admin.py
from django.contrib import admin
from .models import Post, Category, Tag, Comment


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'status', 'views', 'published_at']
    list_filter = ['status', 'category', 'tags']
    search_fields = ['title', 'body']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author']
    date_hierarchy = 'published_at'
    ordering = ['-created_at']
    actions = ['make_published', 'make_draft']

    def make_published(self, request, queryset):
        from django.utils import timezone
        queryset.update(status=Post.PUBLISHED, published_at=timezone.now())
    make_published.short_description = 'Mark selected posts as Published'

    def make_draft(self, request, queryset):
        queryset.update(status=Post.DRAFT)
    make_draft.short_description = 'Mark selected posts as Draft'


admin.site.register(Category)
admin.site.register(Tag)
admin.site.register(Comment)
```

---

## Quick Reference

| Feature | Location |
|---|---|
| App creation | `python manage.py startapp blog` |
| Status workflow | `status = models.CharField(choices=STATUS_CHOICES)` |
| Atomic view counter | `Post.objects.filter(pk=pk).update(views=F('views') + 1)` |
| Paginated list | `ListView` with `paginate_by = 10` |
| Author-only edit | `UserPassesTestMixin.test_func()` |
| Search | `Q(title__icontains=q) \| Q(body__icontains=q)` |
| Publish action | Set `status`, `published_at`, call `save()` |
| Admin bulk actions | `actions = ['make_published']` + method |
