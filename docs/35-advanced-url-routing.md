# Advanced URL Routing

## Path Converters

Built-in converters:

- `int`: matches integers
- `str`: matches non-slash strings
- `slug`: matches URL-safe strings
- `uuid`: matches UUIDs
- `path`: matches any string including slashes

Example:

```python
from django.urls import path
from . import views

urlpatterns = [
  path('posts/<int:post_id>/', views.post_detail),
  path('users/<slug:username>/', views.user_profile),
  path('files/<path:file_path>/', views.download_file),
  path('api/<uuid:request_id>/', views.api_handler),
]
```

## Custom Path Converters

```python
class YearConverter:
  regex = '[0-9]{4}'

  def to_python(self, value):
    return int(value)

  def to_url(self, value):
    return str(value)


class IsbnConverter:
  regex = '[0-9\-]{10,17}'

  def to_python(self, value):
    return value.replace('-', '')

  def to_url(self, value):
    return value
```

Register in URLconf:

```python
from django.urls import path, register_converter
from .converters import YearConverter, IsbnConverter

register_converter(YearConverter, 'year')
register_converter(IsbnConverter, 'isbn')

urlpatterns = [
  path('archive/<year:year>/', views.year_archive),
  path('books/<isbn:isbn>/', views.book_detail),
]
```

## Named Groups with Regex

Use `re_path` for complex patterns:

```python
from django.urls import re_path
from . import views

urlpatterns = [
  re_path(
    r'^articles/(?P<year>[0-9]{4})/(?P<month>[0-9]{2})/$',
    views.article_archive,
    name='archive',
  ),
]
```

## Query Parameters

Extract from `request.GET`:

```python
def search(request):
  query = request.GET.get('q', '')
  page = request.GET.get('page', 1)
  return render(request, 'search.html', {'query': query, 'page': page})
```

## Route Nesting and Namespaces

```python
from django.urls import path, include

blog_patterns = [
  path('', views.post_list, name='list'),
  path('<slug:slug>/', views.post_detail, name='detail'),
]

api_patterns = [
  path('posts/', views.api_post_list, name='posts'),
  path('posts/<int:pk>/', views.api_post_detail, name='post_detail'),
]

urlpatterns = [
  path('blog/', include((blog_patterns, 'blog'))),
  path('api/', include((api_patterns, 'api'))),
]
```

Reverse URL:

```python
reverse('blog:detail', kwargs={'slug': 'my-post'})
reverse('api:post_detail', kwargs={'pk': 1})
```

## URL Middleware

Modify URLs before routing:

```python
class URLMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    # Modify request.path_info if needed
    response = self.get_response(request)
    return response
```
