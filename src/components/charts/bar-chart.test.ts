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
    expect(html).toContain('<table class="sr-only"');
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
});
