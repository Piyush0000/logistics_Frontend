'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDemoSession } from '@/lib/auth/session';
import type { ApiError } from '@/lib/gateway/errors';
import type { DataResult } from '@/lib/data/source';
import {
  webhookService,
  type ActionResult,
  type Webhook,
  type WebhookFieldErrors,
} from '@/lib/data/webhooks';
import { parseWebhookInput } from '@/lib/data/webhooks/input';

const PAGE_PATH = '/channel-integrations';
const SIGN_IN_AGAIN = 'Sign in again to continue.';
const BAD_ID = 'This item could not be found.';

const isId = (id: unknown): id is string => z.string().uuid().safeParse(id).success;

function fieldErrors(error: ApiError): WebhookFieldErrors | undefined {
  const fields: WebhookFieldErrors = {};
  for (const { path, message } of error.issues ?? []) {
    if (path === 'url' || path === 'events') fields[path] = message;
  }
  return Object.keys(fields).length ? fields : undefined;
}

function fromResult<T, R>(result: DataResult<T>, data: (value: T) => R): ActionResult<R> {
  if (result.ok) {
    revalidatePath(PAGE_PATH);
    return { ok: true, data: data(result.data) };
  }
  if (result.error.kind === 'unauthorized') return { ok: false, message: SIGN_IN_AGAIN };

  const fields = fieldErrors(result.error);
  return { ok: false, message: result.error.message, ...(fields ? { fieldErrors: fields } : {}) };
}

// Server actions can be called directly, so each one checks the session itself.

export async function createWebhookAction(input: unknown): Promise<ActionResult<{ secret: string }>> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = parseWebhookInput(input);
  if (!parsed.ok) {
    return { ok: false, message: 'Some fields need attention.', fieldErrors: parsed.fieldErrors };
  }

  return fromResult(await webhookService().create(parsed.data), ({ secret }) => ({ secret }));
}

export async function updateWebhookAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<Webhook>> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (!isId(id)) return { ok: false, message: BAD_ID };

  const parsed = parseWebhookInput(input);
  if (!parsed.ok) {
    return { ok: false, message: 'Some fields need attention.', fieldErrors: parsed.fieldErrors };
  }

  return fromResult(await webhookService().update(id, parsed.data), (webhook) => webhook);
}

export async function deleteWebhookAction(id: unknown): Promise<ActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (!isId(id)) return { ok: false, message: BAD_ID };

  return fromResult(await webhookService().remove(id), () => undefined);
}

export async function retryDeliveryAction(id: unknown): Promise<ActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (!isId(id)) return { ok: false, message: BAD_ID };

  return fromResult(await webhookService().retryDelivery(id), () => undefined);
}
