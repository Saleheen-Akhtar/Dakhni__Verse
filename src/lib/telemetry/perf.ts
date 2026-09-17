/**
 * Structured query performance telemetry utility.
 * Times query executions without altering payloads or blocking execution.
 */
export async function measureQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round((performance.now() - start) * 10) / 10;
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_PERF_LOGS === 'true') {
      console.log(`[perf:${name}] ${duration}ms`);
    }
    return result;
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    const duration = Math.round((performance.now() - start) * 10) / 10;
    console.error(`[perf:${name}:error] ${duration}ms`, error);
    throw error;
  }
}
