---
id: components-props-and-composition
slug: /components-props-and-composition
sidebar_position: 3
description: 'Build composable React components with clear contracts and minimal prop complexity.'
---

# Components, Props, and Composition

## Component Design Principles

1. One component, one primary responsibility.
2. Prefer composition over inheritance.
3. Keep props explicit and typed.
4. Avoid boolean prop explosion.

## Typed Component Example

```tsx
type CardProps = {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export const Card = ({ title, actions, children }: CardProps) => {
  return (
    <section className='card'>
      <header className='card-header'>
        <h2>{title}</h2>
        {actions}
      </header>
      <div className='card-body'>{children}</div>
    </section>
  );
};
```

## Compound Component Pattern

```tsx
const Modal = ({ children }: { children: React.ReactNode }) => {
  return <div role='dialog'>{children}</div>;
};

Modal.Header = ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>;
Modal.Body = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
Modal.Footer = ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>;
```

## Render Props for Flexibility

```tsx
type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};

export const List = <T,>({ items, renderItem }: ListProps<T>) => {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item)}</li>)}</ul>;
};
```

## Checklist

- Props are minimal and stable.
- Component can be reused in at least two contexts.
- Behavior is testable without implementation coupling.
