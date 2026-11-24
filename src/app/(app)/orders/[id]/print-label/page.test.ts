import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ShipmentLabel } from '@/lib/label/data';

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => ({ email: 'a@b.co', role: 'admin' }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh() {} }),
  notFound: () => {
    throw new Error('not found');
  },
  redirect: () => {
    throw new Error('redirect');
  },
}));

const label: ShipmentLabel = {
  awb: 'EVS8516979039',
  carrier_awb: '71705910000055',
  invoice_number: 'EVL/26-27/8516979039',
  invoice_date: '2026-11-24T09:56:05.150Z',
  reference_id: 'ORD-1042',
  merchant_name: 'Asha Mart',
  origin: {
    name: 'Asha Mart Warehouse',
    phone: '9876543210',
    line1: 'Plot 42, Electronic City Phase 1',
    line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
  },
  destination: {
    name: 'Ravi Kumar',
    phone: '9823456789',
    line1: 'Flat 12, Sunrise Apartments, Linking Road',
    line2: 'Near Khar station',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400052',
  },
  weight_kg: 0.75,
  dimensions: { length_cm: 20, width_cm: 15, height_cm: 8 },
  items: [
    { name: 'Ceramic coffee mug, 350 ml', quantity: 2, unit_price: 399 },
    { name: 'Coaster set', quantity: 1, unit_price: 249 },
  ],
  payment_type: 'COD',
  cod_amount: 1047,
};

let result: unknown = { ok: true, source: 'gateway', data: label };
vi.mock('@/lib/label/data', () => ({
  LABEL_COMPANY: 'Evoc Labs Pvt Ltd',
  shipmentLabel: async () => result,
}));

const { default: PrintLabelPage } = await import('./page');
const render = async () =>
  renderToStaticMarkup(await PrintLabelPage({ params: Promise.resolve({ id: 'EVS8516979039' }) }));

describe('Evoc shipping label', () => {
  it('prints Evoc Labs Pvt Ltd, our invoice number, the buyer, COD and both barcodes, and no courier name', async () => {
    const html = await render();
    expect(html).toContain('Evoc Labs Pvt Ltd');
    expect(html).toContain('EVL/26-27/8516979039');
    expect(html).toContain('Ravi Kumar');
    expect(html).toContain('PIN 400052');
    expect(html).toContain('₹1,047');
    expect(html).toContain('aria-label="Courier AWB: 71705910000055"');
    expect(html).toContain('aria-label="Evoc AWB: EVS8516979039"');
    expect(html).toContain('Sold by Asha Mart');
    expect(html).not.toMatch(/delhivery|ekart|shadowfax/i);
    if (process.env.LABEL_PREVIEW) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(process.env.LABEL_PREVIEW, html);
    }
  });

  it('says PREPAID with no amount to collect', async () => {
    result = { ok: true, source: 'gateway', data: { ...label, payment_type: 'PREPAID', cod_amount: 0 } };
    const html = await render();
    expect(html).toContain('PREPAID');
    expect(html).not.toContain('>COD<');
    result = { ok: true, source: 'gateway', data: label };
  });

  it('explains a label that is not ready instead of printing one', async () => {
    result = {
      ok: false,
      source: 'gateway',
      error: { kind: 'conflict', message: 'The label is ready once the courier has booked the shipment.' },
    };
    const html = await render();
    expect(html).toContain('The label is ready once the courier has booked the shipment.');
    expect(html).not.toContain('shipping-label');
    result = { ok: true, source: 'gateway', data: label };
  });
});
