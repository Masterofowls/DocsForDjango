# DocsForDjango

Complete Django documentation set from installation to advanced development,
with definitions, syntax, and practical usage examples.

## Contents

- Documentation index: `docs/index.md`
- Topic docs: `docs/*.md` (installation to advanced operations)
- Legacy combined guide: `docs/django-complete-guide.md`
- Doxygen config: `Doxyfile`
- Build script: `scripts/build-docs.ps1`
- Local serve script: `scripts/serve-docs.ps1`

## Quick Start

1. Install Python 3.12+ and pip.
2. Install Django:

```powershell
python -m pip install django
```

3. Build docs with Doxygen:

```powershell
pwsh -File .\scripts\build-docs.ps1
```

4. Open generated docs:

- Main page: `build/docs/html/index.html`

## Notes

- This repository is Markdown-first and Doxygen-generated.
- Documentation is split by topic, with one file per subject for clearer
  navigation and maintenance.
