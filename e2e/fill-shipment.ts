import type { Page } from '@playwright/test';

/** Fills the Create Shipment form the way a person would; the form starts empty. */
export async function fillShipmentForm(page: Page, values: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    origin_name: 'Test Warehouse',
    origin_phone: '9876543210',
    origin_pincode: '560100',
    origin_line1: 'Plot 42, Electronic City',
    origin_city: 'Bengaluru',
    origin_state: 'Karnataka',
    destination_name: 'Test Buyer',
    destination_phone: '9823456789',
    destination_pincode: '400050',
    destination_line1: '102 Hill Road',
    destination_city: 'Mumbai',
    destination_state: 'Maharashtra',
    weight_kg: '0.5',
    length_cm: '15',
    width_cm: '10',
    height_cm: '5',
    item_name: 'Test item',
    item_unit_price: '1999',
    ...values,
  };
  for (const [name, value] of Object.entries(fields)) {
    const field = page.locator(`[name="${name}"]`);
    // A saved pickup address may already fill the pickup fields.
    if ((await field.inputValue()) === '') await field.fill(value);
  }
}
