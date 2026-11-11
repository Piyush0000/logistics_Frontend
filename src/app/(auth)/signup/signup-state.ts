export type SignupState = { status: 'idle' } | { status: 'error'; message: string };

export const IDLE: SignupState = { status: 'idle' };
