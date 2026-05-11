---
id: intro
slug: /intro
sidebar_position: 0
description: "Welcome to Django Mastery Docs — the complete reference for Django from installation to production."
---

# Welcome to Django Mastery Docs

> **The complete Django reference.** 36 topics covering every aspect of Django development — from first install to production deployment.

## What's in here?

| Category | Topics |
|---|---|
| 🚀 **Core** | Installation, Project Structure, Settings, URL Routing |
| 🗄️ **Data Layer** | Models & ORM, Relations, Transactions, External Databases |
| 🌐 **Web Layer** | Views (FBV/CBV), Templates, Forms, Styling (Tailwind) |
| 🔐 **Auth & Admin** | Users, Permissions, Admin Customization, Social Login |
| 🔌 **APIs & Realtime** | REST Framework, Async Views, Celery, WebSockets |
| 📁 **Media & Files** | File Uploads, CSV/Excel Imports |
| 🛒 **Tutorials** | Posts App, E-Commerce, Chat App, CMS |
| ✅ **Quality** | Testing, Security, Caching, Logging |
| 🚢 **Operations** | Deployment, CI/CD, Troubleshooting |

## Quick Start

```bash
# Create a virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
source .venv/bin/activate     # macOS/Linux

# Install Django
pip install django

# Create a project
django-admin startproject myproject .
python manage.py runserver
```

Visit [http://localhost:8000](http://localhost:8000) — you're running Django.

## How to use these docs

Each topic page follows a consistent structure:

- **Definition** — Clear explanation of the concept
- **Syntax / Components** — All relevant syntax with inline comments
- **Usage Examples** — Runnable, realistic code you can copy
- **Best Practices** — Production patterns and common pitfalls

## Suggested Reading Order

**New to Django?** Start here:

1. [Installation and Tooling](./installation-and-tooling)
2. [Project Structure and Apps](./project-structure-and-apps)
3. [Settings and Environments](./settings-and-environments)
4. [Models and ORM Basics](./models-and-orm-basics)
5. [Views: FBV and CBV](./views-fbv-and-cbv)
6. [Templates and Static Assets](./templates-and-static-assets)
7. [Forms and Validation](./forms-and-validation)
8. [Users, Auth, and Permissions](./users-auth-and-permissions)

**Building an API?**

1. [Django REST Framework](./django-rest-framework)
2. [DRF Deep Dive](./django-rest-framework-deep-dive)
3. [External Auth & Allauth](./external-auth-and-django-allauth)
4. [Security Hardening](./security-hardening)

**Going to production?**

1. [External Databases](./external-databases)
2. [Caching and Performance](./caching-and-performance)
3. [Deployment and Operations](./deployment-and-operations)
4. [CI/CD for Django](./ci-cd-for-django)

---

:::tip Django version
All examples are compatible with **Django 4.2 LTS** and **Django 5.x**.
:::
