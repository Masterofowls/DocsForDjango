---
id: code-splitting-and-lazy-loading
slug: /code-splitting-and-lazy-loading
sidebar_position: 13
description: 'Reduce initial bundle size with route-level and component-level code splitting.'
---

# Code Splitting and Lazy Loading

## Route-Level Splitting

```tsx
const DashboardPage = React.lazy(() => import('../features/dashboard/DashboardPage'));

const App = () => {
  return (
    <React.Suspense fallback={<p>Loading...</p>}>
      <DashboardPage />
    </React.Suspense>
  );
};
```

## Component-Level Splitting

Use dynamic imports for heavy optional widgets (charts, editors).

```tsx
const Chart = React.lazy(() => import('./HeavyChart'));
```

## Progressive Loading Strategy

1. Split by route first.
2. Split heavy optional features second.
3. Preload likely-next route chunks.

## Checklist

- Fallback UI is meaningful.
- Error boundaries handle failed chunks.
- Bundle analyzer confirms reduction.
