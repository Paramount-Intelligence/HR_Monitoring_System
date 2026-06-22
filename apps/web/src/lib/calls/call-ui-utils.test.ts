import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCallButtonState,
  getCallButtonTitle,
  resolveAcceptFailureAction,
  shouldAutoDeclineAfterAcceptError,
} from './call-ui-utils';

describe('getCallButtonState', () => {
  it('enables calls for valid DM member with WebRTC support', () => {
    const state = getCallButtonState({
      isDirect: true,
      isParticipant: true,
      isWebRtcSupported: true,
      hasActiveCall: false,
      realtimeConnected: true,
    });
    assert.equal(state.canCall, true);
    assert.equal(state.disabledReason, null);
  });

  it('disables with reason for non-direct conversations', () => {
    const state = getCallButtonState({
      isDirect: false,
      isParticipant: true,
      isWebRtcSupported: true,
      hasActiveCall: false,
      realtimeConnected: true,
    });
    assert.equal(state.canCall, false);
    assert.match(state.disabledReason ?? '', /direct messages/i);
  });

  it('still enables outbound calls when realtime is disconnected', () => {
    const state = getCallButtonState({
      isDirect: true,
      isParticipant: true,
      isWebRtcSupported: true,
      hasActiveCall: false,
      realtimeConnected: false,
    });
    assert.equal(state.canCall, true);
    assert.match(state.hint ?? '', /Realtime disconnected/i);
  });
});

describe('accept failure handling', () => {
  it('never auto-declines before server accept', () => {
    assert.equal(shouldAutoDeclineAfterAcceptError(false), false);
    assert.equal(resolveAcceptFailureAction(false), 'local_reset');
  });

  it('ends call after server accept instead of declining', () => {
    assert.equal(shouldAutoDeclineAfterAcceptError(true), false);
    assert.equal(resolveAcceptFailureAction(true), 'end_call');
  });
});

describe('getCallButtonTitle', () => {
  it('uses disabled reason when present', () => {
    const title = getCallButtonTitle('voice', {
      canCall: false,
      disabledReason: 'Another call is active',
      hint: null,
    });
    assert.equal(title, 'Another call is active');
  });
});
