---
id: templates-and-static-assets
slug: /templates-and-static-assets
sidebar_position: 10
description: "Django templates, template tags, filters, inheritance, static files, and media files setup."
---

# Templates and Static Assets

## Overview

Django's template engine renders HTML from `.html` files with embedded template language. Static
assets (CSS, JS, images) are managed separately using Django's static files framework. This guide
covers template configuration, the template language, template inheritance, custom tags/filters,
and the full static and media file pipeline.

---

## 1. Template Configuration

```python
# settings.py
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],    # project-level templates
        'APP_DIRS': True,                    # look in each app's templates/ folder
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
```

### Template discovery order

With `APP_DIRS=True`, Django searches:
1. `DIRS` list (project-level: `templates/`)
2. Each installed app's `templates/` subdirectory (e.g., `blog/templates/`)

### Recommended directory layout

```
myproject/
  templates/
    base.html                 ← project-wide base
    partials/
      navbar.html
      footer.html
  blog/
    templates/
      blog/
        post_list.html        ← namespaced under app name
        post_detail.html
        post_form.html
  accounts/
    templates/
      accounts/
        login.html
```

---

## 2. Template Language Basics

### Variables

```html
{{ post.title }}
{{ user.get_full_name }}
{{ request.user.email }}
```

### Tags

```html
{% if user.is_authenticated %}
  Hello, {{ user.username }}!
{% elif request.user.is_staff %}
  Hello, Admin!
{% else %}
  Hello, Guest!
{% endif %}

{% for post in posts %}
  <h2>{{ post.title }}</h2>
  {% empty %}
  <p>No posts yet.</p>
{% endfor %}

{% with total=posts.count %}
  {{ total }} post{{ total|pluralize }}
{% endwith %}

{% url 'blog:post-detail' slug=post.slug %}
{% url 'blog:post-list' %}
```

### Filters

```html
{{ post.title|upper }}
{{ post.title|lower }}
{{ post.title|title }}
{{ post.body|truncatewords:30 }}
{{ post.body|truncatechars:150 }}
{{ post.body|linebreaks }}
{{ post.body|striptags }}
{{ post.created_at|date:"F j, Y" }}
{{ post.created_at|timesince }} ago
{{ post.price|floatformat:2 }}
{{ value|default:"N/A" }}
{{ items|join:", " }}
{{ items|length }}
{{ text|slugify }}
{{ html|safe }}   ← use with care — only trusted content
{{ value|escape }}
```

---

## 3. Template Inheritance

The most important pattern in Django templates.

### Base template

```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% block title %}My Site{% endblock %}</title>
  {% load static %}
  <link rel="stylesheet" href="{% static 'css/main.css' %}">
  {% block extra_css %}{% endblock %}
</head>
<body>
  {% include 'partials/navbar.html' %}

  <main class="container">
    {% if messages %}
      {% for message in messages %}
        <div class="alert alert-{{ message.tags }}">{{ message }}</div>
      {% endfor %}
    {% endif %}

    {% block content %}{% endblock %}
  </main>

  {% include 'partials/footer.html' %}

  <script src="{% static 'js/main.js' %}"></script>
  {% block extra_js %}{% endblock %}
</body>
</html>
```

### Child template

```html
<!-- blog/templates/blog/post_list.html -->
{% extends 'base.html' %}
{% load static %}

{% block title %}Blog — {{ block.super }}{% endblock %}

{% block content %}
  <h1>Latest Posts</h1>

  {% for post in posts %}
    <article>
      <h2><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h2>
      <p>{{ post.excerpt }}</p>
      <small>{{ post.created_at|date:"N j, Y" }} by {{ post.author.get_full_name }}</small>
    </article>
  {% empty %}
    <p>No posts published yet.</p>
  {% endfor %}

  {% include 'partials/pagination.html' with page_obj=page_obj %}
{% endblock %}
```

### Include with context

```html
<!-- Reusable partial -->
{% include 'partials/post_card.html' with post=post only %}
```

---

## 4. Custom Template Tags

### Step 1 — Create templatetags module

```
blog/
  templatetags/
    __init__.py
    blog_tags.py
```

### Step 2 — Write tags

