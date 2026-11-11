import type { Metadata } from 'next';
import Link from 'next/link';
import { PANEL_PRIMARY, PANEL_SECONDARY, StatusPanel } from '@/components/ui/status-panel';

export const metadata: Metadata = { title: 'Page not found | Evoc Logistics' };

export default function NotFound() {
  return (
    <div className="theme-app font-body grid min-h-dvh place-items-center p-4">
      <StatusPanel
        title="Page not found"
        message="This page does not exist or has moved. Check the address, or go back to your work."
      >
        <Link href="/home" className={PANEL_PRIMARY}>
          Go to Home
        </Link>
        <Link href="/dashboard" className={PANEL_SECONDARY}>
          Go to Dashboard
        </Link>
      </StatusPanel>
    </div>
  );
}
