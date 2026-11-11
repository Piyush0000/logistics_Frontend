import { describe, expect, it } from 'vitest';
import { errorRouteEnabled } from './guard';

describe('errorRouteEnabled', () => {
  it('is off when the variable is missing, empty or anything but "on"', () => {
    expect(errorRouteEnabled({})).toBe(false);
    expect(errorRouteEnabled({ E2E_ERROR_ROUTE: '' })).toBe(false);
    expect(errorRouteEnabled({ E2E_ERROR_ROUTE: 'true' })).toBe(false);
    expect(errorRouteEnabled({ E2E_ERROR_ROUTE: 'off' })).toBe(false);
  });
  it('is on only for "on"', () => {
    expect(errorRouteEnabled({ E2E_ERROR_ROUTE: 'on' })).toBe(true);
  });
});
