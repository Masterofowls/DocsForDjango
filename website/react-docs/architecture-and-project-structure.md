---
id: architecture-and-project-structure
slug: /architecture-and-project-structure
sidebar_position: 2
description: 'Organize React apps by feature and boundaries for long-term maintainability.'
---

# Architecture and Project Structure

## Goals

A good structure keeps UI, state, data access, and domain logic separated.

## Recommended Layout

```text
src/
  app/
    providers/
    router/
  features/
    auth/
      components/
      hooks/
      api/
      state/
      types/
    dashboard/
  shared/
    components/
    hooks/
    lib/
    ui/
  styles/
  main.tsx
```

## Rules of the Architecture

1. Feature code lives in `features/<feature>`.
2. Shared reusable code lives in `shared`.
3. API clients stay close to the feature that owns them.
4. Avoid cross-feature imports where possible.

## Example Feature Boundary

```ts
// src/features/auth/api/login.ts
import { http } from '../../../shared/lib/http';

export type LoginRequest = {
  email: string;
  password: string;
};

export const login = async (payload: LoginRequest) => {
  return http.post('/auth/login', payload);
};
```

## Barrel Exports

```ts
// src/features/auth/index.ts
export * from './components/LoginForm';
export * from './hooks/useAuth';
```

## Anti-Patterns

- Global `utils.ts` dumping ground.
- Components importing deep internals from unrelated features.
- Putting API calls directly in JSX files.

## Migration Strategy

1. Identify one unstable area.
2. Move it under `features/<name>`.
3. Expose only public APIs from `index.ts`.
4. Repeat feature by feature.
