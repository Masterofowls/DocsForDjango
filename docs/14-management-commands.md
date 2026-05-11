# Management Commands

## Definition

Management commands are custom CLI tasks under `manage.py`.

## File Path

```text
blog/management/commands/rebuild_index.py
```

## Syntax

```python
from django.core.management.base import BaseCommand


class Command(BaseCommand):
  help = 'Rebuild search index'

  def add_arguments(self, parser):
    parser.add_argument('--dry-run', action='store_true')

  def handle(self, *args, **options):
    if options['dry_run']:
      self.stdout.write('Dry run: no data changed')
      return

    self.stdout.write(self.style.SUCCESS('Index rebuilt'))
```

## Usage

```powershell
python manage.py rebuild_index
python manage.py rebuild_index --dry-run
```

## Use Cases

- data backfills
- export/import
- cache warming
- maintenance tasks
