export interface BarDatum {
  label: string;
  value: number;
}

const WIDTH = 320;
const HEIGHT = 190;
const TOP = 22; // room for the tallest value label
const BOTTOM = 26; // room for the axis labels
const SIDE = 8;
const RADIUS = 4;

/** The text read out for the chart, so its figures are available without seeing the bars. */
export function chartSummary(
  label: string,
  data: readonly BarDatum[],
  format: (n: number) => string = String,
): string {
  if (data.length === 0) return `${label}. No data.`;
  const series = data.map((d) => `${d.label}: ${format(d.value)}`).join(', ');
  const top = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]!);
  const highest = top.value > 0 ? ` Highest: ${top.label}, ${format(top.value)}.` : '';
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
  data,
  format = String,
}: {
  label: string;
  data: BarDatum[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const slot = (WIDTH - SIDE * 2) / Math.max(1, data.length);
  const barWidth = Math.max(4, slot - 6);
  const baseline = TOP + plotHeight;

  return (
    <figure className="m-0 min-w-0">
      <svg
        role="img"
        aria-label={chartSummary(label, data, format)}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
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
          const centre = x + barWidth / 2;
          return (
            <g key={`${d.label}-${index}`} aria-hidden="true">
              {height > 0 ? (
                <path data-bar={d.label} d={barPath(x, baseline - height, barWidth, height)} className="fill-primary">
                  <title>{`${d.label}: ${format(d.value)}`}</title>
                </path>
              ) : (
                <rect data-bar={d.label} x={x} y={baseline - 1} width={barWidth} height={1} className="fill-primary">
                  <title>{`${d.label}: ${format(d.value)}`}</title>
                </rect>
              )}
              <text
                data-value-label={d.label}
                x={centre}
                y={baseline - height - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                className="fill-on-surface/70"
              >
                {format(d.value)}
              </text>
              <text
                x={centre}
                y={baseline + 16}
                textAnchor="middle"
                fontSize={10}
                className="fill-on-surface/70"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, index) => (
            <tr key={`${d.label}-${index}`}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
