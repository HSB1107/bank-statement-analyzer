/** Helpers for mock adapters: simulated latency and failure injection. */
export interface MockRuntimeOptions {
  latencyMs?: readonly [number, number];
  /** Probability [0..1] of a simulated transient failure. */
  failureRate?: number;
  /** Deterministic random for tests; defaults to Math.random. */
  random?: () => number;
}

export class MockServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockServiceError";
  }
}

export function createMockRuntime(options: MockRuntimeOptions = {}) {
  const { latencyMs = [180, 520], failureRate = 0, random = Math.random } = options;
  return {
    async delay(): Promise<void> {
      const [min, max] = latencyMs;
      const ms = min + random() * (max - min);
      if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    },
    maybeFail(operation: string): void {
      if (failureRate > 0 && random() < failureRate) {
        throw new MockServiceError(`Simulated network error during ${operation}. Retry to continue.`);
      }
    },
    sleep(ms: number): Promise<void> {
      return new Promise((r) => setTimeout(r, ms));
    },
  };
}
export type MockRuntime = ReturnType<typeof createMockRuntime>;
