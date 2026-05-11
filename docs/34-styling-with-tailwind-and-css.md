# Styling with Tailwind CSS and Advanced CSS

## Tailwind CSS Setup

Install:

```powershell
pip install django-tailwind
```

Add to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
  # ...
  'tailwind',
]
```

Create Tailwind app:

```powershell
python manage.py tailwind init mysite
```

Configuration in `theme/static/src/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600;
  }
}
```

Watch for changes:

```powershell
python manage.py tailwind start
```

Build for production:

```powershell
python manage.py tailwind build
```

## Using in Templates

```html
{% load static %}

<!doctype html>
<html>
  <head>
    <link href='{% static "css/style.css" %}' rel='stylesheet'>
  </head>
  <body class='bg-gray-50'>
    <div class='max-w-4xl mx-auto p-4'>
      <h1 class='text-3xl font-bold text-gray-900'>Welcome</h1>
      <button class='btn-primary mt-4'>Click me</button>
    </div>
  </body>
</html>
```

## SCSS/SASS Support

For more advanced styling:

```powershell
pip install django-sass-processor
```

Use in templates:

```html
{% load sass_tags %}
<link rel='stylesheet' href='{% sass_src "css/style.scss" %}'>
```

## CSS Frameworks (Bootstrap Alternative)

Bootstrap:

```powershell
pip install django-bootstrap5
```

Template:

```html
{% load bootstrap5 %}
<!doctype html>
<html>
  <head>
    {% bootstrap_css %}
  </head>
  <body>
    <form method='post' class='form'>
      {% csrf_token %}
      {% bootstrap_form form %}
      <button type='submit' class='btn btn-primary'>Submit</button>
    </form>
    {% bootstrap_javascript %}
  </body>
</html>
```

## Template Inheritance for DRY Styling

Base template (`base.html`):

```html
<!doctype html>
<html>
  <head>
    <link href='{% static "css/style.css" %}' rel='stylesheet'>
  </head>
  <body>
    <header class='bg-blue-600 text-white p-4'>
      <h1>My Site</h1>
    </header>
    <main class='container mx-auto p-4'>
      {% block content %}{% endblock %}
    </main>
    <footer class='bg-gray-800 text-white p-4 mt-8'>
      &copy; 2026
    </footer>
  </body>
</html>
```

Child template:

```html
{% extends 'base.html' %}

{% block content %}
  <h2 class='text-2xl font-bold'>Page Title</h2>
  <p class='text-gray-600'>Content here</p>
{% endblock %}
```
