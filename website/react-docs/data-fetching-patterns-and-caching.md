---
id: data-fetching-patterns-and-caching
slug: /data-fetching-patterns-and-caching
sidebar_position: 8
description: 'Design reliable data fetching with loading, error, cache, and revalidation behavior.'
---

# Data Fetching Patterns and Caching

## Recommended Approach

Use a data layer (TanStack Query, RTK Query, or equivalent) for caching,
retries, deduplication, and revalidation.

## Query Hook Example

```tsx
import { useQuery } from '@tanstack/react-query';

const fetchUsers = async () => {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to load users');
  return res.json() as Promise<{ id: string; name: string }[]>;
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 30_000,
  });
};
```

## Mutation with Invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateUser = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Create failed');
      return res.json();
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

## Production Checklist

- Loading and empty states are explicit.
- Error boundaries or error UIs are present.
- Cache keys are stable and meaningful.
