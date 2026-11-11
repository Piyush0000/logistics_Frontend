import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BarChart, chartSummary } from './bar-chart';

const DATA = [
  { label: '5 Nov', value: 0 },
  { label: '6 Nov', value: 3 },
  { label: '7 Nov', value: 12 },
  { label: '8 Nov', value: 1 },
  { label: '9 Nov', value: 0 },
  { label: '10 Nov', value: 4 },
  { label: '11 Nov', value: 2 },
];

const render = (props: Partial<Parameters<typeof BarChart>[0]> = {}) =>
  renderToStaticMarkup(createElement(BarChart, { label: 'Pickups per day', data: DATA, ...props }));

describe('BarChart', () => {
  it('draws one bar per day with an accessible summary', () => {
    const html = render();
    expect(html.match(/data-bar=/g)).toHaveLength(7);
    expect(html).toContain('role="img"');
    expect(html).toContain(
      'aria-label="Pickups per day. 5 Nov: 0, 6 Nov: 3, 7 Nov: 12, 8 Nov: 1, 9 Nov: 0, 10 Nov: 4, 11 Nov: 2. Highest: 7 Nov, 12."',
    );
  });

  it('puts every value in a hidden table and as a value label', () => {
    const html = render();
    expect(html).toContain('<div class="sr-only"><table>');
    expect(html.match(/<tr>/g)).toHaveLength(8);
    expect(html.match(/data-value-label=/g)).toHaveLength(7);
  });

  it('uses only palette classes', () => {
    const html = render();
    expect(html).toContain('fill-primary');
    expect(html).toContain('fill-on-surface/70');
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('formats values with the given formatter', () => {
    expect(render({ format: (n) => `${n} pk` })).toContain('12 pk');
  });

  it('handles an empty series and all zeros', () => {
    expect(chartSummary('Pickups', [])).toBe('Pickups. No data.');
    const html = render({ data: DATA.map((d) => ({ ...d, value: 0 })) });
    expect(html.match(/data-bar=/g)).toHaveLength(7);
    expect(html).not.toContain('NaN');
  });

  it('keeps the short label on the axis and the full label everywhere else', () => {
    const html = render({
      categoryLabel: 'Reason',
      data: [
        { label: 'Requested…', fullLabel: 'Customer requested future delivery date', value: 2 },
        { label: 'Other', fullLabel: 'Other reasons', value: 1 },
      ],
    });
    expect(html).toContain('Customer requested future delivery date: 2');
    expect(html).toContain('<title>Customer requested future delivery date: 2</title>');
    expect(html).toContain('<th scope="row">Customer requested future delivery date</th>');
    expect(html).toContain('<th scope="col">Reason</th>');
    expect(html).toContain('>Requested…</text>');
  });

  it('names the table column Day by default', () => {
    expect(render()).toContain('<th scope="col">Day</th>');
  });

  it('shows compact value labels but keeps full figures in the summary, titles and table', () => {
    const html = render({
      data: [
        { label: 'a', value: 12345600 },
        { label: 'b', value: 500 },
      ],
      format: (n) => `INR ${n}`,
      formatLabel: (n) => `~${n}`,
    });
    expect(html).toContain('>~12345600</text>');
    expect(html).toContain('INR 12345600');
    expect(html).toContain('<td>INR 12345600</td>');
    expect(html).not.toContain('>INR 12345600</text>');
  });

  it('thins value and axis labels when they would overlap, and keeps the latest day', () => {
    const days = Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1} Nov`, value: 12345600 + i }));
    const html = render({ data: days, formatLabel: (n) => `₹${n}` });
    const valueLabels = html.match(/data-value-label=/g)!.length;
    expect(valueLabels).toBeGreaterThan(2);
    expect(valueLabels).toBeLessThan(15);
    expect(html).toContain('data-value-label="30 Nov"');
    expect(html.match(/>\d+ Nov<\/text>/g)!.length).toBeLessThan(15);
    // Every bar and every table row is still there.
    expect(html.match(/data-bar=/g)).toHaveLength(30);
    expect(html.match(/<tr>/g)).toHaveLength(31);
  });

  it('caps the width of a single bar', () => {
    const html = render({ data: [{ label: 'Only', value: 5 }] });
    const d = html.match(/data-bar="Only" d="([^"]+)"/)![1]!;
    const left = Number(d.match(/^M([\d.]+) /)![1]);
    const right = Number(d.match(/H[\d.]+Q([\d.]+) /)![1]);
    expect(right - left).toBeLessThanOrEqual(28);
    expect(right - left).toBeGreaterThan(10);
  });

  it('draws NaN, negative and infinite values as empty bars', () => {
    const data = [
      { label: 'a', value: Number.NaN },
      { label: 'b', value: -5 },
      { label: 'c', value: Number.POSITIVE_INFINITY },
      { label: 'd', value: 3 },
    ];
    const html = render({ data });
    expect(html).not.toMatch(/NaN|Infinity|-5/);
    expect(html.match(/data-bar=/g)).toHaveLength(4);
    expect(chartSummary('x', data)).toBe('x. a: 0, b: 0, c: 0, d: 3. Highest: d, 3.');
  });
});
