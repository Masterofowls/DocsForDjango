---
id: transactions-and-multi-db
slug: /transactions-and-multi-db
sidebar_position: 7
description: "Atomic transactions, savepoints, multiple database routing, and read replicas."
---

# Transactions and Multiple Databases

## Overview

Database transactions guarantee that a group of operations either all succeed or all fail together,
preventing corrupted data in the event of errors. Django also supports multiple databases — primary
and replicas, sharded databases, or separate databases per concern. This guide covers both topics
with practical examples.

---

## 1. Understanding Transactions

A **transaction** is a unit of work that is atomic — either the whole thing commits to the
database or nothing does.

By default, Django runs in **autocommit mode**: every SQL statement is committed immediately.

```
Without transaction:
  INSERT order → committed
  INSERT line_item → error
  Result: orphaned order record ← data corruption

With transaction:
  INSERT order    ─┐
  INSERT line_item ─┤ both commit or both roll back
  No error: ──── commit
  Error: ──────── rollback → clean state
```

---

## 2. `atomic()` — The Core Tool

### As a decorator

```python
from django.db import transaction

@transaction.atomic
def place_order(user, cart):
    order = Order.objects.create(user=user, status='pending')
    for item in cart.items.all():
        OrderLine.objects.create(
            order=order,
            product=item.product,
            quantity=item.quantity,
            price=item.product.price,
        )
    cart.clear()
    return order
```

### As a context manager

```python
from django.db import transaction

def transfer_funds(from_account, to_account, amount):
    with transaction.atomic():
        from_account.balance -= amount
        from_account.save()

        to_account.balance += amount
        to_account.save()
    # commit happens when the `with` block exits cleanly
    # rollback happens if any exception is raised inside
```

### Nesting `atomic()` — savepoints

Nested `atomic()` blocks create **savepoints**. An inner rollback only undoes the inner block.

```python
def create_order_with_notifications(user, cart):
    with transaction.atomic():        # outer transaction
        order = Order.objects.create(user=user)

        for item in cart.items.all():
            OrderLine.objects.create(order=order, product=item.product)

        try:
            with transaction.atomic():    # inner savepoint
                Notification.objects.create(user=user, message='Order created')
        except Exception:
            # Inner block rolled back — notification not saved
            # Outer block continues — order IS saved
            pass

    return order
```

---

## 3. on_commit Hooks

Code that must run *after* the transaction commits (e.g., sending emails, triggering async tasks):

```python
from django.db import transaction

def place_order(user, cart):
    with transaction.atomic():
        order = Order.objects.create(user=user)
        # Register callback — runs only after commit
        transaction.on_commit(lambda: send_order_confirmation.delay(order.id))
        transaction.on_commit(lambda: update_inventory.delay(order.id))
    # Both tasks triggered here after the transaction commits
```

Without `on_commit`, a Celery task might read the order before it's visible (race condition).

---

## 4. select_for_update — Pessimistic Locking

Lock rows during a transaction to prevent concurrent modification:

```python
from django.db import transaction

def withdraw(account_id, amount):
    with transaction.atomic():
        # Lock this row until transaction ends
        account = Account.objects.select_for_update().get(pk=account_id)
        if account.balance < amount:
            raise ValueError('Insufficient funds')
        account.balance -= amount
        account.save()
```

Options:

```python
# NOWAIT — raises DatabaseError immediately if row is locked
Account.objects.select_for_update(nowait=True).get(pk=account_id)

# SKIP LOCKED — skip rows that are locked (for job queues)
jobs = Job.objects.select_for_update(skip_locked=True).filter(status='pending')[:10]

# Lock related rows too (PostgreSQL)
Account.objects.select_for_update(of=['self', 'profile']).select_related('profile')
```

---

## 5. Handling Transaction Errors

```python
from django.db import transaction, IntegrityError, OperationalError

def safe_create_post(data):
    try:
        with transaction.atomic():
            post = Post.objects.create(**data)
            return post, None
    except IntegrityError as e:
        return None, f'Duplicate entry: {e}'
    except Exception as e:
        return None, f'Unexpected error: {e}'
```

If an exception propagates out of `atomic()`, the whole transaction rolls back. Always handle
exceptions **outside** the `with` block if you want to recover gracefully.

