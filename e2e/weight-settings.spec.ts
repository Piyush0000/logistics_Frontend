import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const SETTINGS = '/reconciliation/weight-settings';
const LONG_NAME = 'Extra long fragile ceramics carton set 4';
const SEED_DEFAULT = 'Medium box';

// The sample store is shared by the desktop and phone runs, which can run at the same time. Every
// test that changes it creates a preset with its own project's name, works only on that row and
// deletes it again. Only the default test moves the default, so it runs on desktop alone.
const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';

const rows = (page: Page, project: string) =>
  project === 'phone' ? page.getByTestId('preset-item') : page.getByTestId('preset-row');

const rowFor = (page: Page, project: string, name: string) =>
  rows(page, project).filter({ hasText: name });

async function open(page: Page, route = SETTINGS) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'Weight settings' })).toBeVisible();
}

async function fillPreset(
  page: Page,
  values: { name?: string; length?: string; width?: string; height?: string; weight?: string },
) {
  const dialog = page.getByRole('dialog', { name: /package preset/ });
  if (values.name !== undefined) await dialog.getByLabel('Name').fill(values.name);
  if (values.length !== undefined) await dialog.getByLabel('Length (cm)').fill(values.length);
  if (values.width !== undefined) await dialog.getByLabel('Width (cm)').fill(values.width);
  if (values.height !== undefined) await dialog.getByLabel('Height (cm)').fill(values.height);
  if (values.weight !== undefined) await dialog.getByLabel('Weight (kg)').fill(values.weight);
  return dialog;
}

/** Adds a preset through the form and waits for its row. */
async function addPreset(page: Page, project: string, name: string, weight = '1') {
  await page.getByRole('button', { name: 'Add preset' }).click();
  const dialog = await fillPreset(page, { name, length: '30', width: '20', height: '10', weight });
  await dialog.getByRole('button', { name: 'Save preset' }).click();
  await expect(dialog).toBeHidden();
  await expect(rowFor(page, project, name)).toBeVisible();
}

async function deletePreset(page: Page, project: string, name: string) {
  await rowFor(page, project, name).getByRole('button', { name: `Delete ${name}` }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete preset' });
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(rowFor(page, project, name)).toHaveCount(0);
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, SETTINGS);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);

  await expect(page.getByTestId('presets-card').getByText('Sample data')).toBeVisible();
  await expect(page.getByText(/default preset can.t be deleted/i)).toBeVisible();
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await expectNoSidewaysScroll(page, SIZES);
});

