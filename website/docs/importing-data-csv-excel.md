---
id: importing-data-csv-excel
slug: /importing-data-csv-excel
sidebar_position: 24
description: "Import and export CSV and Excel files in Django with django-import-export."
---

# Importing Data from CSV and Excel

## Overview

Django applications frequently need to bulk-import data from CSV or Excel files (product catalogs,
user lists, migrations from legacy systems). This guide covers Python's built-in csv module, openpyxl
for Excel, the django-import-export library, import preview, and Django admin integration.

---

## 1. Reading CSV Files (built-in)

```python
# blog/management/commands/import_posts.py
import csv
import io
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from blog.models import Category, Post

User = get_user_model()


class Command(BaseCommand):
    help = 'Import posts from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to CSV file')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        csv_path = options['csv_file']
        dry_run = options['dry_run']

        try:
            with open(csv_path, newline='', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                self._validate_headers(reader.fieldnames)

                created = 0
                skipped = 0
                errors = []

                for row_num, row in enumerate(reader, start=2):
                    try:
                        post = self._process_row(row, dry_run)
                        if post:
                            created += 1
                        else:
                            skipped += 1
                    except Exception as exc:
                        errors.append(f'Row {row_num}: {exc}')

        except FileNotFoundError:
            raise CommandError(f'File not found: {csv_path}')

        self.stdout.write(f'Created: {created}, Skipped: {skipped}')
        for err in errors:
            self.stdout.write(self.style.ERROR(err))

    def _validate_headers(self, headers):
        required = {'title', 'body', 'author_email', 'category'}
        missing = required - set(headers or [])
        if missing:
            raise CommandError(f'Missing required columns: {missing}')

    def _process_row(self, row, dry_run):
        title = row['title'].strip()
        if not title:
            return None

        if Post.objects.filter(title=title).exists():
            self.stdout.write(self.style.WARNING(f'  Skipping duplicate: {title}'))
            return None

        try:
            author = User.objects.get(email=row['author_email'].strip())
        except User.DoesNotExist:
            raise ValueError(f"User not found: {row['author_email']}")

        category, _ = Category.objects.get_or_create(
            name=row['category'].strip(),
            defaults={'slug': row['category'].strip().lower().replace(' ', '-')},
        )

        if not dry_run:
            return Post.objects.create(
                title=title,
                body=row['body'].strip(),
                author=author,
                category=category,
                status=row.get('status', 'draft').strip(),
            )
        return True
```

---

## 2. Exporting to CSV

```python
# blog/views.py
import csv
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from blog.models import Post


@login_required
def export_posts_csv(request):
    posts = Post.objects.filter(author=request.user).select_related('category')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="posts.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Title', 'Category', 'Status', 'Created'])

    for post in posts:
        writer.writerow([
            post.pk,
            post.title,
            post.category.name if post.category else '',
            post.status,
            post.created_at.strftime('%Y-%m-%d'),
        ])

    return response
```

---

## 3. Reading Excel Files with openpyxl

```powershell
pip install openpyxl
```

```python
# blog/utils/excel_import.py
from openpyxl import load_workbook


def import_posts_from_excel(file_obj):
    """
    Import posts from an uploaded Excel file.
    Expected columns: A=title, B=body, C=author_email, D=category, E=status
    """
    wb = load_workbook(file_obj, read_only=True, data_only=True)
    ws = wb.active

    results = {'created': 0, 'skipped': 0, 'errors': []}

    # Skip header row (row 1)
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        title, body, author_email, category_name, status = row[:5]

        if not title:
            results['skipped'] += 1
            continue

        try:
            from django.contrib.auth import get_user_model
            from blog.models import Category, Post

            User = get_user_model()
            author = User.objects.get(email=str(author_email).strip())
            category, _ = Category.objects.get_or_create(name=str(category_name).strip())

            Post.objects.create(
                title=str(title).strip(),
                body=str(body or ''),
                author=author,
                category=category,
                status=str(status or 'draft').strip(),
            )
            results['created'] += 1
        except Exception as exc:
            results['errors'].append(f'Row {row_num}: {exc}')

    wb.close()
    return results
```

---

## 4. Upload and Import View

