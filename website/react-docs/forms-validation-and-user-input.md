---
id: forms-validation-and-user-input
slug: /forms-validation-and-user-input
sidebar_position: 10
description: 'Build robust forms with schema validation, field-level errors, and safe submission flows.'
---

# Forms, Validation, and User Input

## Recommended Tooling

- React Hook Form for control and performance.
- Zod or Yup for schema validation.

## Example with Zod

```tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

type FormValues = z.infer<typeof schema>;

export const LoginForm = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input {...register('email')} aria-invalid={!!errors.email} />
      {errors.email && <p>{errors.email.message}</p>}

      <input type='password' {...register('password')} aria-invalid={!!errors.password} />
      {errors.password && <p>{errors.password.message}</p>}

      <button disabled={isSubmitting}>Sign in</button>
    </form>
  );
};
```

## Form Checklist

- Validation lives in a schema.
- Submissions are idempotent where possible.
- Sensitive values are never logged.
