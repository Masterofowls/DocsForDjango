# CI/CD for Django

## Definition

CI validates changes automatically. CD delivers validated changes safely.

## CI Pipeline Stages

1. install dependencies
2. lint and format checks
3. type checks
4. tests
5. build artifacts

## Example Commands

```powershell
python -m pip install -r requirements.txt
ruff check .
black --check .
pytest -q
```

## CD Recommendations

- use environment-based deployments
- require approvals for production
- run migrations in controlled step
- use canary or rolling deployment strategy
