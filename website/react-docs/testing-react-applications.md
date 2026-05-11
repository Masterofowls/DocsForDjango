---
id: testing-react-applications
slug: /testing-react-applications
sidebar_position: 16
description: 'Test React apps with Vitest and Testing Library using behavior-driven, resilient tests.'
---

# Testing React Applications

## Testing Pyramid

1. Unit tests for pure logic.
2. Component tests for user behavior.
3. Integration tests for critical flows.

## Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom';
```

## Component Test Example

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

test('shows validation message for invalid email', async () => {
  render(<LoginForm />);

  await userEvent.type(screen.getByRole('textbox'), 'not-an-email');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
});
```

## Test Quality Rules

- Assert behavior, not implementation details.
- Prefer role-based queries.
- Avoid brittle snapshots for dynamic UI.
