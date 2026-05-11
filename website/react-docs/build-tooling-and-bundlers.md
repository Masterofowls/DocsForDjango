---
id: build-tooling-and-bundlers
slug: /build-tooling-and-bundlers
sidebar_position: 15
description: 'Configure Vite, TypeScript, linting, and build checks for production-grade React apps.'
---

# Build Tooling and Bundlers

## Baseline Toolchain

- Vite for fast dev/build.
- TypeScript strict mode.
- ESLint + Prettier.
- Vitest for unit tests.

## TypeScript Strict Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Package Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

## Build Checks

1. `npm run lint`
2. `npm run test`
3. `npm run build`

## Optimization Targets

- Minimize entry bundle size.
- Avoid large dependency duplicates.
- Keep source maps for production observability.
