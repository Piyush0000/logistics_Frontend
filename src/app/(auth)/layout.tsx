import type { ReactNode } from 'react';

/** Login screens follow meracourierwala.com-design.md, using the Sharkship colours. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="theme-auth font-body font-semibold">{children}</div>;
}
