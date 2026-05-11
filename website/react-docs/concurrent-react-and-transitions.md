---
id: concurrent-react-and-transitions
slug: /concurrent-react-and-transitions
sidebar_position: 14
description: 'Use transitions and deferred values to keep interactions responsive under load.'
---

# Concurrent React and Transitions

## `useTransition`

Mark non-urgent updates as transitions.

```tsx
const SearchResults = ({ allItems }: { allItems: string[] }) => {
  const [query, setQuery] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  const [visibleQuery, setVisibleQuery] = React.useState('');

  const onChange = (value: string) => {
    setQuery(value);
    startTransition(() => {
      setVisibleQuery(value);
    });
  };

  const filtered = allItems.filter((x) => x.toLowerCase().includes(visibleQuery.toLowerCase()));

  return (
    <div>
      <input value={query} onChange={(e) => onChange(e.target.value)} />
      {isPending && <p>Updating results...</p>}
      <ul>{filtered.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
};
```

## `useDeferredValue`

```tsx
const deferredQuery = React.useDeferredValue(query);
```

Use deferred values for expensive derived work tied to user typing.

## Checklist

- Urgent input remains responsive.
- Expensive rendering is transition/deferred.
- Pending UI communicates state clearly.
