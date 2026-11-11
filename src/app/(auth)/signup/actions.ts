'use server';

import { redirect } from 'next/navigation';
import { createDemoSession, getDemoSession } from '@/lib/auth/session';
import { signupSchema } from '@/lib/auth/signup-schema';
import { sessionService } from '@/lib/data/session';
import type { SignupState } from './signup-state';

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

/** Public on purpose: a signed-out visitor has to be able to create an account. */
export async function signUpAction(_state: SignupState, formData: FormData): Promise<SignupState> {
  // Never replace an existing session.
  if (await getDemoSession()) redirect('/home');

  const parsed = signupSchema.safeParse({
    company: field(formData, 'company'),
    name: field(formData, 'name'),
    email: field(formData, 'email'),
    phone: field(formData, 'phone'),
    password: field(formData, 'password'),
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Check your details and try again.',
    };
  }
  if (field(formData, 'terms') !== 'on') {
    return { status: 'error', message: 'Accept the terms to continue.' };
  }

  const result = await sessionService().signUp(parsed.data);
  if (!result.ok) return { status: 'error', message: result.error.message };

  await createDemoSession(result.data.email);
  redirect('/home');
}
