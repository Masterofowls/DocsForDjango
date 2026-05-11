---
id: styling-with-tailwind-and-css
slug: /styling-with-tailwind-and-css
sidebar_position: 13
description: "Integrate Tailwind CSS with Django, manage static CSS, use django-compressor, and configure PostCSS."
---

# Styling with Tailwind and CSS

## Overview

Django does not prescribe a CSS approach — you can use plain CSS, SASS/SCSS, or Tailwind CSS. This
guide covers the most common integration patterns: Tailwind CLI (no Node in production), full
Node-based builds, and django-compressor for SCSS pipelines.

---

## 1. Option A — Tailwind CLI (Simplest, No Node Required in Prod)

The standalone Tailwind CLI binary requires no npm. It watches your templates and generates
a single optimised CSS file.

### Step 1 — Download Tailwind CLI binary

```powershell
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-windows-x64.exe" -OutFile "tailwindcss.exe"
```

```bash
# macOS
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-x64
chmod +x tailwindcss-macos-x64
mv tailwindcss-macos-x64 tailwindcss
```

### Step 2 — Create input CSS

```css
/* static/src/input.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 3 — Configure content paths

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.html',
    './**/templates/**/*.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 4 — Build CSS

```powershell
# One-time build
.\tailwindcss.exe -i ./static/src/input.css -o ./static/css/main.css

# Watch mode (development)
.\tailwindcss.exe -i ./static/src/input.css -o ./static/css/main.css --watch

# Minify for production
.\tailwindcss.exe -i ./static/src/input.css -o ./static/css/main.css --minify
```

### Step 5 — Include in base template

```html
{% load static %}
<link rel="stylesheet" href="{% static 'css/main.css' %}">
```

---

## 2. Option B — Tailwind via django-tailwind

`django-tailwind` wraps the npm-based Tailwind workflow inside Django management commands.

### Installation

```powershell
pip install django-tailwind
```

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'tailwind',
    'theme',         # your theme app (created below)
]
TAILWIND_APP_NAME = 'theme'
INTERNAL_IPS = ['127.0.0.1']
```

### Initialise and install

```powershell
python manage.py tailwind init     # creates 'theme' app with Tailwind setup
python manage.py tailwind install  # runs npm install in theme/static_src/
```

### Run in development

```powershell
python manage.py tailwind start    # watches for changes and rebuilds CSS
```

### Build for production

```powershell
python manage.py tailwind build    # minified production CSS
python manage.py collectstatic --noinput
```

### Include in base template

```html
{% load static tailwind_tags %}
{% tailwind_css %}                {# renders the correct <link> tag #}
```

---

## 3. Option C — Manual npm Build (Full Control)

For projects already using JavaScript bundlers (Vite, webpack):

### Directory structure

```
myproject/
  frontend/
    package.json
    tailwind.config.js
    postcss.config.js
    src/
      css/
        main.css
  static/
    css/
      main.css    ← generated output
```

### Setup

```powershell
cd frontend
npm init -y
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p   # creates tailwind.config.js and postcss.config.js
```

```json
// frontend/package.json scripts section
{
  "scripts": {
    "dev": "tailwindcss -i ./src/css/main.css -o ../static/css/main.css --watch",
    "build": "tailwindcss -i ./src/css/main.css -o ../static/css/main.css --minify"
  }
}
```

```powershell
npm run dev      # development with watch
npm run build    # production
```

---

## 4. Custom CSS with Django Static Files

For projects using plain CSS or SCSS without Tailwind:

```python
# settings.py
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

### Organise static files

```
static/
  css/
    main.css
    components/
      cards.css
      forms.css
  js/
    main.js
  img/
    logo.png
```

### Reference in templates

```html
{% load static %}
<link rel="stylesheet" href="{% static 'css/main.css' %}">
<link rel="stylesheet" href="{% static 'css/components/cards.css' %}">
```

---

## 5. SCSS with django-compressor

`django-compressor` compiles SCSS and concatenates/minifies CSS/JS on-the-fly.

### Installation

```powershell
pip install django-compressor
```

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'compressor',
]

STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'compressor.finders.CompressorFinder',
]

COMPRESS_ENABLED = not DEBUG    # compress in production only
COMPRESS_PRECOMPILERS = (
    ('text/x-scss', 'django_libsass.SassCompiler'),
)
```

```powershell
pip install django-libsass libsass
```

### SCSS in templates

```html
{% load compress %}

{% compress css %}
<link rel="stylesheet" type="text/x-scss" href="{% static 'scss/main.scss' %}">
{% endcompress %}

{% compress js %}
<script src="{% static 'js/utils.js' %}"></script>
<script src="{% static 'js/app.js' %}"></script>
{% endcompress %}
```

---

## 6. Component-Style CSS with Tailwind

### Extracting components with `@apply`

```css
/* static/src/input.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom component classes */
@layer components {
  .btn {
    @apply inline-flex items-center px-4 py-2 rounded font-medium transition-colors;
  }
  .btn-primary {
    @apply btn bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400;
  }
  .btn-danger {
    @apply btn bg-red-600 text-white hover:bg-red-700;
  }
  .card {
    @apply bg-white rounded-lg shadow p-6;
  }
  .form-input {
    @apply block w-full rounded border-gray-300 shadow-sm focus:border-blue-500;
  }
}
```

### Use in templates

```html
<button class="btn-primary">Save Post</button>
<a href="{% url 'post-list' %}" class="btn">Cancel</a>
<div class="card">
  <h2 class="text-xl font-bold mb-2">{{ post.title }}</h2>
  <p class="text-gray-600">{{ post.excerpt }}</p>
</div>
```

---

## 7. Production Build Checklist

```powershell
# 1. Build CSS (minified)
npm run build          # or: python manage.py tailwind build

# 2. Collect all static files
python manage.py collectstatic --noinput

# 3. Verify STATIC_ROOT has your files
Get-ChildItem .\staticfiles\css\

# 4. In production settings.py
DEBUG = False
STATIC_ROOT = BASE_DIR / 'staticfiles'

# 5. Web server (Nginx) or WhiteNoise serves from STATIC_ROOT
```

### settings.py production flag

```python
# settings/production.py
DEBUG = False
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
# WhiteNoise serves compressed files with content-hash filenames (cache-busting)
```

---

## 8. Hot Reload in Development

Run Django dev server alongside Tailwind watch:

```powershell
# Terminal 1 — Django
python manage.py runserver

# Terminal 2 — Tailwind watch
.\tailwindcss.exe -i ./static/src/input.css -o ./static/css/main.css --watch
# or:
python manage.py tailwind start
```

Add `django-browser-sync` or use browser-sync for full hot reload:

```powershell
npm install -g browser-sync
browser-sync start --proxy "localhost:8000" --files "templates/**/*.html,static/**/*.css"
```

---

## Quick Reference

| Task | Command / Code |
|---|---|
| Tailwind CLI build | `./tailwindcss -i src.css -o out.css --minify` |
| Tailwind watch | `./tailwindcss -i src.css -o out.css --watch` |
| django-tailwind install | `python manage.py tailwind install` |
| django-tailwind dev | `python manage.py tailwind start` |
| django-tailwind build | `python manage.py tailwind build` |
| Collect static | `python manage.py collectstatic --noinput` |
| Load static tag | `{% load static %}` |
| Static URL | `{% static 'css/main.css' %}` |
| Tailwind component | `@layer components { .btn { @apply ... } }` |
| SCSS compressor | `{% compress css %} ... {% endcompress %}` |
