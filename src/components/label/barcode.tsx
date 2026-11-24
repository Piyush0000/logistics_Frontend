import { code128Widths } from '@/lib/label/code128';

/**
 * A Code 128 barcode as crisp SVG bars, with a quiet zone either side so scanners find its edges.
 * The bars are pure black on white whatever the app theme, as scanners need.
 */
export function Barcode({
  value,
  height = 56,
  label,
  testId,
}: {
  value: string;
  height?: number;
  label: string;
  testId?: string;
}) {
  const widths = code128Widths(value);
  const quiet = 10;
  const total = widths.reduce((sum, w) => sum + w, 0) + quiet * 2;
  let x = quiet;
  const bars: { x: number; w: number }[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return (
    <svg
      role="img"
      aria-label={`${label}: ${value}`}
      data-testid={testId}
      viewBox={`0 0 ${total} ${height}`}
      preserveAspectRatio="none"
      className="block h-auto w-full"
      style={{ height, background: '#fff' }}
      shapeRendering="crispEdges"
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={height} fill="#000" />
      ))}
    </svg>
  );
}
