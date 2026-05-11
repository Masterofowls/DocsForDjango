---
id: uploading-and-media-files
slug: /uploading-and-media-files
sidebar_position: 23
description: "File uploads, image handling, storage backends, and serving media in Django."
---

# Uploading and Media Files

## Overview

Django distinguishes between static files (CSS, JS, images bundled with your app) and media files
(user-uploaded content). This guide covers model configuration, upload views, image processing,
custom storage backends, cloud storage with S3, and security best practices.

---

## 1. Settings

```python
# settings.py
import os

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Development: serve media via Django
# Production: serve via nginx or cloud storage
```

```python
# config/urls.py (development only)
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    ...
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## 2. File and Image Fields in Models

```python
# blog/models.py
from django.db import models


def post_image_upload_path(instance, filename):
    """Organise uploads by author ID and year."""
    from pathlib import Path
    ext = Path(filename).suffix.lower()
    return f'posts/{instance.author_id}/{instance.created_at.year}/{instance.pk}{ext}'


class Post(models.Model):
    title = models.CharField(max_length=255)

    # FileField: accepts any file type
    attachment = models.FileField(
        upload_to='attachments/',
        blank=True,
        null=True,
    )

    # ImageField: validates file is an image (requires Pillow)
    cover_image = models.ImageField(
        upload_to=post_image_upload_path,
        blank=True,
        null=True,
    )
```

```powershell
pip install Pillow   # required for ImageField
python manage.py makemigrations && python manage.py migrate
```

---

## 3. Upload Views (Function-Based)

```python
# blog/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .forms import PostUploadForm
from .models import Post


@login_required
def upload_post(request):
    if request.method == 'POST':
        form = PostUploadForm(request.POST, request.FILES)  # FILES required!
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            return redirect('post_detail', pk=post.pk)
    else:
        form = PostUploadForm()
    return render(request, 'blog/upload.html', {'form': form})
```

```python
# blog/forms.py
from django import forms
from .models import Post

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class PostUploadForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['title', 'body', 'cover_image', 'attachment']

    def clean_cover_image(self):
        image = self.cleaned_data.get('cover_image')
        if image:
            if image.content_type not in ALLOWED_IMAGE_TYPES:
                raise forms.ValidationError('Only JPEG, PNG, WebP, and GIF are accepted.')
            if image.size > MAX_FILE_SIZE:
                raise forms.ValidationError('Image must be under 5 MB.')
        return image
```

```html
<!-- templates/blog/upload.html -->
<!-- enctype is REQUIRED for file uploads -->
<form method="post" enctype="multipart/form-data">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Upload</button>
</form>
```

---

## 4. Image Processing with Pillow

```python
# Resize and convert image on save
from PIL import Image as PILImage
import io
from django.core.files.base import ContentFile


def resize_image(image_field, max_width=1200, max_height=900, quality=85):
    """Resize and convert an ImageField to WebP format."""
    img = PILImage.open(image_field)
    img.thumbnail((max_width, max_height), PILImage.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format='WEBP', quality=quality, optimize=True)
    buffer.seek(0)

    filename = image_field.name.rsplit('.', 1)[0] + '.webp'
    return ContentFile(buffer.getvalue(), name=filename)


# In the model's save():
class Post(models.Model):
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.cover_image and not self.pk:  # new image
            self.cover_image = resize_image(self.cover_image)
        super().save(*args, **kwargs)
```

---

## 5. django-imagekit (Auto Thumbnails)

```powershell
pip install django-imagekit
```

```python
# settings.py
INSTALLED_APPS += ['imagekit']
```

```python
# models.py
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill, ResizeToFit


class Post(models.Model):
    cover_image = models.ImageField(upload_to='covers/')

    # Auto-generated thumbnail — created on first access
    thumbnail = ImageSpecField(
        source='cover_image',
        processors=[ResizeToFill(400, 300)],
        format='WEBP',
        options={'quality': 80},
    )

    # Responsive variant
    cover_medium = ImageSpecField(
        source='cover_image',
        processors=[ResizeToFit(800, 600)],
        format='WEBP',
        options={'quality': 85},
    )
```

```html
<!-- In template -->
<img src="{{ post.thumbnail.url }}" width="400" height="300" alt="{{ post.title }}" />
```

---

## 6. Cloud Storage with django-storages (S3)

```powershell
pip install django-storages boto3
```

```python
# settings.py (production)
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = env('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
AWS_S3_FILE_OVERWRITE = False      # keep unique names
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_DEFAULT_ACL = None             # use bucket default ACL
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
```

### Multiple storage backends

```python
# storages.py
from storages.backends.s3boto3 import S3Boto3Storage


class MediaStorage(S3Boto3Storage):
    location = 'media'
    default_acl = 'private'     # do not expose media publicly


class StaticStorage(S3Boto3Storage):
    location = 'static'
    default_acl = 'public-read'
```

```python
# settings.py
DEFAULT_FILE_STORAGE = 'config.storages.MediaStorage'
STATICFILES_STORAGE = 'config.storages.StaticStorage'
```

---

## 7. File Security

```python
# Serve private files through Django (not directly from filesystem/S3)
# api/views.py
import os
from django.http import FileResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required


@login_required
def serve_attachment(request, pk):
    from blog.models import Post
    post = Post.objects.get(pk=pk)

    # Authorise: only the author can download
    if post.author != request.user and not request.user.is_staff:
        return HttpResponseForbidden()

    file_path = post.attachment.path
    if not os.path.exists(file_path):
        from django.http import Http404
        raise Http404

    return FileResponse(open(file_path, 'rb'), as_attachment=True)
```

---

## Quick Reference

| Task | Code / Setting |
|---|---|
| Media URL/root | `MEDIA_URL = '/media/'`, `MEDIA_ROOT = BASE_DIR / 'media'` |
| Dev serving | `urlpatterns += static(MEDIA_URL, document_root=MEDIA_ROOT)` |
| File field | `models.FileField(upload_to='files/')` |
| Image field | `models.ImageField(upload_to='images/')` (requires Pillow) |
| Custom upload path | `upload_to=callable(instance, filename)` |
| Validation | `clean_field()` in form, check `content_type` and `size` |
| Image resize | `PIL.Image.open(field); img.thumbnail(...)` |
| Auto thumbnails | `django-imagekit` `ImageSpecField` |
| S3 storage | `pip install django-storages boto3` |
| Private download | Return `FileResponse(open(path, 'rb'), as_attachment=True)` |
