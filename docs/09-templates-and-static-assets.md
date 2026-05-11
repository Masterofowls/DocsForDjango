# Templates and Static Assets

## Definitions

- Template: HTML with Django template language.
- Static asset: CSS, JS, image served as static content.

## Template Syntax

```html
{% extends 'base.html' %}
{% block content %}
  {% for post in posts %}
    <h2>{{ post.title }}</h2>
  {% empty %}
    <p>No posts</p>
  {% endfor %}
{% endblock %}
```

## Static Syntax

```html
{% load static %}
<link rel='stylesheet' href='{% static "css/site.css" %}'>
```

## Template Filters

```html
{{ post.created_at|date:'Y-m-d H:i' }}
{{ post.body|truncatewords:30 }}
```

## Context Processor Example

```python
def site_context(request):
  return {'SITE_NAME': 'DocsForDjango'}
```

Register in `TEMPLATES[0]['OPTIONS']['context_processors']`.
