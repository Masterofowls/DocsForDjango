# URL Routing

## Definition

URL routing maps incoming request paths to view callables.

## Syntax

Project-level URLs (`config/urls.py`):

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
  path('admin/', admin.site.urls),
  path('blog/', include('blog.urls')),
]
```

App-level URLs (`blog/urls.py`):

```python
from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
  path('', views.post_list, name='post_list'),
  path('<slug:slug>/', views.post_detail, name='post_detail'),
]
```

## Reverse URL Usage

```python
from django.urls import reverse
reverse('blog:post_detail', kwargs={'slug': 'intro-to-django'})
```

## Custom Converter Example

```python
class YearConverter:
  regex = '[0-9]{4}'

  def to_python(self, value):
    return int(value)

  def to_url(self, value):
    return str(value)
```
