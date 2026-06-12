/**
 * Production-safe logging — only emits in __DEV__ builds.
 * Never pass tokens, Authorization headers, SDP, or secrets as message content.
 */
export function secureLog(tag: string, message: string): void {
  if (__DEV__) {
    console.log(`[${tag}] ${message}`);
  }
}

export function secureWarn(tag: string, message: string): void {
  if (__DEV__) {
    console.warn(`[${tag}] ${message}`);
  }
}
