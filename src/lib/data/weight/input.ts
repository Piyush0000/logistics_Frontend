import { indianDay } from '../../format/date';
import type { EvidenceFile } from './types';

export const MIN_NOTE_LENGTH = 10;
export const MAX_NOTE_LENGTH = 1000;
export const MIN_EVIDENCE = 1;
export const MAX_EVIDENCE = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;

/**
 * True once `respondBy` (YYYY-MM-DD, Indian time) is before today in Indian time. The last day
 * itself is still open. `now` is a parameter so tests do not depend on the clock.
 */
export function isResponseWindowClosed(respondBy: string, now: Date = new Date()): boolean {
  // YYYY-MM-DD strings sort in date order.
  return respondBy < indianDay(now);
}

/** Null when the dispute is fine, else what to tell the merchant. Runs in the browser and on the server. */
export function checkDispute({
  note,
  evidence,
}: {
  note: string;
  evidence: readonly EvidenceFile[];
}): string | null {
  const length = note.trim().length;
  if (length < MIN_NOTE_LENGTH) return `Write a note of at least ${MIN_NOTE_LENGTH} characters.`;
  if (length > MAX_NOTE_LENGTH) return 'Keep the note to 1,000 characters or fewer.';
  if (evidence.length < MIN_EVIDENCE) return 'Add at least 1 image as evidence.';
  if (evidence.length > MAX_EVIDENCE) return `Add no more than ${MAX_EVIDENCE} images.`;
  for (const file of evidence) {
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return `${file.name} is not a JPG or PNG image.`;
    }
    if (file.size <= 0) return `${file.name} is empty.`;
    if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 5 MB.`;
  }
  return null;
}
