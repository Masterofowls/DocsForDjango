---
id: refs-portals-and-dom-integration
slug: /refs-portals-and-dom-integration
sidebar_position: 11
description: 'Use refs and portals for advanced DOM integration without breaking React data flow.'
---

# Refs, Portals, and DOM Integration

## Refs

Use refs for imperative APIs, focus management, and third-party integration.

```tsx
const SearchInput = () => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} placeholder='Search' />;
};
```

## Forwarding Refs

```tsx
type TextFieldProps = React.ComponentProps<'input'>;

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (props, ref) => {
    return <input ref={ref} {...props} />;
  },
);
```

## Portals

```tsx
import { createPortal } from 'react-dom';

export const Modal = ({ children }: { children: React.ReactNode }) => {
  const root = document.getElementById('modal-root');
  if (!root) return null;
  return createPortal(<div className='modal'>{children}</div>, root);
};
```

## Integration Checklist

- Cleanup third-party instances in effects.
- Keep imperative calls localized.
- Maintain keyboard and screen-reader support for portals.
