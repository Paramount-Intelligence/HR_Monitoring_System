/** Outgoing ring timeout should only end the call while still ringing (not after accept). */
export function shouldFireOutgoingRingTimeout(
  connectionStatus: string
): boolean {
  return connectionStatus === 'calling';
}
