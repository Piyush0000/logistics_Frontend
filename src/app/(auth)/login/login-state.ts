export type LoginState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'code_sent'; email: string; demoCode?: string };

export const IDLE: LoginState = { status: 'idle' };
