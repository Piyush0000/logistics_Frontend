export interface BarDatum {
  /** Shown on the axis. */
  label: string;
  /** The full text, for the summary, the bar's title and the table. Defaults to `label`. */
  fullLabel?: string;
  value: number;
}

const full = (d: BarDatum) => d.fullLabel ?? d.label;

/** NaN, infinite and negative values are drawn and read out as zero. */
const clean = (data: readonly BarDatum[]): BarDatum[] =>
  data.map((d) => (Number.isFinite(d.value) && d.value > 0 ? d : { ...d, value: 0 }));

const WIDTH = 320;
const HEIGHT = 190;
const TOP = 22; // room for the tallest value label
const BOTTOM = 26; // room for the axis labels
const BOTTOM_TWO_LINES = 38; // room for axis labels split over two lines
const SIDE = 8;
const RADIUS = 4;
const MAX_BAR_WIDTH = 28; // a lone bar stays a bar, not a block
const VALUE_CHAR = 6.6; // approximate width of one 11px semibold character
const AXIS_CHAR = 5.6; // approximate width of one 10px character
const LABEL_GAP = 4;

/**
 * Show every `step`-th label, counting back from the last bar so the latest one is always
 * shown, when the widest label is wider than a bar's slot.
 */
export function labelStep(texts: readonly string[], slot: number, charWidth: number): number {
  const text = Math.max(0, ...texts.map((entry) => entry.length)) * charWidth;
  // An edge label that is clamped moves up to this far towards its neighbour, so leave room for it.
  const clampShift = Math.max(0, text / 2 - slot / 2);
  return Math.max(1, Math.ceil((text + LABEL_GAP + clampShift) / slot));
}

/**
 * Where a label goes. It is centred on its bar, except that one too wide to fit between the
 * svg's edges and the margin is anchored to that edge, so the first and last labels never clip.
 */
export function labelPlacement(centre: number, text: string, charWidth: number) {
  const half = (text.length * charWidth) / 2;
  if (centre - half < SIDE) return { x: SIDE, anchor: 'start' as const };
  if (centre + half > WIDTH - SIDE) return { x: WIDTH - SIDE, anchor: 'end' as const };
  return { x: centre, anchor: 'middle' as const };
}

/** A label split over at most two lines, at the space nearest its middle. */
export function wrapLabel(text: string): string[] {
  const middle = text.length / 2;
  let best = -1;
  for (let index = text.indexOf(' '); index !== -1; index = text.indexOf(' ', index + 1)) {
    if (best === -1 || Math.abs(index - middle) < Math.abs(best - middle)) best = index;
  }
  return best === -1 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}

/** The text read out for the chart, so its figures are available without seeing the bars. */
export function chartSummary(
  label: string,
  input: readonly BarDatum[],
  format: (n: number) => string = String,
): string {
  const data = clean(input);
  if (data.length === 0) return `${label}. No data.`;
  const series = data.map((d) => `${full(d)}: ${format(d.value)}`).join(', ');
  const top = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]!);
  const highest = top.value > 0 ? ` Highest: ${full(top)}, ${format(top.value)}.` : '';
  return `${label}. ${series}.${highest}`;
}

/** A bar with rounded top corners that sits flat on the baseline. */
function barPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, width / 2, height);
  return `M${x} ${y + height}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height}Z`;
}

/**
 * A single-series bar chart in inline SVG. It scales to its container, labels each bar with its
 * value, and offers the same figures as a summary and as a hidden table.
 */
