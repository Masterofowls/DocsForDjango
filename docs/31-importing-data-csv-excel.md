# Importing Data from CSV and Excel

## CSV Import

Using `csv` module:

```python
import csv
from django.core.management.base import BaseCommand
from myapp.models import Product


class Command(BaseCommand):
  help = 'Import products from CSV'

  def add_arguments(self, parser):
    parser.add_argument('csv_file', type=str)

  def handle(self, *args, **options):
    filepath = options['csv_file']
    with open(filepath, newline='', encoding='utf-8') as f:
      reader = csv.DictReader(f)
      for row in reader:
        Product.objects.get_or_create(
          sku=row['sku'],
          defaults={
            'name': row['name'],
            'price': float(row['price']),
          },
        )
    self.stdout.write(self.style.SUCCESS('Import complete'))
```

Run:

```powershell
python manage.py import_products data.csv
```

## Excel Import

Using `openpyxl`:

```powershell
pip install openpyxl
```

```python
from openpyxl import load_workbook


def import_from_excel(filepath):
  wb = load_workbook(filepath)
  ws = wb.active

  for row in ws.iter_rows(min_row=2, values_only=True):
    sku, name, price = row
    Product.objects.get_or_create(
      sku=sku,
      defaults={'name': name, 'price': float(price)},
    )
```

## Bulk Import with Transactions

```python
from django.db import transaction


@transaction.atomic
def bulk_import(filepath):
  items = []
  with open(filepath) as f:
    reader = csv.DictReader(f)
    for row in reader:
      items.append(Product(
        sku=row['sku'],
        name=row['name'],
        price=float(row['price']),
      ))

  Product.objects.bulk_create(items, ignore_conflicts=True)
```

## Handling Validation Errors

```python
def import_with_validation(filepath):
  errors = []
  with open(filepath) as f:
    for line_num, row in enumerate(csv.DictReader(f), start=2):
      try:
        product = Product(
          sku=row['sku'],
          name=row['name'],
          price=float(row['price']),
        )
        product.full_clean()
        product.save()
      except Exception as e:
        errors.append(f'Line {line_num}: {str(e)}')

  return errors
```

## Admin Interface for Import

```python
from django.contrib import admin
from django.utils.html import format_html


@admin.action(description='Import from CSV')
def import_csv_action(modeladmin, request, queryset):
  # Redirect to custom import view
  pass
```
