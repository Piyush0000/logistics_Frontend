import type { DataResult } from '../source';

/** Palette tokens only, so a merchant's choice can never break the colour or contrast rules. */
export type TrackingAccent = 'primary' | 'accent' | 'success';

export interface TrackingPageBranding {
  displayName: string;
  supportEmail: string;
  supportPhone: string;
  accent: TrackingAccent;
  showCourier: boolean;
  /** Only the name of the chosen logo is kept. Files are not uploaded yet. */
  logoName: string | null;
}

export interface TrackingPageService {
  get(): Promise<DataResult<TrackingPageBranding>>;
  save(b: TrackingPageBranding): Promise<DataResult<TrackingPageBranding>>;
}
