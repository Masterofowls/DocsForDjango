# Uploading and Media Files

## Definition

Media files are user-uploaded content (images, documents, videos) stored
outside the static assets directory with secure access controls.

## Settings Configuration

```python
import os

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

## Model with FileField

```python
from django.db import models


class Document(models.Model):
  title = models.CharField(max_length=200)
  file = models.FileField(upload_to='documents/%Y/%m/%d/')
  uploaded_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return self.title
```

## Form with File Upload

```python
from django import forms


class DocumentForm(forms.ModelForm):
  class Meta:
    model = Document
    fields = ['title', 'file']
```

## View with File Upload

```python
from django.shortcuts import render
from .forms import DocumentForm


def upload_document(request):
  if request.method == 'POST':
    form = DocumentForm(request.POST, request.FILES)
    if form.is_valid():
      form.save()
      return redirect('document_list')
  else:
    form = DocumentForm()
  return render(request, 'upload.html', {'form': form})
```

## Template Rendering

```html
<form method='post' enctype='multipart/form-data'>
  {% csrf_token %}
  {{ form.as_p }}
  <button type='submit'>Upload</button>
</form>
```

## Serve Media in Development

In `config/urls.py`:

```python
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
  # ...
]

if settings.DEBUG:
  urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## File Validation

```python
from django.core.exceptions import ValidationError


def validate_file_size(file):
  if file.size > 5 * 1024 * 1024:  # 5MB
    raise ValidationError('File must be under 5MB.')


class DocumentForm(forms.ModelForm):
  class Meta:
    model = Document
    fields = ['title', 'file']

  def clean_file(self):
    file = self.cleaned_data['file']
    validate_file_size(file)
    return file
```

## Production Considerations

- Use CDN (CloudFront, CloudFlare) for media delivery.
- Store in cloud storage (S3, GCS, Azure Blob).
- Scan uploads for malware.
- Restrict file types by extension and MIME type.
