import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme/theme-toggle';

/** Sign-in screens: the Evoc Ships tokens, plus a theme switch in the corner (the form side follows it). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-auth font-body font-semibold">
      <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10 sm:top-4 sm:right-4">
        <ThemeToggle variant="icon" />
      </div>
      {children}
    </div>
  );
}
