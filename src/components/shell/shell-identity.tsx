'use client';

import { createContext, useContext, type ReactNode } from 'react';

const ShellIdentity = createContext<string | null>(null);

/** Gives the error page the signed-in email, so it can keep the app shell around its message. */
export function ShellIdentityProvider({ email, children }: { email: string | null; children: ReactNode }) {
  return <ShellIdentity.Provider value={email}>{children}</ShellIdentity.Provider>;
}

export function useShellEmail(): string | null {
  return useContext(ShellIdentity);
}
