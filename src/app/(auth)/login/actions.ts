'use server';

import { redirect } from 'next/navigation';
import { emailSchema, otpSchema, passwordSchema } from '@/lib/auth/login-schema';
import { createDemoSession, endDemoSession } from '@/lib/auth/session';
import { sessionService } from '@/lib/data/session';
import type { LoginState } from './login-state';

const TERMS_MESSAGE = 'Accept the terms to continue.';

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function failure(message: string | undefined): LoginState {
  return { status: 'error', message: message ?? 'Check your details and try again.' };
}

export async function requestOtpAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(field(formData, 'email'));
  if (!email.success) return failure(email.error.issues[0]?.message);
  if (field(formData, 'terms') !== 'on') return failure(TERMS_MESSAGE);

  const result = await sessionService().requestOtp(email.data);
  if (!result.ok) return failure(result.error.message);

  return { status: 'code_sent', email: email.data, demoCode: result.data.demoCode };
}

export async function verifyOtpAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(field(formData, 'email'));
  if (!email.success) return failure(email.error.issues[0]?.message);
  const code = otpSchema.safeParse(field(formData, 'code'));
  if (!code.success) return failure(code.error.issues[0]?.message);

  const result = await sessionService().verifyOtp(email.data, code.data);
  if (!result.ok) return failure(result.error.message);

  await createDemoSession(result.data.email);
  redirect('/dashboard');
}

export async function passwordSignInAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = emailSchema.safeParse(field(formData, 'email'));
  if (!email.success) return failure(email.error.issues[0]?.message);
  if (field(formData, 'terms') !== 'on') return failure(TERMS_MESSAGE);
  const password = passwordSchema.safeParse(field(formData, 'password'));
  if (!password.success) return failure(password.error.issues[0]?.message);

  const result = await sessionService().signInWithPassword(email.data, password.data);
  if (!result.ok) return failure(result.error.message);

  await createDemoSession(result.data.email);
  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  await endDemoSession();
  redirect('/login');
}
