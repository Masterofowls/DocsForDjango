---
id: forms-and-validation
slug: /forms-and-validation
sidebar_position: 11
description: "Django forms, ModelForms, validation, widgets, formsets, and file uploads."
---

# Forms and Validation

## Overview

Django forms handle the full lifecycle: rendering HTML inputs, parsing submitted data, running
validation, and saving to the database. They are the safest way to accept user input because they
automatically escape output and provide CSRF protection.

---

## 1. Creating a Form

```python
# blog/forms.py
from django import forms
from django.core.exceptions import ValidationError


class ContactForm(forms.Form):
    name = forms.CharField(
        max_length=100,
        label='Your Name',
        widget=forms.TextInput(attrs={'placeholder': 'Jane Smith'}),
    )
    email = forms.EmailField(label='Email Address')
    subject = forms.CharField(max_length=200)
    message = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 5}),
        min_length=20,
    )
    # Choices field
    category = forms.ChoiceField(choices=[
        ('', 'Select a category'),
        ('support', 'Support'),
        ('billing', 'Billing'),
        ('feedback', 'Feedback'),
    ])
    newsletter = forms.BooleanField(required=False)
```

---

## 2. Handling Forms in Views

```python
# blog/views.py
from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import ContactForm


def contact(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            # Cleaned data is available as typed Python values
            name = form.cleaned_data['name']
            email = form.cleaned_data['email']
            message_text = form.cleaned_data['message']
            # send email, save to DB, etc.
            messages.success(request, 'Message sent!')
            return redirect('contact-success')
    else:
        form = ContactForm()              # GET — blank form

    return render(request, 'contact.html', {'form': form})
```

---

## 3. Rendering Forms in Templates

### Manual rendering (recommended for control)

```html
<form method="post" novalidate>
  {% csrf_token %}

  {% for field in form %}
    <div class="form-group {% if field.errors %}has-error{% endif %}">
      <label for="{{ field.id_for_label }}">{{ field.label }}</label>
      {{ field }}
      {% if field.help_text %}
        <small class="help-text">{{ field.help_text }}</small>
      {% endif %}
      {% for error in field.errors %}
        <span class="error">{{ error }}</span>
      {% endfor %}
    </div>
  {% endfor %}

  {% if form.non_field_errors %}
    <div class="alert alert-error">
      {% for error in form.non_field_errors %}
        <p>{{ error }}</p>
      {% endfor %}
    </div>
  {% endif %}

  <button type="submit">Send</button>
</form>
```

### Quick render options

```html
{{ form.as_p }}      ← wrap each field in <p>
{{ form.as_ul }}     ← wrap in <li>
{{ form.as_table }}  ← wrap in <tr>
{{ form.as_div }}    ← wrap in <div> (Django 4.1+)
```

---

## 4. Custom Validation

### Field-level validation

```python
class ContactForm(forms.Form):
    email = forms.EmailField()
    confirm_email = forms.EmailField()

    def clean_email(self):
        """clean_<fieldname> runs after the field's own validation."""
        email = self.cleaned_data['email']
        if email.endswith('@example.com'):
            raise ValidationError('Example email addresses are not allowed.')
        return email.lower()   # return the cleaned value
```

### Cross-field (form-level) validation

```python
    def clean(self):
        """clean() runs after all field-level clean methods."""
        cleaned_data = super().clean()
        email = cleaned_data.get('email')
        confirm_email = cleaned_data.get('confirm_email')

        if email and confirm_email and email != confirm_email:
            raise ValidationError('Email addresses do not match.')

        return cleaned_data
```

### Using validators

```python
from django.core.validators import RegexValidator, MinLengthValidator

phone_validator = RegexValidator(
    r'^\+?\d{7,15}$',
    'Enter a valid phone number.'
)

class ProfileForm(forms.Form):
    phone = forms.CharField(validators=[phone_validator])
    bio = forms.CharField(validators=[MinLengthValidator(50)])
```

---

## 5. ModelForms

ModelForms generate form fields from a model definition, removing duplication.

```python
# blog/models.py
class Post(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    body = models.TextField()
    status = models.CharField(
        max_length=10,
        choices=[('draft', 'Draft'), ('published', 'Published')],
        default='draft',
    )
    created_at = models.DateTimeField(auto_now_add=True)
```

