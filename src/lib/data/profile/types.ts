import type { DataResult } from '../source';

export interface Profile {
  name: string;
  email: string;
  phone: string;
}

/** What the form can change. The email comes from the session and is never sent. */
export type ProfileInput = Pick<Profile, 'name' | 'phone'>;

export interface ProfileService {
  getProfile(): Promise<DataResult<Profile>>;
  updateProfile(p: ProfileInput): Promise<DataResult<Profile>>;
  changePassword(current: string, next: string): Promise<DataResult<null>>;
}
