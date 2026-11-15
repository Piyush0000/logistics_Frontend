import { CircleCheck } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';

// Short phones keep the compact header, so the form stays near the top of the screen.
const TALL_PHONE_ONLY = '[@media(min-height:700px)]:max-sm:block';

const POINTS = ['Orders and tracking', 'COD and wallet', 'Updates sent to your systems'];

const STOPS = [
  [64, 150],
  [212, 96],
  [356, 196],
];

/** A shipment's route across the panel, ending at the delivery point. */
function RouteLine() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 480 320"
      className="pointer-events-none absolute top-28 left-0 hidden w-full lg:block"
    >
      <path
        d="M-10 190 C 20 170, 40 160, 64 150 S 170 80, 212 96 S 300 190, 356 196 S 430 150, 440 96"
        fill="none"
        stroke="var(--c-on-primary)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      {STOPS.map(([cx, cy]) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r="5"
          fill="var(--c-primary)"
          stroke="var(--c-on-primary)"
          strokeOpacity="0.7"
          strokeWidth="2"
        />
      ))}
      <circle cx="440" cy="96" r="16" fill="var(--c-accent)" fillOpacity="0.25" />
      <circle cx="440" cy="96" r="7" fill="var(--c-accent)" />
    </svg>
  );
}

/** The same route, drawn flat for the taller phone header. */
function RouteStrip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 28"
      className={`mx-auto mt-5 hidden w-full max-w-xs ${TALL_PHONE_ONLY}`}
    >
      <line
        x1="10"
        y1="14"
        x2="300"
        y2="14"
        stroke="var(--c-on-primary)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      {[10, 110, 210].map((cx) => (
        <circle
          key={cx}
          cx={cx}
          cy="14"
          r="5"
          fill="var(--c-primary)"
          stroke="var(--c-on-primary)"
          strokeOpacity="0.7"
          strokeWidth="2"
        />
      ))}
      <circle cx="304" cy="14" r="13" fill="var(--c-accent)" fillOpacity="0.25" />
      <circle cx="304" cy="14" r="6" fill="var(--c-accent)" />
    </svg>
  );
}

export function BrandPanel() {
  return (
    <aside
      data-testid="brand-panel"
      className="midnight relative flex flex-col justify-center overflow-hidden px-5 py-6 text-center [@media(min-height:700px)]:max-sm:min-h-[30dvh] sm:block sm:px-10 sm:py-7 sm:text-start lg:flex lg:justify-between lg:p-12"
    >
      <RouteLine />
      <div className="relative flex justify-center sm:justify-start">
        <BrandMark onDark />
      </div>
      <div className="relative mt-4 lg:mt-0">
        <p className="font-heading text-[21px] leading-[26px] font-extrabold lg:text-[34px] lg:leading-[41px]">
          Multiple logistics partners.{' '}
          <span className="text-[var(--midnight-accent)]">One unified dashboard.</span>
        </p>
        <p
          className={`mt-2 hidden text-sm leading-[22px] text-on-primary/75 lg:mt-4 lg:block lg:max-w-sm lg:text-base lg:leading-[26px] ${TALL_PHONE_ONLY}`}
        >
          Book, track and reconcile deliveries across your carriers.
        </p>
        <RouteStrip />
        <ul className="mt-6 hidden gap-2 rounded-card border border-on-primary/12 bg-on-primary/[0.06] p-4 text-base backdrop-blur-md lg:grid">
          {POINTS.map((point) => (
            <li key={point} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-control bg-primary/30 text-[var(--midnight-accent)]">
                <CircleCheck aria-hidden="true" className="size-4" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
