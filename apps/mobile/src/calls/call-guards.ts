/** Pure guards for mobile call state — unit-testable. */

export function shouldHandleCallAcceptedEvent(params: {
  isCaller: boolean;
  sessionId: string | undefined;
  callId: string;
}): boolean {
  if (!params.isCaller) return false;
  return Boolean(params.sessionId && params.sessionId === params.callId);
}

export function shouldProcessCalleeWebRtcSignal(params: {
  isCaller: boolean;
  userAcceptedIncoming: boolean;
  signalType: string;
}): boolean {
  if (params.isCaller) return true;
  if (params.signalType === 'end') return true;
  return params.userAcceptedIncoming;
}

export function shouldDeferSignalWhileRinging(params: {
  phase: string;
  signalType: string;
}): boolean {
  if (params.phase !== 'incoming') return false;
  return params.signalType !== 'end';
}

export function shouldFireIncomingRingTimeout(params: {
  phase: string;
  sessionId: string | undefined;
  expectedSessionId: string;
}): boolean {
  return params.phase === 'incoming' && params.sessionId === params.expectedSessionId;
}
