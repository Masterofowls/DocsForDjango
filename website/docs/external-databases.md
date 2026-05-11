---
id: external-databases
slug: /external-databases
sidebar_position: 8
description: "Connect Django to PostgreSQL, MySQL, SQLite, and cloud databases with full configuration examples."
---

# External Databases

## Overview

Django supports multiple database backends out of the box: SQLite (default), PostgreSQL, MySQL/
MariaDB, and Oracle. For production, PostgreSQL is the most popular choice. This guide covers
installation, connection configuration, `dj-database-url`, cloud databases, and connection pooling.

---

## 1. SQLite (Default — Development)

SQLite requires zero setup. Django creates the file automatically.

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### When to use SQLite

✅ Local development  
✅ Automated tests (fast, in-memory option)  
✅ Small single-user apps  
❌ Not suitable for production with concurrent writes  

### In-memory SQLite for tests

```python
# config/settings/test.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
```

---

## 2. PostgreSQL

### Step 1 — Install PostgreSQL

```powershell
# Windows — download from https://www.postgresql.org/download/windows/
# Or with Scoop:
scoop install postgresql

# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2 — Create database and user

```sql
-- In psql shell
CREATE DATABASE myproject;
CREATE USER myproject_user WITH PASSWORD 'strongpassword';
ALTER ROLE myproject_user SET client_encoding TO 'utf8';
ALTER ROLE myproject_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE myproject_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE myproject TO myproject_user;
\q
```

### Step 3 — Install psycopg2

```powershell
# psycopg2-binary (pre-compiled — easier for dev)
pip install psycopg2-binary

# psycopg2 (source — required for production)
pip install psycopg2

# psycopg3 (async-native, recommended for new projects)
pip install psycopg[binary]
```

### Step 4 — Configure settings

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myproject',
        'USER': 'myproject_user',
        'PASSWORD': 'strongpassword',
        'HOST': 'localhost',
        'PORT': '5432',
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',   # 30s query timeout
        },
        'CONN_MAX_AGE': 60,    # persist connections for 60 seconds
    }
}
```

### Step 5 — Run initial migration

```powershell
python manage.py migrate
```

---

## 3. MySQL / MariaDB

### Step 1 — Install

```powershell
# Windows — MySQL Installer: https://dev.mysql.com/downloads/installer/
# macOS
brew install mysql
brew services start mysql

# Ubuntu
sudo apt-get install mysql-server
```

### Step 2 — Create database

```sql
CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myproject_user'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT ALL PRIVILEGES ON myproject.* TO 'myproject_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3 — Install connector

```powershell
pip install mysqlclient

# If mysqlclient fails to compile on Windows:
pip install PyMySQL
```

### Step 4 — Configure

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'myproject',
        'USER': 'myproject_user',
        'PASSWORD': 'strongpassword',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
        'CONN_MAX_AGE': 60,
    }
}
```

For PyMySQL (pure Python fallback):

```python
# settings.py or manage.py — add before Django setup
import pymysql
pymysql.install_as_MySQLdb()
```

---

## 4. dj-database-url — URL-based Config

`dj-database-url` parses a DATABASE_URL environment variable into the `DATABASES` dict.
Essential for 12-factor app deployments (Heroku, Railway, Fly.io, Render).

```powershell
pip install dj-database-url
```

```python
# settings.py
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600,
        conn_health_checks=True,
    )
}
```

```bash
# .env
DATABASE_URL=postgres://myproject_user:strongpassword@localhost:5432/myproject
DATABASE_URL=mysql://user:pass@localhost/myproject
DATABASE_URL=sqlite:///db.sqlite3
```

### URL formats

```
PostgreSQL:   postgres://USER:PASSWORD@HOST:PORT/DATABASE
MySQL:        mysql://USER:PASSWORD@HOST:PORT/DATABASE
SQLite file:  sqlite:///path/to/db.sqlite3
SQLite memory: sqlite://:memory:
```

---

## 5. Cloud Database Services