---

## 6. Multiple Databases — Configuration

```python
# config/settings/base.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'primary_db',
        'USER': 'app',
        'PASSWORD': 'secret',
        'HOST': 'primary.db.example.com',
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'replica_db',
        'USER': 'app_readonly',
        'PASSWORD': 'secret',
        'HOST': 'replica.db.example.com',
    },
    'analytics': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'analytics_db',
        'USER': 'analytics',
        'PASSWORD': 'secret',
        'HOST': 'analytics.db.example.com',
    },
}
```

---

## 7. Database Routers

A router decides which database to use for each operation.

### Primary/Replica router

```python
# config/db_router.py
class PrimaryReplicaRouter:
    """
    Route all read queries to 'replica', all writes to 'default'.
    """

    def db_for_read(self, model, **hints):
        return 'replica'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        # Allow relations within the same database group
        db_set = {'default', 'replica'}
        if obj1._state.db in db_set and obj2._state.db in db_set:
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Only migrate the default (primary) database
        return db == 'default'
```

```python
# settings.py
DATABASE_ROUTERS = ['config.db_router.PrimaryReplicaRouter']
```

### App-based router (separate DB per app)

```python
class AnalyticsRouter:
    """Route analytics app to analytics database."""
    route_app_labels = {'analytics'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'analytics'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'analytics'
        return None

    def allow_migrate(self, db, app_label, **hints):
        if app_label in self.route_app_labels:
            return db == 'analytics'
        return db == 'default'
```

---

## 8. Manually Specifying the Database

Override the router per-query with `using()`:

```python
# Read from replica explicitly
posts = Post.objects.using('replica').filter(status='published')

# Write to analytics DB
PageView.objects.using('analytics').create(url=request.path, user=request.user)

# Migrate a specific database
python manage.py migrate --database=analytics

# Run in shell on a specific database
Post.objects.using('replica').count()
```

---

## 9. Transactions Across Multiple Databases

Django does **not** support cross-database transactions. Each database is isolated.

```python
# Each atomic() only covers one database
with transaction.atomic(using='default'):
    order = Order.objects.using('default').create(...)

with transaction.atomic(using='analytics'):
    OrderEvent.objects.using('analytics').create(order_id=order.id)
```

---

## 10. Running Migrations on All Databases

```powershell
# Migrate all databases
python manage.py migrate
python manage.py migrate --database=analytics

# Create specific migration for analytics app
python manage.py makemigrations analytics
python manage.py migrate analytics --database=analytics

# Show migration status for a database
python manage.py showmigrations --database=replica
```

---

## 11. Testing with Transactions

### TestCase vs TransactionTestCase

| Class | Behaviour | Speed |
|---|---|---|
| `TestCase` | Wraps each test in a transaction, rolls back after | Fast |
| `TransactionTestCase` | Flushes DB after each test | Slow |

Use `TransactionTestCase` when testing code that relies on `on_commit()`:

```python
from django.test import TransactionTestCase

class OrderTest(TransactionTestCase):
    def test_on_commit_hook_fires(self):
        with self.assertRaises(None):
            with transaction.atomic():
                order = Order.objects.create(user=self.user)
                transaction.on_commit(lambda: print('committed'))
```

Or use the `mixin` approach with `TestCase` and `capture_on_commit_callbacks`:

```python
from django.test import TestCase
from django.db import transaction

class OrderTest(TestCase):
    def test_celery_task_triggered(self):
        with self.captureOnCommitCallbacks(execute=True):
            place_order(user=self.user, cart=self.cart)
        # Celery tasks fired synchronously — assert side effects here
```

---

## Quick Reference

| Task | Code |
|---|---|
| Atomic transaction | `with transaction.atomic():` |
| After-commit hook | `transaction.on_commit(callback)` |
| Lock row | `Model.objects.select_for_update().get(pk=1)` |
| Use specific DB | `Model.objects.using('replica').all()` |
| Route reads to replica | Implement `PrimaryReplicaRouter.db_for_read` |
| Migrate specific DB | `python manage.py migrate --database=analytics` |
| Test on_commit | `with self.captureOnCommitCallbacks(execute=True):` |
