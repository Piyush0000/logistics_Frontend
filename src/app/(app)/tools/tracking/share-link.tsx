'use client';

import { useSyncExternalStore } from 'react';
import { CopyButton } from '@/components/ui/copy-button';

const subscribe = () => () => {};

/** Copies the absolute public tracking link for one AWB, using the address the page was opened on. */
export function ShareLink({ awb }: { awb: string }) {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => '');
  return (
    <CopyButton
      label="Share tracking link"
      fieldLabel="Tracking link"
      text={`${origin}/track/${encodeURIComponent(awb)}`}
    />
  );
}
