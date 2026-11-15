'use server';

import { redirect } from 'next/navigation';
import { signInAdmin, signOutAdmin } from '@/lib/admin/session';

export interface AdminSignInState {
  error: string | null;
}

const MAX_LENGTH = 200;

/** Checks the founder's email and password; on success opens the admin overview. */
export async function adminSignInAction(_previous: AdminSignInState, form: FormData): Promise<AdminSignInState> {
  const email = String(form.get('email') ?? '').slice(0, MAX_LENGTH);
  const password = String(form.get('password') ?? '').slice(0, MAX_LENGTH);
  if (!email || !password) return { error: 'Enter your email and password.' };

  const result = await signInAdmin(email, password);
  if (result === 'unavailable') return { error: 'Admin sign-in is not set up on this server.' };
  if (result === 'invalid') return { error: 'That email and password do not match.' };
  redirect('/admin');
}

export async function adminSignOutAction(): Promise<void> {
  await signOutAdmin();
  redirect('/admin/login');
}
