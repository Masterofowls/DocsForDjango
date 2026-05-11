---
id: django-rest-framework-deep-dive
slug: /django-rest-framework-deep-dive
sidebar_position: 20
description: "Advanced DRF: nested serializers, filtering, pagination, throttling, versioning, and testing."
---

# Django REST Framework Deep Dive

## Overview

This guide covers advanced DRF features: nested serializers, related field strategies, custom
filtering, pagination, throttling, API versioning, OpenAPI schema generation, and writing API tests.

---

## 1. Nested and Related Serializers

### Writable nested serializer

```python
# api/serializers.py
from rest_framework import serializers
from blog.models import Post, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class PostSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'body', 'tags']

    def create(self, validated_data):
        tags_data = validated_data.pop('tags', [])
        post = Post.objects.create(**validated_data)
        for tag_data in tags_data:
            tag, _ = Tag.objects.get_or_create(**tag_data)
            post.tags.add(tag)
        return post

    def update(self, instance, validated_data):
        tags_data = validated_data.pop('tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags_data is not None:
            instance.tags.set([
                Tag.objects.get_or_create(**td)[0] for td in tags_data
            ])
        return instance
```

### Hyperlinked serializer (HATEOAS)

```python
class PostHyperlinkedSerializer(serializers.HyperlinkedModelSerializer):
    url = serializers.HyperlinkedIdentityField(view_name='post-detail')
    author = serializers.HyperlinkedRelatedField(view_name='user-detail', read_only=True)

    class Meta:
        model = Post
        fields = ['url', 'title', 'author', 'created_at']
```

---

## 2. Custom Filtering

### Manual query param filtering

```python
class PostViewSet(ModelViewSet):
    def get_queryset(self):
        qs = Post.objects.select_related('author', 'category')
        params = self.request.query_params

        if status := params.get('status'):
            qs = qs.filter(status=status)
        if author_id := params.get('author'):
            qs = qs.filter(author_id=author_id)
        if search := params.get('search'):
            qs = qs.filter(title__icontains=search)
        if tag := params.get('tag'):
            qs = qs.filter(tags__slug=tag)
        return qs
```

### django-filter integration (recommended)

```powershell
pip install django-filter
```

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}
```

```python
# api/filters.py
import django_filters
from blog.models import Post


class PostFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Post.STATUS_CHOICES)
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    min_words = django_filters.NumberFilter(method='filter_min_words')

    class Meta:
        model = Post
        fields = ['status', 'category', 'author']

    def filter_min_words(self, queryset, name, value):
        from django.db.models import Length
        return queryset.annotate(word_count=Length('body')).filter(word_count__gte=value)
```

```python
class PostViewSet(ModelViewSet):
    filterset_class = PostFilter
    search_fields = ['title', 'body', 'author__email']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']
```

---

## 3. Custom Pagination

```python
# api/pagination.py
from rest_framework.pagination import PageNumberPagination, CursorPagination


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response(self, data):
        from rest_framework.response import Response
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'total_pages': self.page.paginator.num_pages,
            'results': data,
        })


class PostCursorPagination(CursorPagination):
    """Stable pagination for feeds — safe with concurrent writes."""
    page_size = 20
    ordering = '-created_at'
    cursor_query_param = 'cursor'
```

```python
class PostViewSet(ModelViewSet):
    pagination_class = StandardPagination
```

---

## 4. Throttling

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'burst': '60/min',
    },
}
```

### Custom throttle class

```python
from rest_framework.throttling import UserRateThrottle


class BurstRateThrottle(UserRateThrottle):
    scope = 'burst'


class PostCreateView(ListCreateAPIView):
    throttle_classes = [BurstRateThrottle]
```

---

## 5. API Versioning

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1', 'v2'],
    'VERSION_PARAM': 'version',
}
```

```python
# urls.py
urlpatterns = [
    path('api/<version>/', include('api.urls')),
]
```

```python
class PostViewSet(ModelViewSet):
    def get_serializer_class(self):
        if self.request.version == 'v2':
            return PostV2Serializer
        return PostSerializer
```

---

## 6. OpenAPI Schema with drf-spectacular

```powershell
pip install drf-spectacular
```

```python
# settings.py
INSTALLED_APPS += ['drf_spectacular']

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'My API',
    'DESCRIPTION': 'API documentation',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
```

```python
# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns += [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
```

### Annotating views

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter


class PostViewSet(ModelViewSet):
    @extend_schema(
        parameters=[
            OpenApiParameter('status', str, description='Filter by status'),
        ],
        responses={200: PostSerializer(many=True)},
        description='List all posts, optionally filtered by status.',
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
```

---

## 7. API Testing

```python
# api/tests/test_posts.py
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from blog.models import Post, Category

User = get_user_model()


class PostAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alice', email='alice@example.com', password='pass123'
        )
        self.category = Category.objects.create(name='Tech', slug='tech')
        self.client = APIClient()

    def test_list_posts_unauthenticated(self):
        url = reverse('post-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_posts_authenticated(self):
        Post.objects.create(
            title='Test', slug='test', body='x', author=self.user, category=self.category
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('post-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_create_post(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'title': 'New Post',
            'body': 'Content here.' * 10,
            'category_id': self.category.pk,
        }
        response = self.client.post(reverse('post-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Post')

    def test_update_post_forbidden(self):
        other = User.objects.create_user(username='bob', email='bob@example.com', password='x')
        post = Post.objects.create(
            title='Bob Post', slug='bob-post', body='x', author=other, category=self.category
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse('post-detail', kwargs={'pk': post.pk}),
            {'title': 'Hacked'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

---

## Quick Reference

| Feature | Code |
|---|---|
| Nested serializer | `tags = TagSerializer(many=True)` |
| Writable nested | Override `create()` and `update()` to handle nested |
| django-filter | `filterset_class = PostFilter` |
| Search | `search_fields = ['title', 'body']` |
| Ordering | `ordering_fields = ['created_at']` |
| Custom pagination | `pagination_class = StandardPagination` |
| Cursor pagination | `class P(CursorPagination): ordering = '-created_at'` |
| Throttle | `DEFAULT_THROTTLE_RATES = {'user': '1000/day'}` |
| OpenAPI | `pip install drf-spectacular` + `SCHEMA_CLASS` |
| API test | `self.client.force_authenticate(user=self.user)` |