```python
# blog/templatetags/blog_tags.py
from django import template
from django.utils.html import format_html
from blog.models import Post

register = template.Library()


# Simple tag — returns a value
@register.simple_tag
def latest_posts(count=5):
    return Post.objects.filter(status='published').order_by('-created_at')[:count]


# Inclusion tag — renders a template fragment
@register.inclusion_tag('blog/partials/sidebar_posts.html')
def sidebar_posts(count=5):
    posts = Post.objects.filter(status='published').order_by('-created_at')[:count]
    return {'posts': posts}


# Filter — transforms a value
@register.filter(name='reading_time')
def reading_time(text, wpm=200):
    word_count = len(text.split())
    minutes = max(1, round(word_count / wpm))
    return f'{minutes} min read'


# Mark safe filter (only for trusted content!)
@register.filter(is_safe=True)
def highlight_code(value):
    # process code highlighting...
    return format_html('<pre><code>{}</code></pre>', value)
```

### Step 3 — Use in template

```html
{% load blog_tags %}

{% latest_posts as posts %}
{% for post in posts %}
  {{ post.title }}
{% endfor %}

{% sidebar_posts 3 %}

<small>{{ post.body|reading_time }}</small>
```

---

## 5. Static Files Configuration

### Development setup

```python
# settings.py
STATIC_URL = '/static/'

# Directories to collect from
STATICFILES_DIRS = [
    BASE_DIR / 'static',     # project-level static files
]

# Where collectstatic outputs to (production only)
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

### Project structure

```
myproject/
  static/
    css/
      main.css
    js/
      main.js
    img/
      logo.png
  blog/
    static/
      blog/
        css/
          blog.css        ← namespaced under app name
        js/
          comments.js
```

### Using static files in templates

```html
{% load static %}

<link rel="stylesheet" href="{% static 'css/main.css' %}">
<script src="{% static 'js/main.js' %}"></script>
<img src="{% static 'img/logo.png' %}" alt="Logo">

<!-- App-specific (namespaced) -->
<link rel="stylesheet" href="{% static 'blog/css/blog.css' %}">
```

---

## 6. Collecting Static Files (Production)

```powershell
# Collect all static files into STATIC_ROOT
python manage.py collectstatic --noinput
```

This copies all static files from all apps and STATICFILES_DIRS into `STATIC_ROOT`.
Your web server (Nginx, Caddy) or CDN then serves files from that directory.

### Using WhiteNoise (serve static from Django)

```powershell
pip install whitenoise
```

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # ← add here, after Security
    # ...
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

---

## 7. Media Files (User Uploads)

Media files are user-uploaded files (different from static assets).

### Configuration

```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### Serve in development

```python
# config/urls.py
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ...
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### Model with upload field

```python
class Post(models.Model):
    hero_image = models.ImageField(
        upload_to='posts/images/%Y/%m/',   # organized by year/month
        blank=True,
    )
```

### Template

```html
{% if post.hero_image %}
  <img src="{{ post.hero_image.url }}" alt="{{ post.title }}">
{% endif %}
```

---

## 8. Template Context Processors

Context processors inject variables into every template:

```python
# myapp/context_processors.py
def global_settings(request):
    from django.conf import settings
    return {
        'SITE_NAME': settings.SITE_NAME,
        'SUPPORT_EMAIL': settings.SUPPORT_EMAIL,
    }
```

```python
# settings.py — add to context_processors list
'OPTIONS': {
    'context_processors': [
        # ...
        'myapp.context_processors.global_settings',
    ],
}
```

---

## Quick Reference

| Task | Code |
|---|---|
| Extend base | `{% extends 'base.html' %}` |
| Define block | `{% block content %}...{% endblock %}` |
| Include partial | `{% include 'partials/nav.html' %}` |
| Static URL | `{% load static %}{% static 'css/main.css' %}` |
| URL reversal | `{% url 'blog:post-detail' slug=post.slug %}` |
| Truncate text | `{{ text\|truncatewords:30 }}` |
| Format date | `{{ dt\|date:"Y-m-d" }}` |
| Default value | `{{ val\|default:"N/A" }}` |
| Load custom tag | `{% load blog_tags %}` |
| Collect static | `python manage.py collectstatic --noinput` |
