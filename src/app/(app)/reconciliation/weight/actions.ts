'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDemoSession } from '@/lib/auth/session';
import type { DataResult } from '@/lib/data/source';
import { checkDispute, weightService } from '@/lib/data/weight';
import type { WeightDiscrepancy } from '@/lib/data/weight';

export type WeightActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const SIGN_IN_AGAIN = 'Sign in again.';

// Only these fields are kept, so file contents sent by mistake never reach the service.
const DisputeSchema = z.object({
  id: z.string().min(1).max(100),
  note: z.string(),
  evidence: z.array(
    z.object({
      name: z.string().max(255),
      type: z.string().max(100),
      size: z.number().finite(),
    }),
  ),
});

function answer(result: DataResult<WeightDiscrepancy>, done: string): WeightActionResult {
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message,
    };
  }
  revalidatePath('/reconciliation/weight');
  return { ok: true, message: `${done} ${result.data.awb}.` };
}

// Server actions can be called directly, so each one checks the session itself.
export async function acceptDiscrepancyAction(id: unknown): Promise<WeightActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (typeof id !== 'string' || id === '' || id.length > 100) {
    return { ok: false, message: 'Choose a discrepancy to accept.' };
  }
  return answer(await weightService().accept(id), 'Charge accepted for');
}

export async function disputeDiscrepancyAction(input: unknown): Promise<WeightActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = DisputeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the note and images, then try again.' };

  const dispute = { ...parsed.data, note: parsed.data.note.trim() };
  const problem = checkDispute(dispute);
  if (problem) return { ok: false, message: problem };

  return answer(await weightService().dispute(dispute), 'Dispute sent for');
}
