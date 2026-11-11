'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { emailSchema } from '@/lib/auth/login-schema';
import {
  companySchema,
  newPasswordSchema,
  personNameSchema,
  phoneSchema,
} from '@/lib/auth/signup-schema';
import { EmailField, FormError, SubmitButton, TermsField } from '../login/fields';
import { signUpAction } from './actions';
import { CompanyField, NameField, NewPasswordField, PhoneField } from './signup-fields';
import { IDLE } from './signup-state';

export function SignupForm() {
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(signUpAction, IDLE);

  // A slow phone can show the form before scripts load, so pick up anything already entered.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const input = (field: string) => form.elements.namedItem(field) as HTMLInputElement | null;
    if (input('company')?.value) setCompany(input('company')!.value);
    if (input('name')?.value) setName(input('name')!.value);
    if (input('email')?.value) setEmail(input('email')!.value);
    if (input('phone')?.value) setPhone(input('phone')!.value);
    if (input('password')?.value) setPassword(input('password')!.value);
    if (input('terms')?.checked) setTerms(true);
  }, []);

  // Submits without the `action` prop, because React resets the form after an action.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  const checks = {
    company: companySchema.safeParse(company).success,
    name: personNameSchema.safeParse(name).success,
    email: emailSchema.safeParse(email).success,
    phone: phoneSchema.safeParse(phone).success,
    password: newPasswordSchema.safeParse(password).success,
  };
  const canSubmit = Object.values(checks).every(Boolean) && terms;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <CompanyField value={company} onChange={setCompany} invalid={!checks.company} />
      <NameField value={name} onChange={setName} invalid={!checks.name} />
      <EmailField value={email} onChange={setEmail} />
      <PhoneField value={phone} onChange={setPhone} invalid={!checks.phone} />
      <NewPasswordField value={password} onChange={setPassword} invalid={!checks.password} />
      <TermsField checked={terms} onChange={setTerms} />
      {state.status === 'error' ? <FormError message={state.message} /> : null}
      <SubmitButton pending={pending} pendingLabel="Creating account" disabled={!canSubmit}>
        Create account
      </SubmitButton>
      <p className="text-center text-sm">
        Already have an account?{' '}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center font-extrabold text-primary underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
