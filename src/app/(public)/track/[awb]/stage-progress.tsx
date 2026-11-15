import { Check } from 'lucide-react';
import { PUBLIC_STAGES, type StageProgress } from './view-model';

/** Four stages for a shipment on its way, or one plain message when it will not be delivered. */
export function StageProgressBar({ progress }: { progress: StageProgress }) {
  if (progress.kind === 'stopped') {
    return (
      <p
        data-testid="stage-progress"
        role="status"
        className="rounded-control bg-warning/15 p-3 text-sm font-medium break-words"
      >
        {progress.message}
      </p>
    );
  }

  return (
    <ol data-testid="stage-progress" aria-label="Delivery progress" className="grid grid-cols-4 gap-1">
      {PUBLIC_STAGES.map((stage, index) => {
        const reached = index <= progress.current;
        const current = index === progress.current;
        return (
          <li
            key={stage}
            aria-current={current ? 'step' : undefined}
            className="flex min-w-0 flex-col items-center gap-1.5 text-center"
          >
            <span
              className={`grid size-7 place-items-center rounded-full border ${
                reached ? 'border-primary bg-primary text-on-primary' : 'border-secondary bg-tertiary text-on-surface/40'
              }`}
            >
              {reached ? <Check aria-hidden="true" className="size-4" /> : <span className="text-xs">{index + 1}</span>}
            </span>
            <span
              className={`text-xs leading-4 break-words ${current ? 'font-semibold text-primary' : 'text-on-surface/70'}`}
            >
              {stage}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
