import { mockNdrService } from './mock';

export * from './types';

export function ndrService() {
  // Backend gateway has no NDR routes; always serves mock with Sample data badge
  return mockNdrService;
}