### AWS RDS (PostgreSQL)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['RDS_DB_NAME'],
        'USER': os.environ['RDS_USERNAME'],
        'PASSWORD': os.environ['RDS_PASSWORD'],
        'HOST': os.environ['RDS_HOSTNAME'],   # e.g. mydb.xxxxxx.us-east-1.rds.amazonaws.com
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'CONN_MAX_AGE': 60,
    }
}
```

### Supabase (PostgreSQL)

```python
# In Supabase: Project Settings → Database → Connection string
DATABASE_URL = 'postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres'
```

### PlanetScale (MySQL — serverless)

```python
# PlanetScale uses SSL — add sslmode
DATABASE_URL = 'mysql://user:pass@host/db?ssl-mode=require'
```

### Neon (PostgreSQL — serverless)

```python
# Neon adds ?sslmode=require automatically
DATABASE_URL = 'postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require'
```

### Fly.io internal PostgreSQL

```python
# Fly.io provides DATABASE_URL automatically in app config
# In fly.toml:
# [env]
#   DATABASE_URL = "postgres://app:pass@myapp-db.flycast:5432/app"
```

---

## 6. Connection Pooling with pgBouncer

For production PostgreSQL with many connections, use pgBouncer or a managed pooler.

```python
# pgBouncer typically runs on port 6432
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myproject',
        'USER': 'myproject_user',
        'PASSWORD': 'strongpassword',
        'HOST': 'localhost',
        'PORT': '6432',            # pgBouncer port
        'CONN_MAX_AGE': 0,         # let pgBouncer manage connections
    }
}
```

### Django connection persistence

```python
# CONN_MAX_AGE — keep DB connections open in long-running processes
DATABASES = {
    'default': {
        # ...
        'CONN_MAX_AGE': 60,            # reuse connections for 60s
        'CONN_HEALTH_CHECKS': True,    # test connection before reuse (Django 4.1+)
    }
}
```

---

## 7. Testing with a Real Database

```python
# config/settings/test.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myproject_test',    # separate test DB
        'USER': 'myproject_user',
        'PASSWORD': 'strongpassword',
        'HOST': 'localhost',
        'PORT': '5432',
        'TEST': {
            'NAME': 'myproject_test',
        },
    }
}
```

Django automatically creates and destroys the TEST database when running tests.

```powershell
# Run tests (creates and destroys test DB automatically)
python manage.py test

# Keep test DB between runs (faster for repeated test runs)
python manage.py test --keepdb
```

---

## 8. Checking Database Connection

```powershell
# In Django shell
python manage.py shell

>>> from django.db import connections
>>> conn = connections['default']
>>> conn.ensure_connection()
>>> conn.connection   # Should not be None
>>> print(conn.settings_dict['ENGINE'])
```

```python
# Health check view
from django.db import connection
from django.http import JsonResponse


def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return JsonResponse({'status': 'ok'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'detail': str(e)}, status=503)
```

---

## 9. Database-Specific Features

### PostgreSQL — JSONField

```python
from django.db.models import JSONField

class Product(models.Model):
    metadata = JSONField(default=dict, blank=True)

# Query JSON fields
Product.objects.filter(metadata__color='red')
Product.objects.filter(metadata__price__lt=100)
```

### PostgreSQL — ArrayField

```python
from django.contrib.postgres.fields import ArrayField

class Survey(models.Model):
    tags = ArrayField(models.CharField(max_length=50), blank=True, default=list)

Survey.objects.filter(tags__contains=['python'])
Survey.objects.filter(tags__overlap=['python', 'django'])
```

### PostgreSQL — Full-Text Search

```python
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank

vector = SearchVector('title', weight='A') + SearchVector('body', weight='B')
query = SearchQuery('django')
results = Post.objects.annotate(rank=SearchRank(vector, query)).filter(rank__gte=0.1)
```

---

## Quick Reference

| Task | Command/Code |
|---|---|
| Install psycopg2 | `pip install psycopg2-binary` |
| Install URL parser | `pip install dj-database-url` |
| Parse DATABASE_URL | `dj_database_url.config(default='...')` |
| Persistent connections | `'CONN_MAX_AGE': 60` in DATABASES |
| Connection health check | `'CONN_HEALTH_CHECKS': True` |
| Run migrations | `python manage.py migrate` |
| Keep test DB | `python manage.py test --keepdb` |
| Check connection | `connections['default'].ensure_connection()` |
