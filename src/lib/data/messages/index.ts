import 'server-only';

import { resolveDataSource } from '../source';
import { gatewayMessagesService } from './gateway';
import { mockMessagesService } from './mock';
import type { MessagesService } from './types';

export * from './types';

export function messagesService(): MessagesService {
  return resolveDataSource('messages') === 'gateway' ? gatewayMessagesService : mockMessagesService;
}
