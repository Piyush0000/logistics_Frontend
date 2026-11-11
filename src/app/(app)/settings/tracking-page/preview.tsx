import { Check } from 'lucide-react';
import type { TrackingAccent } from '@/lib/data/tracking-page';

export const PREVIEW_AWB = 'DEMOEK001';

// Whole class names, so Tailwind can see them. Each accent is a palette token, and the header text
// is chosen per accent to stay readable on it.
const ACCENT_STYLE: Record<TrackingAccent, { fill: string; header: string }> = {
  primary: { fill: 'bg-primary', header: 'bg-primary text-tertiary' },
  accent: { fill: 'bg-accent', header: 'bg-accent text-on-surface' },
  success: { fill: 'bg-success', header: 'bg-success text-on-surface' },
};

const STAGES = ['Booked', 'In transit', 'Out for delivery', 'Delivered'];

export interface PreviewProps {
  displayName: string;
  supportEmail: string;
  supportPhone: string;
  accent: TrackingAccent;
  showCourier: boolean;
  logoName: string | null;
}

/**
 * A small copy of the public tracking page with the sample AWB. Every merchant-entered value is
 * rendered as text, so markup in it is shown, not run. Colours come from the palette only.
 */
export function TrackingPreview({ displayName, supportEmail, supportPhone, accent, showCourier, logoName }: PreviewProps) {
  const style = ACCENT_STYLE[accent];
  const contact = [supportEmail.trim(), supportPhone.trim()].filter(Boolean);
  return (
    <div
      data-testid="tracking-preview"
      data-accent={accent}
      className="min-w-0 overflow-hidden rounded-card border border-secondary bg-surface"
    >
      <div className={`flex min-w-0 items-center gap-3 p-card ${style.header}`}>
        {logoName ? (
          <span className="shrink-0 rounded-control bg-surface px-2 py-1 text-xs font-medium text-on-surface">
            Logo
          </span>
        ) : null}
        <p className="min-w-0 font-heading text-lg leading-6 [overflow-wrap:anywhere]">
          {displayName.trim() || 'Your display name'}
        </p>
      </div>

      <div className="grid gap-4 p-card">
        <div className="grid gap-1">
          <p className="text-xs text-on-surface/60">AWB</p>
          <p className="break-all font-heading text-base leading-6">{PREVIEW_AWB}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-control bg-muted px-2 py-0.5 font-medium">In transit</span>
            {showCourier ? (
              <span data-testid="preview-courier" className="rounded-control border border-secondary px-2 py-0.5">
                Sample courier
              </span>
            ) : null}
          </div>
        </div>

        <ol aria-label="Delivery progress preview" className="grid grid-cols-4 gap-1">
          {STAGES.map((stage, index) => (
            <li key={stage} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <span
                className={`grid size-6 place-items-center rounded-full border ${
                  index <= 1 ? `${style.fill} border-transparent text-on-surface` : 'border-secondary bg-tertiary'
                }`}
              >
                {index <= 1 ? <Check aria-hidden="true" className="size-3.5" /> : null}
              </span>
              <span className="text-[11px] leading-4 break-words text-on-surface/70">{stage}</span>
            </li>
          ))}
        </ol>

        {contact.length > 0 ? (
          <div className="grid gap-0.5 border-t border-secondary pt-3 text-xs text-on-surface/70">
            <p className="font-medium text-on-surface">Need help?</p>
            {contact.map((line) => (
              <p key={line} className="[overflow-wrap:anywhere]">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
