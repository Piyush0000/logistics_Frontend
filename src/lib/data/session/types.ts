import type { DataResult } from '../source';

export interface SignedInUser {
  email: string;
}

export interface OtpRequest {
  /** Shown on screen in demo mode. A real service sends the code by email instead. */
  demoCode?: string;
}

export interface SessionService {
  requestOtp(email: string): Promise<DataResult<OtpRequest>>;
  verifyOtp(email: string, code: string): Promise<DataResult<SignedInUser>>;
  signInWithPassword(email: string, password: string): Promise<DataResult<SignedInUser>>;
}
