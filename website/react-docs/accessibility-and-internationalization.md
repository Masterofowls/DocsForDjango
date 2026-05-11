---
id: accessibility-and-internationalization
slug: /accessibility-and-internationalization
sidebar_position: 17
description: 'Ship inclusive React interfaces with WCAG-friendly patterns and localization support.'
---

# Accessibility and Internationalization

## Accessibility Essentials

1. Semantic HTML first.
2. Keyboard navigable interactions.
3. Correct labels, roles, and names.
4. Visible focus states and contrast.

## Accessible Form Example

```tsx
<label htmlFor='email'>Email</label>
<input id='email' name='email' type='email' aria-describedby='email-help' />
<p id='email-help'>Use your work email.</p>
```

## i18n Basics

Use ICU-style message formatting and locale-specific date/number formatting.

```tsx
const price = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(1299.5);
```

## A11y + i18n Checklist

- No hardcoded strings in components.
- All interactive controls have accessible names.
- Error messages are announced where needed (`aria-live`).
- RTL layouts are tested if supported.
