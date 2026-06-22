import type { ConnectionStatus } from '@/lib/realtime/events';

export interface CallButtonState {
  canCall: boolean;
  disabledReason: string | null;
  hint: string | null;
}

export function getCallButtonState(params: {
  isDirect: boolean;
  isParticipant: boolean;
  isWebRtcSupported: boolean;
  hasActiveCall: boolean;
  realtimeConnected: boolean;
}): CallButtonState {
  if (!params.isDirect) {
    return {
      canCall: false,
      disabledReason: 'Calls are only available in direct messages',
      hint: null,
    };
  }
  if (!params.isParticipant) {
    return {
      canCall: false,
      disabledReason: 'Only conversation members can call',
      hint: null,
    };
  }
  if (!params.isWebRtcSupported) {
    return {
      canCall: false,
      disabledReason: 'Browser microphone/camera unavailable',
      hint: null,
    };
  }
  if (params.hasActiveCall) {
    return {
      canCall: false,
      disabledReason: 'Another call is active',
      hint: null,
    };
  }

  if (!params.realtimeConnected) {
    return {
      canCall: true,
      disabledReason: null,
      hint: 'Realtime disconnected — incoming alerts may be delayed',
    };
  }

  return { canCall: true, disabledReason: null, hint: null };
}

export function getCallButtonTitle(
  callType: 'voice' | 'video',
  state: CallButtonState
): string {
  if (state.disabledReason) return state.disabledReason;
  if (state.hint) return `${callType === 'voice' ? 'Voice' : 'Video'} call — ${state.hint}`;
  return callType === 'voice' ? 'Start voice call' : 'Start video call';
}

/** Accept errors after a successful accept API must end the call, not decline it. */
export function shouldAutoDeclineAfterAcceptError(acceptedOnServer: boolean): boolean {
  return !acceptedOnServer ? false : false;
}

export function resolveAcceptFailureAction(acceptedOnServer: boolean): 'local_reset' | 'end_call' {
  return acceptedOnServer ? 'end_call' : 'local_reset';
}

export type RealtimeConnectionStatus = ConnectionStatus;