export function BarChart({
  label,
  data: input,
  format = String,
  formatLabel = format,
  categoryLabel = 'Day',
}: {
  label: string;
  data: BarDatum[];
  /** Full figures, for the summary, the bar's title and the table. */
  format?: (n: number) => string;
  /** Shorter figures for the labels above the bars. Defaults to `format`. */
  formatLabel?: (n: number) => string;
  /** The hidden table's first column heading. */
  categoryLabel?: string;
}) {
  const data = clean(input);
  const max = Math.max(1, ...data.map((d) => d.value));
  // A chart of categories (statuses, couriers, reasons) shows every label, split over two lines,
  // because a skipped category cannot be guessed. A chart of days thins its labels instead.
  const categorical = categoryLabel !== 'Day';
  const height = categorical ? HEIGHT + (BOTTOM_TWO_LINES - BOTTOM) : HEIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const slot = (WIDTH - SIDE * 2) / Math.max(1, data.length);
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(4, slot - 6));
  const baseline = TOP + plotHeight;
  const valueStep = labelStep(
    data.map((d) => formatLabel(d.value)),
    slot,
    VALUE_CHAR,
  );
  const axisStep = categorical
    ? 1
    : labelStep(
        data.map((d) => d.label),
        slot,
        AXIS_CHAR,
      );
  const shows = (index: number, step: number) => (data.length - 1 - index) % step === 0;

  return (
    <figure className="m-0 min-w-0">
      <svg
        role="img"
        aria-label={chartSummary(label, data, format)}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="mx-auto block h-auto w-full max-w-lg"
      >
        <line
          x1={SIDE}
          x2={WIDTH - SIDE}
          y1={baseline}
          y2={baseline}
          strokeWidth={1}
          className="stroke-secondary"
        />
        {data.map((d, index) => {
          const x = SIDE + index * slot + (slot - barWidth) / 2;
          const height = d.value > 0 ? Math.max(2, (d.value / max) * plotHeight) : 0;
          return (
            <g key={`bar-${d.label}-${index}`} aria-hidden="true">
              {height > 0 ? (
                <path
                  data-bar={d.label}
                  d={barPath(x, baseline - height, barWidth, height)}
                  className="motion-grow fill-primary transition-opacity duration-150 hover:opacity-80"
                  style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
                >
                  <title>{`${full(d)}: ${format(d.value)}`}</title>
                </path>
              ) : (
                <rect data-bar={d.label} x={x} y={baseline - 1} width={barWidth} height={1} className="fill-primary">
                  <title>{`${full(d)}: ${format(d.value)}`}</title>
                </rect>
              )}
            </g>
          );
        })}
        {/* Labels are drawn after every bar, so a taller neighbouring bar never hides one. */}
        {data.map((d, index) => {
          const x = SIDE + index * slot + (slot - barWidth) / 2;
          const height = d.value > 0 ? Math.max(2, (d.value / max) * plotHeight) : 0;
          const centre = x + barWidth / 2;
          const valueText = formatLabel(d.value);
          const valueAt = labelPlacement(centre, valueText, VALUE_CHAR);
          const lines = categorical ? wrapLabel(d.label) : [d.label];
          const axisAt = labelPlacement(
            centre,
            lines.reduce((widest, line) => (line.length > widest.length ? line : widest), ''),
            AXIS_CHAR,
          );
          return (
            <g key={`label-${d.label}-${index}`} aria-hidden="true">
              {shows(index, valueStep) ? (
                <text
                  data-value-label={d.label}
                  x={valueAt.x}
                  y={baseline - height - 6}
                  textAnchor={valueAt.anchor}
                  fontSize={11}
                  fontWeight={600}
                  paintOrder="stroke"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className="fill-on-surface/70 stroke-surface"
                >
                  {valueText}
                </text>
              ) : null}
              {shows(index, axisStep) ? (
                <text
                  data-axis-label={d.label}
                  x={axisAt.x}
                  y={baseline + 16}
                  textAnchor={axisAt.anchor}
                  fontSize={10}
                  className="fill-on-surface/70"
                >
                  {lines.length === 1
                    ? d.label
                    : lines.map((line, row) => (
                        <tspan key={line} x={axisAt.x} dy={row === 0 ? 0 : 11}>
                          {line}
                        </tspan>
                      ))}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {/* sr-only on a div: overflow hidden does not clip a table, so long row headers would widen the page. */}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{categoryLabel}</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, index) => (
              <tr key={`${d.label}-${index}`}>
                <th scope="row">{full(d)}</th>
                <td>{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
