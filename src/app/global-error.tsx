'use client';

import './globals.css';
import { PANEL_PRIMARY, PANEL_SECONDARY, StatusPanel } from '@/components/ui/status-panel';

/** Shown only when the root layout itself fails, so it brings its own html and body. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="theme-app font-body grid min-h-dvh place-items-center p-4">
          <StatusPanel
            title="Something went wrong on this page."
            message="Your data is safe. Try again, or go back to Home."
          >
            <button type="button" onClick={() => retry()} className={PANEL_PRIMARY}>
              Try again
            </button>
            {/* A plain anchor, because the router may be what failed. */}
            <a href="/home" className={PANEL_SECONDARY}>
              Go to Home
            </a>
          </StatusPanel>
        </div>
      </body>
    </html>
  );
}
