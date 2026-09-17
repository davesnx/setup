export type RetryConfig = { retryDelayMs?: number };

export async function waitBeforeRetry(
  config: RetryConfig,
  wait: (milliseconds: number) => Promise<void>,
): Promise<void> {
  const delay = config.retryDelayMs ?? 1000;
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError("retryDelayMs must be finite and nonnegative");
  }
  await wait(delay);
}
