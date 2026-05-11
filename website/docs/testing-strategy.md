---
id: testing-strategy
slug: /testing-strategy
sidebar_position: 30
description: "Comprehensive Django testing: pytest, factories, API tests, coverage, and CI integration."
---

# Testing Strategy

## Overview

A solid test suite for a Django project combines unit tests (models, utils), integration tests
(views, forms, API endpoints), and end-to-end tests. This guide uses pytest-django as the test
runner with `factory_boy` for fixtures, `coverage` for tracking, and `faker` for realistic data.

---

## 1. Setup

```bash
pip install pytest pytest-django factory-boy faker coverage pytest-cov
```

```ini
# pytest.ini (project root)
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = tests.py test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts = --cov=. --cov-report=term-missing --cov-fail-under=80
```

```python
# config/settings/test.py
from .base import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',  # fast in-memory DB for tests
    }
}

PASSWORD_HASHERS = [
    # Faster hasher speeds up tests that create users
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
MEDIA_ROOT = '/tmp/test_media/'
CELERY_TASK_ALWAYS_EAGER = True   # run Celery tasks synchronously
```

---

## 2. Model Tests

```python
# blog/tests/test_models.py
import pytest
from django.utils.text import slugify


@pytest.mark.django_db
class TestPostModel:
    def test_slug_auto_generated(self, post_factory):
        post = post_factory(title='Hello World', slug='')
        assert post.slug == 'hello-world'

    def test_slug_uniqueness(self, post_factory):
        post_factory(title='Hello World', slug='hello-world')
        second = post_factory(title='Hello World')
        # Slug must be unique — auto suffix expected
        assert second.slug != 'hello-world'

    def test_string_representation(self, post_factory):
        post = post_factory(title='My Post')
        assert str(post) == 'My Post'

    def test_published_manager_excludes_draft(self, post_factory):
        from blog.models import Post
        post_factory(status=Post.PUBLISHED)
        post_factory(status=Post.DRAFT)
        assert Post.published.count() == 1

    def test_absolute_url(self, post_factory):
        post = post_factory(slug='my-post')
        assert post.get_absolute_url() == f'/blog/my-post/'
```

---

## 3. Factories with factory_boy

```python
# blog/tests/factories.py
import factory
from factory.django import DjangoModelFactory
from factory import Faker, SubFactory, LazyFunction
from django.contrib.auth import get_user_model
from blog.models import Category, Post, Comment

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = Faker('user_name')
    email = Faker('email')
    password = factory.PostGenerationMethodCall('set_password', 'testpassword123')
    is_active = True


class CategoryFactory(DjangoModelFactory):
    class Meta:
        model = Category

    name = Faker('word')
    slug = factory.LazyAttribute(lambda o: o.name.lower().replace(' ', '-'))


class PostFactory(DjangoModelFactory):
    class Meta:
        model = Post

    title = Faker('sentence', nb_words=6)
    slug = factory.LazyAttribute(lambda o: o.title.lower().replace(' ', '-')[:50])
    author = SubFactory(UserFactory)
    category = SubFactory(CategoryFactory)
    body = Faker('paragraphs', nb=3, variable_nb_sentences=True)
    status = Post.PUBLISHED

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.tags.set(extracted)


class CommentFactory(DjangoModelFactory):
    class Meta:
        model = Comment

    post = SubFactory(PostFactory)
    author = SubFactory(UserFactory)
    body = Faker('paragraph')
```

```python
# conftest.py
import pytest
from blog.tests.factories import UserFactory, PostFactory, CategoryFactory, CommentFactory


@pytest.fixture
def user_factory(db):
    return UserFactory

@pytest.fixture
def post_factory(db):
    return PostFactory

@pytest.fixture
def admin_user(db):
    return UserFactory(is_staff=True, is_superuser=True)

@pytest.fixture
def authenticated_client(client, db):
    user = UserFactory()
    client.force_login(user)
    return client, user
```

---

## 4. View Tests