```python
# blog/forms.py
from django import forms
from .models import Post


class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['title', 'body', 'status']   # whitelist
        # or: exclude = ['slug', 'created_at']  # blacklist

        widgets = {
            'body': forms.Textarea(attrs={'rows': 10, 'class': 'rich-editor'}),
            'status': forms.RadioSelect(),
        }
        labels = {
            'body': 'Post Content',
        }
        help_texts = {
            'slug': 'Auto-generated from title. Change if needed.',
        }
        error_messages = {
            'title': {
                'max_length': 'Title too long — max 200 characters.',
            }
        }
```

### Saving a ModelForm

```python
def post_create(request):
    if request.method == 'POST':
        form = PostForm(request.POST)
        if form.is_valid():
            post = form.save(commit=False)   # don't save to DB yet
            post.author = request.user       # add extra fields
            post.slug = slugify(post.title)
            post.save()
            form.save_m2m()                  # save M2M if any (after commit=False)
            return redirect('blog:post-list')
    else:
        form = PostForm()
    return render(request, 'blog/post_form.html', {'form': form})
```

---

## 6. Widgets

Widgets control the HTML rendering of a field.

```python
from django import forms

class EventForm(forms.Form):
    name = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )
    description = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 4, 'class': 'form-control'})
    )
    date = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'})
    )
    time = forms.TimeField(
        widget=forms.TimeInput(attrs={'type': 'time'})
    )
    category = forms.ChoiceField(
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    tags = forms.MultipleChoiceField(
        widget=forms.CheckboxSelectMultiple()
    )
    color = forms.CharField(
        widget=forms.TextInput(attrs={'type': 'color'})
    )
    is_public = forms.BooleanField(
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )
    hidden_token = forms.CharField(
        widget=forms.HiddenInput()
    )
```

---

## 7. File Upload Forms

```python
class AvatarForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['avatar']
        widgets = {
            'avatar': forms.FileInput(attrs={'accept': 'image/*'})
        }

    def clean_avatar(self):
        avatar = self.cleaned_data.get('avatar')
        if avatar:
            # Limit to 2 MB
            if avatar.size > 2 * 1024 * 1024:
                raise forms.ValidationError('Image must be smaller than 2 MB.')
            if not avatar.content_type.startswith('image/'):
                raise forms.ValidationError('File must be an image.')
        return avatar
```

Template — **must** add `enctype`:

```html
<form method="post" enctype="multipart/form-data">
  {% csrf_token %}
  {{ form.as_p }}
  <button type="submit">Upload</button>
</form>
```

View — **must** pass `request.FILES`:

```python
def avatar_upload(request):
    if request.method == 'POST':
        form = AvatarForm(request.POST, request.FILES, instance=request.user.profile)
        if form.is_valid():
            form.save()
            return redirect('profile')
    else:
        form = AvatarForm(instance=request.user.profile)
    return render(request, 'accounts/avatar.html', {'form': form})
```

---

## 8. Formsets

Formsets let you edit multiple forms of the same type on one page.

```python
from django.forms import formset_factory, modelformset_factory

# Plain formset
ImageFormSet = formset_factory(ImageForm, extra=3)

# Model formset — edit all existing rows + add new ones
PostFormSet = modelformset_factory(Post, fields=['title', 'status'], extra=1)


def manage_posts(request):
    if request.method == 'POST':
        formset = PostFormSet(request.POST)
        if formset.is_valid():
            formset.save()
            return redirect('blog:post-list')
    else:
        formset = PostFormSet(queryset=Post.objects.filter(author=request.user))
    return render(request, 'blog/manage_posts.html', {'formset': formset})
```

```html
<!-- Formset template -->
<form method="post">
  {% csrf_token %}
  {{ formset.management_form }}   ← required
  {% for form in formset %}
    {{ form.as_p }}
  {% endfor %}
  <button type="submit">Save All</button>
</form>
```

---

## Quick Reference

| Task | Code |
|---|---|
| Create form | `class F(forms.Form): field = forms.CharField()` |
| Model form | `class F(forms.ModelForm): class Meta: model=M; fields=[...]` |
| Check valid | `form.is_valid()` |
| Read value | `form.cleaned_data['field']` |
| Save model | `form.save()` / `form.save(commit=False)` |
| Field validator | `forms.CharField(validators=[my_validator])` |
| Field-level clean | `def clean_fieldname(self): ... return value` |
| Form-level clean | `def clean(self): ... return cleaned_data` |
| File upload | Add `enctype="multipart/form-data"` + `request.FILES` |
| Multiple forms | `formset_factory(Form, extra=2)` |
