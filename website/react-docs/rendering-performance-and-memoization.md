---
id: rendering-performance-and-memoization
slug: /rendering-performance-and-memoization
sidebar_position: 12
description: 'Measure and optimize render cost with memoization, profiling, and stable references.'
---

# Rendering Performance and Memoization

## Measure First

Use React DevTools Profiler to identify expensive renders.

## `memo` and Stable Props

```tsx
type RowProps = {
  id: string;
  name: string;
  onSelect: (id: string) => void;
};

const UserRow = React.memo(({ id, name, onSelect }: RowProps) => {
  return <button onClick={() => onSelect(id)}>{name}</button>;
});
```

## `useCallback` and `useMemo`

```tsx
const Users = ({ users }: { users: { id: string; name: string }[] }) => {
  const [selected, setSelected] = React.useState<string | null>(null);

  const onSelect = React.useCallback((id: string) => {
    setSelected(id);
  }, []);

  const sorted = React.useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  return (
    <div>
      {sorted.map((u) => (
        <UserRow key={u.id} id={u.id} name={u.name} onSelect={onSelect} />
      ))}
      <p>Selected: {selected}</p>
    </div>
  );
};
```

## Performance Checklist

- Large lists virtualized.
- Derived values memoized only when costly.
- Re-renders tracked with profiler snapshots.
