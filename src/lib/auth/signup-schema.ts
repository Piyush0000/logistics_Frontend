import { z } from 'zod';
import { emailSchema } from './login-schema';

/** Shared by the form and the server action. The upper bounds keep a public action from forwarding unbounded input. */
export const companySchema = z
  .string()
  .trim()
  .min(2, 'Enter your company name (2 to 80 characters).')
  .max(80, 'Enter your company name (2 to 80 characters).');

export const personNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name.')
  .max(80, 'Use 80 characters or fewer for your name.');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, 'Enter a phone number of 10 to 15 digits.');

export const newPasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Use 128 characters or fewer.');

export const signupSchema = z.object({
  company: companySchema,
  name: personNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: newPasswordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
