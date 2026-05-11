# Forms and Validation

## Definition

Forms handle user input parsing, validation, and cleaned data output.

## Form Syntax

```python
from django import forms


class ContactForm(forms.Form):
  email = forms.EmailField()
  message = forms.CharField(widget=forms.Textarea)
```

## ModelForm Syntax

```python
from django.forms import ModelForm


class PostForm(ModelForm):
  class Meta:
    model = Post
    fields = ['title', 'slug', 'body']
```

## Custom Field Validation

```python
def clean_title(self):
  title = self.cleaned_data['title'].strip()
  if len(title) < 5:
    raise forms.ValidationError('Title must be at least 5 chars.')
  return title
```

## Cross-Field Validation

```python
def clean(self):
  cleaned = super().clean()
  start = cleaned.get('start_at')
  end = cleaned.get('end_at')
  if start and end and end < start:
    raise forms.ValidationError('end_at must be after start_at.')
  return cleaned
```
