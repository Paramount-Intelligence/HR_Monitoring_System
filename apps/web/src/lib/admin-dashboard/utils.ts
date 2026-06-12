/** Safe accessors for admin dashboard API payloads (snake_case from backend). */

export function safeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function pickSummary(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  return (data.summary as Record<string, unknown>) || {};
}
