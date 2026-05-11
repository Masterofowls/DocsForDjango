---
id: state-management-with-hooks
slug: /state-management-with-hooks
sidebar_position: 4
description: 'Use useState and useMemo patterns correctly for predictable, scalable component state.'
---

# State Management with Hooks

## Local State Strategy

Use local state by default. Promote state only when multiple branches need it.

## `useState` Patterns

```tsx
const Counter = () => {
  const [count, setCount] = React.useState(0);

  const increment = () => setCount((prev) => prev + 1);

  return (
    <button onClick={increment}>
      Count: {count}
    </button>
  );
};
```

## Derived State

Do not mirror props unless necessary.

```tsx
const ProductList = ({ products }: { products: { id: string; price: number }[] }) => {
  const total = React.useMemo(
    () => products.reduce((sum, p) => sum + p.price, 0),
    [products],
  );

  return <p>Total: ${total}</p>;
};
```

## State Ownership Rules

1. Keep state closest to where it changes.
2. Lift only when siblings need shared control.
3. Keep write paths simple and centralized.

## Common Mistakes

- Mutating arrays/objects in state.
- Storing values that can be derived.
- Calling setters in render.
