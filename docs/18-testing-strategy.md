# Testing Strategy

## Definition

Testing validates behavior and prevents regressions.

## Test Layers

- unit tests
- integration tests
- API tests
- end-to-end tests

## Django Test Syntax

```python
from django.test import TestCase
from django.urls import reverse


class HealthTests(TestCase):
  def test_health_endpoint(self):
    response = self.client.get(reverse('health'))
    self.assertEqual(response.status_code, 200)
```

## Pytest Syntax

```python
import pytest


@pytest.mark.django_db
def test_post_creation(post_factory):
  post = post_factory(title='Hello')
  assert post.title == 'Hello'
```

## Recommendations

- test business logic directly
- mock external services
- keep fixtures minimal
- run tests in CI on every pull request
