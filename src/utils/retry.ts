type RetryOptions = {
  retries?: number;
  delayMs?: number;
};

function wait(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export async function retry<T>(
  action: () => Promise<T>,
  { retries = 2, delayMs = 300 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      await wait(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}