```python
# blog/views.py
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import ImportForm
from .utils.excel_import import import_posts_from_excel


@login_required
def import_posts(request):
    if request.method == 'POST':
        form = ImportForm(request.POST, request.FILES)
        if form.is_valid():
            file = request.FILES['file']
            ext = file.name.rsplit('.', 1)[-1].lower()

            if ext not in ('csv', 'xlsx', 'xls'):
                messages.error(request, 'Unsupported file type.')
            elif ext == 'csv':
                from .utils.csv_import import import_posts_from_csv_file
                results = import_posts_from_csv_file(file)
                messages.success(
                    request,
                    f"Imported {results['created']} posts. "
                    f"Errors: {len(results['errors'])}"
                )
            else:
                results = import_posts_from_excel(file)
                messages.success(
                    request,
                    f"Imported {results['created']} posts."
                )
            return redirect('import_posts')
    else:
        form = ImportForm()
    return render(request, 'blog/import.html', {'form': form})
```

```python
# blog/forms.py
from django import forms


class ImportForm(forms.Form):
    file = forms.FileField(
        label='CSV or Excel file',
        help_text='Accepted formats: .csv, .xlsx',
    )

    def clean_file(self):
        f = self.cleaned_data['file']
        max_size = 10 * 1024 * 1024  # 10 MB
        if f.size > max_size:
            raise forms.ValidationError('File must be under 10 MB.')
        return f
```

---

## 5. django-import-export (Admin Integration)

```powershell
pip install django-import-export
```

```python
# settings.py
INSTALLED_APPS += ['import_export']
```

```python
# blog/admin.py
from import_export import resources, fields, widgets
from import_export.admin import ImportExportModelAdmin
from blog.models import Post, Category
from django.contrib.auth import get_user_model

User = get_user_model()


class PostResource(resources.ModelResource):
    category = fields.Field(
        column_name='category',
        attribute='category',
        widget=widgets.ForeignKeyWidget(Category, 'name'),
    )
    author = fields.Field(
        column_name='author_email',
        attribute='author',
        widget=widgets.ForeignKeyWidget(User, 'email'),
    )

    class Meta:
        model = Post
        fields = ('id', 'title', 'category', 'author', 'status', 'created_at')
        import_id_fields = ('title',)        # use title as unique key on import
        skip_unchanged = True                # skip rows with no changes
        report_skipped = True


@admin.register(Post)
class PostAdmin(ImportExportModelAdmin):
    resource_classes = [PostResource]
    list_display = ['title', 'author', 'status', 'created_at']
```

Now the admin shows **Import** and **Export** buttons on the Post change list.

---

## 6. Exporting to Excel with openpyxl

```python
def export_posts_excel(request):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from django.http import HttpResponse

    wb = Workbook()
    ws = wb.active
    ws.title = 'Posts'

    # Header row
    headers = ['ID', 'Title', 'Category', 'Author', 'Status', 'Created']
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill(fill_type='solid', fgColor='0C4B33')
        cell.font = Font(bold=True, color='FFFFFF')

    # Data rows
    posts = Post.objects.all().select_related('category', 'author')
    for post in posts:
        ws.append([
            post.pk,
            post.title,
            post.category.name if post.category else '',
            post.author.email,
            post.status,
            post.created_at.replace(tzinfo=None),  # Excel doesn't support timezone-aware datetimes
        ])

    # Auto-width columns
    for col in ws.columns:
        width = max(len(str(cell.value or '')) for cell in col) + 2
        ws.column_dimensions[col[0].column_letter].width = min(width, 50)

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="posts.xlsx"'
    wb.save(response)
    return response
```

---

## Quick Reference

| Task | Code |
|---|---|
| Read CSV | `csv.DictReader(open(path, newline='', encoding='utf-8-sig'))` |
| Export CSV | `HttpResponse(content_type='text/csv')` + `csv.writer` |
| Read Excel | `openpyxl.load_workbook(file, read_only=True)` |
| Export Excel | `openpyxl.Workbook()` + `wb.save(response)` |
| Admin import/export | `ImportExportModelAdmin` + `ModelResource` |
| File validation | Check `content_type`, `size`, and extension in form |
| Validate headers | Compare `reader.fieldnames` to required set |
