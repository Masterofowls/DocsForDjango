---
id: ci-cd-and-deployment-for-react
slug: /ci-cd-and-deployment-for-react
sidebar_position: 19
description: 'Set up CI/CD for React with lint, test, build, preview deploys, and production promotion.'
---

# CI/CD and Deployment for React

## Pipeline Stages

1. Install and cache dependencies.
2. Lint and type-check.
3. Run tests.
4. Build artifacts.
5. Deploy preview.
6. Promote to production.

## GitHub Actions Example

```yaml
name: React CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

## Deployment Checklist

- Production env vars stored in platform secrets.
- Source maps uploaded for monitoring.
- Rollback path documented.
