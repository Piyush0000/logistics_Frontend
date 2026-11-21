'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Role } from '@/lib/data/team/types';
import { visibleNav, type NavGroup } from './nav-config';

const Shell = createContext<{ liveOnly: boolean; role: Role }>({ liveOnly: false, role: 'admin' });

/**
 * Set by the layout from the server: whether the app runs on real data only (production), and the
 * signed-in person's role.
 */
export function LiveOnlyProvider({
  liveOnly,
  role = 'admin',
  children,
}: {
  liveOnly: boolean;
  role?: Role;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ liveOnly, role }), [liveOnly, role]);
  return <Shell.Provider value={value}>{children}</Shell.Provider>;
}

/** The menu without unbuilt screens (on real data only) and without screens this role cannot use. */
export function useVisibleNav(): NavGroup[] {
  const { liveOnly, role } = useContext(Shell);
  return useMemo(() => visibleNav(liveOnly, undefined, role), [liveOnly, role]);
}
