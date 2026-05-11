---
id: django-rest-framework
slug: /django-rest-framework
sidebar_position: 19
description: "Django REST Framework — serializers, views, routers, authentication, and permissions."
---

# Django REST Framework

## Overview

Django REST Framework (DRF) is the de-facto standard for building REST APIs with Django. It provides
serializers, class-based API views, view sets, routers, authentication, permissions, throttling, and
browsable API documentation out of the box.

---

## 1. Installation and Setup

```powershell
pip install djangorestframework
```

```python
# settings.py
INSTALLED_APPS = [
    ...
    'rest_framework',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

```python
# config/urls.py
urlpatterns = [
    path('api/', include('api.urls')),
    path('api-auth/', include('rest_framework.urls')),  # browsable API login
]
```

---

## 2. Serializers

Serializers convert model instances ↔ Python dicts ↔ JSON.

### Basic Serializer

```python
# api/serializers.py
from rest_framework import serializers
from blog.models import Post, Category


class CategorySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=100)
    slug = serializers.SlugField()

    def create(self, validated_data):
        return Category.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.save()
        return instance
```

### ModelSerializer (recommended)

```python
class PostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=Category.objects.all(),
        write_only=True,
    )
    word_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'title', 'slug', 'excerpt', 'body', 'status',
                  'author_name', 'category', 'category_id', 'word_count', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at', 'author_name']

    def get_word_count(self, obj):
        return len(obj.body.split())

    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError('Title must be at least 5 characters.')
        return value

    def validate(self, attrs):
        if attrs.get('status') == 'published' and not attrs.get('excerpt'):
            raise serializers.ValidationError({'excerpt': 'Required when publishing.'})
        return attrs
```

---

## 3. Function-Based API Views

```python
# api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from blog.models import Post
from .serializers import PostSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def post_list_create(request):
    if request.method == 'GET':
        posts = Post.objects.all().order_by('-created_at')
        serializer = PostSerializer(posts, many=True)
        return Response(serializer.data)

    serializer = PostSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def post_detail(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(PostSerializer(post).data)

    if post.author != request.user:
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ('PUT', 'PATCH'):
        partial = request.method == 'PATCH'
        serializer = PostSerializer(post, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    post.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
```

---

## 4. Class-Based API Views

```python
from rest_framework.views import APIView
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)


class PostListCreateView(ListCreateAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Post.objects.select_related('author', 'category')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class PostDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
```

---

## 5. ViewSets and Routers

ViewSets combine list/create/retrieve/update/destroy into one class.

```python
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response


class PostViewSet(ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    # Custom action: POST /api/posts/{pk}/publish/
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = 'published'
        post.save()
        return Response({'status': 'published'})

    # Custom action: GET /api/posts/drafts/
    @action(detail=False, methods=['get'])
    def drafts(self, request):
        drafts = self.get_queryset().filter(status='draft')
        serializer = self.get_serializer(drafts, many=True)
        return Response(serializer.data)
```

```python
# api/urls.py
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('posts', views.PostViewSet, basename='post')
router.register('categories', views.CategoryViewSet, basename='category')

urlpatterns = router.urls
```

This generates:

| Method | URL | Name |
|---|---|---|
| GET | `/api/posts/` | post-list |
| POST | `/api/posts/` | post-list |
| GET | `/api/posts/{pk}/` | post-detail |
| PUT/PATCH | `/api/posts/{pk}/` | post-detail |
| DELETE | `/api/posts/{pk}/` | post-detail |
| POST | `/api/posts/{pk}/publish/` | post-publish |
| GET | `/api/posts/drafts/` | post-drafts |

---

## 6. Authentication

### Token Authentication (JWT-style simple token)

```powershell
pip install djangorestframework-simplejwt
```

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}
```

```python
# urls.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns += [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

---

## 7. Permissions

```python
from rest_framework.permissions import BasePermission, IsAdminUser, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """Allow read for anyone, write only for the object owner."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.author == request.user


class PostViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
```

---

## Quick Reference

| Feature | Code |
|---|---|
| Install | `pip install djangorestframework` |
| ModelSerializer | `class S(ModelSerializer): class Meta: model=M; fields='__all__'` |
| FBV | `@api_view(['GET', 'POST'])` |
| Generic CBV | `class V(ListCreateAPIView): serializer_class=S; queryset=M.objects.all()` |
| ViewSet | `class V(ModelViewSet): serializer_class=S` |
| Router | `router.register('posts', PostViewSet)` |
| Custom action | `@action(detail=True, methods=['post'])` |
| Permission | `class P(BasePermission): has_object_permission(...)` |
| JWT install | `pip install djangorestframework-simplejwt` |
