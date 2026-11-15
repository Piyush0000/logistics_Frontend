import 'server-only';

import { resolveDataSource } from '../source';
import { gatewaySessionService } from './gateway';
import { mockSessionService } from './mock';
import type { SessionService } from './types';

type Env = Record<string, string | undefined>;

/**
 * The demo sign-in accepts any email, so a production build refuses it unless ALLOW_DEMO_LOGIN
 * is "true". Set that only for a password-protected preview. Without it, sign-in reports that
 * it is unavailable instead of letting anyone in.
 */
export function sessionService(env: Env = process.env): SessionService {
  if (resolveDataSource('session', env) === 'gateway') return gatewaySessionService;
  if (env.NODE_ENV === 'production' && env.ALLOW_DEMO_LOGIN !== 'true') return gatewaySessionService;
  return mockSessionService;
}
