'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { visibleNav, type NavGroup } from './nav-config';

const LiveOnly = createContext(false);

/** Set by the layout from the server: true when the app runs on real data only (production). */
export function LiveOnlyProvider({
  liveOnly,
  children,
}: {
  liveOnly: boolean;
  children: ReactNode;
}) {
  return <LiveOnly.Provider value={liveOnly}>{children}</LiveOnly.Provider>;
}

/** The menu without the screens whose backend is not built yet, when on real data only. */
export function useVisibleNav(): NavGroup[] {
  const liveOnly = useContext(LiveOnly);
  return useMemo(() => visibleNav(liveOnly), [liveOnly]);
}
