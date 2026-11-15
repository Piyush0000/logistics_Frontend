import type { DataResult } from '../source';

export interface SignedInUser {
  email: string;
}

export interface OtpRequest {
  /** Shown on screen in demo mode. A real service sends the code by email instead. */
  demoCode?: string;
}

export interface PasswordResetRequest {
  /** True when no email is sent, because the service is a demo. */
  demo: boolean;
}

export interface SignUpInput {
  company: string;
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface SessionService {
  requestOtp(email: string): Promise<DataResult<OtpRequest>>;
  verifyOtp(email: string, code: string): Promise<DataResult<SignedInUser>>;
  signInWithPassword(email: string, password: string): Promise<DataResult<SignedInUser>>;
  /** Never stores or returns the password in demo mode. */
  signUp(input: SignUpInput): Promise<DataResult<SignedInUser>>;
  /** Answers the same way whether or not the account exists, so it never reveals which emails are registered. */
  requestPasswordReset(email: string): Promise<DataResult<PasswordResetRequest>>;
}