```python
# blog/tests/test_views.py
import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestPostListView:
    def test_renders_published_posts(self, client, post_factory):
        posts = post_factory.create_batch(3)
        response = client.get(reverse('blog:post_list'))
        assert response.status_code == 200
        for post in posts:
            assert post.title.encode() in response.content

    def test_search_filters_results(self, client, post_factory):
        post_factory(title='Django Testing Guide')
        post_factory(title='Python Async Tutorial')
        response = client.get(reverse('blog:post_list') + '?q=Django')
        assert b'Django Testing Guide' in response.content
        assert b'Python Async Tutorial' not in response.content


@pytest.mark.django_db
class TestPostCreateView:
    def test_unauthenticated_redirects(self, client):
        response = client.get(reverse('blog:post_create'))
        assert response.status_code == 302
        assert '/login/' in response['Location']

    def test_authenticated_user_can_create(self, authenticated_client, category_factory):
        client, user = authenticated_client
        category = category_factory()
        data = {
            'title': 'My New Post',
            'body': 'Content here',
            'category': category.pk,
            'status': 'draft',
        }
        response = client.post(reverse('blog:post_create'), data)
        assert response.status_code == 302
        from blog.models import Post
        assert Post.objects.filter(title='My New Post').exists()
```

---

## 5. API Tests

```python
# api/tests/test_api.py
import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_api_client(db):
    from blog.tests.factories import UserFactory
    client = APIClient()
    user = UserFactory()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
class TestPostAPIView:
    def test_list_returns_published_only(self, api_client, post_factory):
        from blog.models import Post
        post_factory(status=Post.PUBLISHED)
        post_factory(status=Post.DRAFT)
        response = api_client.get(reverse('api:post-list'))
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_requires_authentication_for_create(self, api_client):
        response = api_client.post(reverse('api:post-list'), {'title': 'Test'})
        assert response.status_code == 401

    def test_authenticated_user_creates_post(self, authenticated_api_client, category_factory):
        client, user = authenticated_api_client
        category = category_factory()
        payload = {
            'title': 'API Post',
            'body': 'Content',
            'category': category.pk,
        }
        response = client.post(reverse('api:post-list'), payload, format='json')
        assert response.status_code == 201
        assert response.data['title'] == 'API Post'

    def test_user_cannot_update_others_post(self, authenticated_api_client, post_factory):
        client, user = authenticated_api_client
        other_post = post_factory()   # owned by a different user
        response = client.patch(
            reverse('api:post-detail', args=[other_post.pk]),
            {'title': 'Hacked'},
        )
        assert response.status_code == 403
```

---

## 6. Form Tests

```python
# blog/tests/test_forms.py
import pytest
from blog.forms import PostForm


@pytest.mark.django_db
class TestPostForm:
    def test_valid_form(self, category_factory):
        category = category_factory()
        data = {
            'title': 'Valid Post Title',
            'body': 'Some content that meets minimum length.',
            'category': category.pk,
        }
        form = PostForm(data=data)
        assert form.is_valid(), form.errors

    def test_title_required(self):
        form = PostForm(data={'title': '', 'body': 'Content', 'category': 1})
        assert not form.is_valid()
        assert 'title' in form.errors

    def test_body_minimum_length(self, category_factory):
        form = PostForm(data={'title': 'Title', 'body': 'Hi', 'category': category_factory().pk})
        assert not form.is_valid()
        assert 'body' in form.errors
```

---

## 7. Coverage and CI

```bash
# Run all tests with coverage
pytest

# HTML report
pytest --cov=. --cov-report=html
open htmlcov/index.html

# Specific app only
pytest blog/ --cov=blog
```

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements/development.txt
      - run: pytest --cov=. --cov-report=xml
      - uses: codecov/codecov-action@v4
        with:
          files: coverage.xml
```

---

## Quick Reference

| Concept | Tool / Pattern |
|---|---|
| Test runner | `pytest` with `pytest-django` |
| Test database | SQLite `:memory:` in `settings/test.py` |
| Fixtures | `factory_boy` with `DjangoModelFactory` |
| Realistic data | `Faker` within factory field definitions |
| View test | `client.get(reverse(...))`, check status + content |
| API test | `APIClient`, `force_authenticate(user=user)` |
| Auth in views | `client.force_login(user)` |
| Coverage threshold | `--cov-fail-under=80` in `pytest.ini` |
| Run only failing | `pytest --lf` (last failed) |
| Verbose output | `pytest -v -s` |
