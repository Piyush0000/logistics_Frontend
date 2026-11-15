/**
 * Runs tasks one at a time, in the order they were queued. A read, change and save that awaits in
 * between must go through one of these, or two overlapping requests would both read the old state
 * and the later save would undo the earlier one. This holds within one server process only: a real
 * backend has to enforce the same rule itself.
 */
export function createSerialQueue() {
  let queue: Promise<unknown> = Promise.resolve();
  return function inOrder<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };
}
