---
id: security-hardening-for-react-apps
slug: /security-hardening-for-react-apps
sidebar_position: 18
description: 'Harden React frontends against XSS, token leakage, and insecure client-side patterns.'
---

# Security Hardening for React Apps

## Core Principles

1. Never trust browser input.
2. Keep secrets server-side.
3. Escape/sanitize any untrusted HTML.
4. Enforce secure headers and CSP.

## Unsafe HTML Example

```tsx
// Avoid raw insertion of untrusted content
<div dangerouslySetInnerHTML={{ __html: userProvidedHtml }} />
```

If required, sanitize first (for example with DOMPurify).

## Token Handling

- Prefer httpOnly secure cookies over localStorage for auth tokens.
- Do not log tokens or PII.
- Rotate refresh tokens and expire sessions appropriately.

## Client-Side Security Checklist

- CSP configured.
- No API secrets in `VITE_*` variables.
- Dependency audit in CI.
- SRI and HTTPS enforced in production.
