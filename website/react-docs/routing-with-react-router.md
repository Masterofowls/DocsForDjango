---
id: routing-with-react-router
slug: /routing-with-react-router
sidebar_position: 9
description: 'Build nested routes, data-aware layouts, and guarded screens with React Router.'
---

# Routing with React Router

## Router Setup

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'users/:userId', element: <UserPage /> },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
```

## Protected Routes

```tsx
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = true; // from auth state
  if (!isAuthenticated) return <Navigate to='/login' replace />;
  return <>{children}</>;
};
```

## Route-Level Lazy Loading

```tsx
const SettingsPage = React.lazy(() => import('../features/settings/SettingsPage'));
```

## Routing Checklist

- Dynamic segments are validated.
- 404 route is defined.
- Redirect loops are prevented.
