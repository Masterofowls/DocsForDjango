# Django REST Framework Deep Dive

## Project Setup

```powershell
pip install djangorestframework
pip install django-filter
pip install djangorestframework-jwt
```

Settings:

```python
INSTALLED_APPS = [
  # ...
  'rest_framework',
  'django_filters',
]

REST_FRAMEWORK = {
  'DEFAULT_AUTHENTICATION_CLASSES': [
    'rest_framework_jwt.authentication.JSONWebTokenAuthentication',
  ],
  'DEFAULT_FILTER_BACKENDS': [
    'django_filters.rest_framework.DjangoFilterBackend',
    'rest_framework.filters.SearchFilter',
    'rest_framework.filters.OrderingFilter',
  ],
  'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
  'PAGE_SIZE': 20,
  'DEFAULT_RENDERER_CLASSES': [
    'rest_framework.renderers.JSONRenderer',
  ],
}
```

## Serializers

```python
from rest_framework import serializers
from .models import Post, Category


class CategorySerializer(serializers.ModelSerializer):
  class Meta:
    model = Category
    fields = ['id', 'name', 'slug']


class PostSerializer(serializers.ModelSerializer):
  author_username = serializers.CharField(source='author.username', read_only=True)
  category = CategorySerializer(read_only=True)
  category_id = serializers.IntegerField(write_only=True)

  class Meta:
    model = Post
    fields = [
      'id', 'title', 'slug', 'body', 'author_username',
      'category', 'category_id', 'is_published', 'created_at',
    ]

  def validate_title(self, value):
    if len(value) < 5:
      raise serializers.ValidationError('Title too short.')
    return value
```

## ViewSets and Routers

```python
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import PostSerializer
from .models import Post


class PostViewSet(ModelViewSet):
  serializer_class = PostSerializer
  permission_classes = [IsAuthenticatedOrReadOnly]
  filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
  filterset_fields = ['is_published', 'category']
  search_fields = ['title', 'body']
  ordering_fields = ['created_at', 'title']

  def get_queryset(self):
    if self.request.user.is_staff:
      return Post.objects.all()
    return Post.objects.filter(is_published=True)

  @action(detail=True, methods=['post'])
  def publish(self, request, pk=None):
    post = self.get_object()
    post.is_published = True
    post.save()
    return Response({'status': 'published'})
```

## Routers

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('posts', PostViewSet, basename='post')

urlpatterns = router.urls
```

## Authentication and Permissions

```python
from rest_framework.permissions import IsAuthenticated, BasePermission


class IsAuthorOrReadOnly(BasePermission):
  def has_object_permission(self, request, view, obj):
    if request.method in ['GET', 'HEAD', 'OPTIONS']:
      return True
    return obj.author == request.user
```

Use in viewset:

```python
class PostViewSet(ModelViewSet):
  permission_classes = [IsAuthorOrReadOnly]
```

## Pagination

```python
from rest_framework.pagination import PageNumberPagination


class LargeResultsSetPagination(PageNumberPagination):
  page_size = 100
  page_size_query_param = 'page_size'
  max_page_size = 1000
```

## Schema Generation

```python
from rest_framework.schemas import SchemaGenerator

generator = SchemaGenerator(title='API')
schema = generator.get_schema()
```
