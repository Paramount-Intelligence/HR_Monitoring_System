/** Debug logging flags — off in production unless explicitly enabled. */

export function isDebugApi(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_API === 'true';
}

export function isDebugAuth(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';
}

export function isDebugWs(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_WS === 'true';
}

export function isDebugMessages(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_MESSAGES === 'true';
}

export function isDebugCalls(): boolean {
  return process.env.NEXT_PUBLIC_CALL_DEBUG === 'true';
}
