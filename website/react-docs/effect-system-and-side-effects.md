---
id: effect-system-and-side-effects
slug: /effect-system-and-side-effects
sidebar_position: 6
description: 'Model side effects safely with useEffect, cleanup discipline, and dependency correctness.'
---

# Effect System and Side Effects

## Effect Rules

1. Keep rendering pure.
2. Use effects only for synchronization with external systems.
3. Always handle cleanup for subscriptions, timers, and listeners.

## Correct Effect Example

```tsx
const ResizeWatcher = () => {
  const [width, setWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return <p>Width: {width}</p>;
};
```

## Avoid Stale Closures

```tsx
const Poller = () => {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return <p>{tick}</p>;
};
```

## Dependency Guidance

- Include all used reactive values.
- If dependency list feels wrong, restructure code.
- Prefer extracting logic to custom hooks.
