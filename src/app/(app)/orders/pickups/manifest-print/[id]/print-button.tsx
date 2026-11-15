'use client';

import { Printer } from 'lucide-react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${PRIMARY_BUTTON} max-lg:h-11 print:hidden`}
    >
      <Printer aria-hidden="true" className="size-4" />
      Print manifest
    </button>
  );
}
