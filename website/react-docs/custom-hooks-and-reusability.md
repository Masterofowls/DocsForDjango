---
id: custom-hooks-and-reusability
slug: /custom-hooks-and-reusability
sidebar_position: 7
description: 'Extract business logic into custom hooks for reuse, testing, and composition.'
---

# Custom Hooks and Reusability

## Why Custom Hooks

Custom hooks let you share stateful logic without copying component code.

## Example: Debounced Value Hook

```tsx
export const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
};
```

## Example Usage

```tsx
const SearchBox = () => {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  React.useEffect(() => {
    if (!debouncedQuery) return;
    // fetch data with debouncedQuery
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
};
```

## Hook Design Checklist

- Clear input and output contract.
- No hidden global mutations.
- Cleanup handled inside hook.
- Unit-test friendly API.
