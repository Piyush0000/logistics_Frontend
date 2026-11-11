import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serial';

describe('createSerialQueue', () => {
  it('runs overlapping tasks one after the other', async () => {
    const inOrder = createSerialQueue();
    const log: string[] = [];
    const slow = inOrder(async () => {
      log.push('a start');
      await new Promise((resolve) => setTimeout(resolve, 20));
      log.push('a end');
    });
    const fast = inOrder(async () => {
      log.push('b start');
      log.push('b end');
    });
    await Promise.all([slow, fast]);
    expect(log).toEqual(['a start', 'a end', 'b start', 'b end']);
  });

  it('keeps going after a task fails', async () => {
    const inOrder = createSerialQueue();
    const failed = inOrder(async () => {
      throw new Error('boom');
    });
    await expect(failed).rejects.toThrow('boom');
    await expect(inOrder(async () => 'next')).resolves.toBe('next');
  });
});
