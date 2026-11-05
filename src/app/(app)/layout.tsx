import type { ReactNode } from 'react';

/** Signed-in screens follow sharkship.in-design.md. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="theme-app font-body">{children}</div>;
}
