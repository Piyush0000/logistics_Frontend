import { z } from 'zod';

/** Shared by the form and the server actions, so both apply the same rules. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your work email.')
  .email('Enter a valid work email.');

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code.');

export const passwordSchema = z.string().min(8, 'Use at least 8 characters.');
