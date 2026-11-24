'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { recordAudit } from '@/lib/admin/data/system';
import { signInAdmin, signOutAdmin } from '@/lib/admin/session';
import { clearFailures, clientKey, lockedForMinutes, recordFailure } from '@/lib/admin/sign-in-limit';

export interface AdminSignInState {
  error: string | null;
}

const MAX_LENGTH = 200;

/** Checks the founder's email and password; on success opens the admin overview. */
export async function adminSignInAction(_previous: AdminSignInState, form: FormData): Promise<AdminSignInState> {
  const email = String(form.get('email') ?? '').slice(0, MAX_LENGTH);
  const password = String(form.get('password') ?? '').slice(0, MAX_LENGTH);
  if (!email || !password) return { error: 'Enter your email and password.' };

  // The admin panel moves money: wrong passwords are limited per address, and logged.
  const head = await headers();
  const key = clientKey(head.get('x-forwarded-for'), head.get('x-real-ip'));
  const locked = lockedForMinutes(key);
  if (locked) return { error: `Too many wrong attempts. Try again in ${locked} minute${locked === 1 ? '' : 's'}.` };

  const result = await signInAdmin(email, password);
  if (result === 'unavailable') return { error: 'Admin sign-in is not set up on this server.' };
  if (result === 'invalid') {
    recordFailure(key);
    console.warn(`admin sign-in failed from ${key}`);
    // A short pause makes guessing slower still.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { error: 'That email and password do not match.' };
  }
  clearFailures(key);
  await recordAudit({ action: 'Admin signed in', target: email.trim().toLowerCase(), detail: `From ${key}.` });
  redirect('/admin');
}

export async function adminSignOutAction(): Promise<void> {
  await signOutAdmin();
  redirect('/admin/login');
}