test('wraps long values', async ({ page }, testInfo) => {
  await open(page);
  await expect(rowFor(page, projectOf(testInfo), LONG_NAME)).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('ignores bad URL input', async ({ page }, testInfo) => {
  const long = 'x'.repeat(300);
  await signIn(page);
  for (const query of ['page=abc', 'page=-1', 'status=FOO', `q=${long}`]) {
    await page.goto(`${SETTINGS}?${query}`);
    await expect(rows(page, projectOf(testInfo)).first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  }
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await open(page);
  const row = rowFor(page, 'phone', 'Small pouch');

  await expectTapTargets(page, [
    page.getByRole('button', { name: 'Add preset' }),
    row.getByRole('button', { name: /^Edit/ }),
    row.getByRole('button', { name: /^Delete/ }),
  ]);

  await page.getByRole('button', { name: 'Add preset' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add package preset' });
  await expectTapTargets(page, [
    dialog.getByLabel('Name'),
    dialog.getByLabel('Length (cm)'),
    dialog.getByLabel('Width (cm)'),
    dialog.getByLabel('Height (cm)'),
    dialog.getByLabel('Weight (kg)'),
    dialog.locator('label', { hasText: 'Make this the default preset' }),
    dialog.getByRole('button', { name: 'Save preset' }),
    dialog.getByRole('button', { name: 'Cancel' }),
  ]);
  const fontSizes = await dialog
    .locator('input[type="text"], input[type="number"]')
    .evaluateAll((inputs) => inputs.map((el) => getComputedStyle(el).fontSize));
  for (const size of fontSizes) expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
});

test.describe('preset list', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the columns on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop table only');
    const table = page.getByRole('table', { name: 'Package presets' });

    for (const heading of ['Name', 'Size', 'Weight', 'Chargeable weight', 'Default', 'Action']) {
      await expect(table.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
    }
  });

  test('shows size, weight and chargeable weight for a preset', async ({ page }, testInfo) => {
    const row = rowFor(page, projectOf(testInfo), 'Small pouch');

    await expect(row).toContainText('20 × 15 × 5 cm');
    await expect(row).toContainText('0.3 kg');
    // 20 x 15 x 5 is 1500 cm3, so 0.3 kg volumetric against 0.3 kg actual.
    await expect(row).toContainText('0.3 kg');
    const medium = rowFor(page, projectOf(testInfo), SEED_DEFAULT);
    await expect(medium).toContainText('30 × 20 × 10 cm');
    await expect(medium).toContainText('1.2 kg');
  });

  test('marks one preset as the default', async ({ page }, testInfo) => {
    await expect(rows(page, projectOf(testInfo)).filter({ hasText: 'Default' })).toHaveCount(1);
  });
});

test.describe('add and edit', () => {
  test('updates the chargeable weight as dimensions change', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Add preset' }).click();
    const dialog = await fillPreset(page, { length: '30', width: '20', height: '10', weight: '0.5' });
    const preview = dialog.getByTestId('chargeable-preview');

    await expect(preview).toContainText('1.2 kg');
    await expect(preview).toContainText('Volumetric 1.2 kg');
    await expect(preview).toContainText('Actual 0.5 kg');

    await dialog.getByLabel('Height (cm)').fill('20');
    await expect(preview).toContainText('Volumetric 2.4 kg');
    await expect(preview).toContainText('2.4 kg');

    await dialog.getByLabel('Weight (kg)').fill('3');
    await expect(preview).toContainText('Chargeable weight 3 kg');

    // Until every size is a number there is nothing to work out.
    await dialog.getByLabel('Length (cm)').fill('');
    await expect(preview).toContainText('Enter the size and weight');
  });

  test('adds a preset', async ({ page }, testInfo) => {
    const project = projectOf(testInfo);
    const name = `Added ${project}`;
    await open(page);

    await addPreset(page, project, name, '0.5');
    const row = rowFor(page, project, name);
    await expect(row).toContainText('30 × 20 × 10 cm');
    await expect(row).toContainText('1.2 kg');
    await expect(row).not.toContainText('Default');

    await deletePreset(page, project, name);
  });

  test('edits a preset', async ({ page }, testInfo) => {
    const project = projectOf(testInfo);
    const name = `Edited ${project}`;
    await open(page);
    await addPreset(page, project, name);

    await rowFor(page, project, name).getByRole('button', { name: `Edit ${name}` }).click();
    const dialog = await fillPreset(page, { name: `${name} v2`, weight: '5' });
    await expect(page.getByRole('dialog', { name: 'Edit package preset' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Save preset' }).click();
    await expect(dialog).toBeHidden();

    const row = rowFor(page, project, `${name} v2`);
    await expect(row).toContainText('5 kg');
    await expect(rowFor(page, project, `${name} v2`)).toHaveCount(1);

    await deletePreset(page, project, `${name} v2`);
  });

  test('shows what is wrong with the fields', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Add preset' }).click();
    const dialog = await fillPreset(page, {
      name: 'a'.repeat(41),
      length: '0',
      width: '501',
      height: '10',
      weight: '0.05',
    });
    await dialog.getByRole('button', { name: 'Save preset' }).click();

    await expect(dialog.getByText('Name must be at most 40 characters.')).toBeVisible();
    await expect(dialog.getByText('Length must be at least 1 cm.')).toBeVisible();
    await expect(dialog.getByText('Width must be at most 500 cm.')).toBeVisible();
    await expect(dialog.getByText('Weight must be at least 0.1 kg.')).toBeVisible();
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Name').fill('   ');
    await dialog.getByRole('button', { name: 'Save preset' }).click();
    await expect(dialog.getByText('Enter a name.')).toBeVisible();
  });
});

test.describe('delete', () => {
  test('asks first and keeps the preset on cancel', async ({ page }, testInfo) => {
    const project = projectOf(testInfo);
    const name = `Cancel ${project}`;
    await open(page);
    await addPreset(page, project, name);

    await rowFor(page, project, name).getByRole('button', { name: `Delete ${name}` }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete preset' });
    await expect(confirm).toContainText(name);
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toBeHidden();
    await expect(rowFor(page, project, name)).toBeVisible();

    await deletePreset(page, project, name);
  });
});

test('keeps exactly one default preset', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Moves the shared default, so it runs once, on desktop');
  const project = 'desktop';
  const name = 'Fallback candidate';
  await open(page);
  const defaults = rows(page, project).filter({ hasText: 'Default' });
  await expect(defaults).toHaveCount(1);
  await expect(defaults).toContainText(SEED_DEFAULT);

  // The default preset cannot be deleted while others exist.
  await rowFor(page, project, SEED_DEFAULT).getByRole('button', { name: `Delete ${SEED_DEFAULT}` }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete preset' });
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(confirm.getByRole('alert')).toContainText('Make another preset the default');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(rowFor(page, project, SEED_DEFAULT)).toBeVisible();

  // The default checkbox on the default preset is locked on. Buttons are looked up inside the
  // dialog by exact name: rows other tests add (such as "Cancel phone") carry "Edit Cancel ..."
  // buttons that a page-wide "Cancel" lookup would also match.
  const edit = page.getByRole('dialog', { name: 'Edit package preset' });
  await rowFor(page, project, SEED_DEFAULT).getByRole('button', { name: `Edit ${SEED_DEFAULT}` }).click();
  await expect(edit.getByLabel('Make this the default preset')).toBeDisabled();
  await edit.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(edit).toBeHidden();

  // A new default takes the label from the old one.
  await page.getByRole('button', { name: 'Add preset' }).click();
  const dialog = await fillPreset(page, { name, length: '10', width: '10', height: '10', weight: '1' });
  await dialog.getByLabel('Make this the default preset').check();
  await dialog.getByRole('button', { name: 'Save preset' }).click();
  await expect(dialog).toBeHidden();
  await expect(defaults).toHaveCount(1);
  await expect(defaults).toContainText(name);
  await expect(rowFor(page, project, SEED_DEFAULT)).not.toContainText('Default');

  // Put the sample default back and remove the candidate.
  await rowFor(page, project, SEED_DEFAULT).getByRole('button', { name: `Edit ${SEED_DEFAULT}` }).click();
  await edit.getByLabel('Make this the default preset').check();
  await edit.getByRole('button', { name: 'Save preset', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(defaults).toContainText(SEED_DEFAULT);
  await expect(defaults).toHaveCount(1);
  await deletePreset(page, project, name);
});
