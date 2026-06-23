import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  shouldDeferSignalWhileRinging,
  shouldFireIncomingRingTimeout,
  shouldHandleCallAcceptedEvent,
  shouldProcessCalleeWebRtcSignal,
} from './call-guards';

describe('shouldHandleCallAcceptedEvent', () => {
  it('allows call_accepted only for outgoing caller', () => {
    assert.equal(
      shouldHandleCallAcceptedEvent({ isCaller: true, sessionId: 'abc', callId: 'abc' }),
      true
    );
    assert.equal(
      shouldHandleCallAcceptedEvent({ isCaller: false, sessionId: 'abc', callId: 'abc' }),
      false
    );
  });
});

describe('shouldProcessCalleeWebRtcSignal', () => {
  it('blocks offer/answer/ice for callee until user accepts', () => {
    assert.equal(
      shouldProcessCalleeWebRtcSignal({
        isCaller: false,
        userAcceptedIncoming: false,
        signalType: 'offer',
      }),
      false
    );
    assert.equal(
      shouldProcessCalleeWebRtcSignal({
        isCaller: false,
        userAcceptedIncoming: true,
        signalType: 'offer',
      }),
      true
    );
  });

  it('allows end signal while ringing', () => {
    assert.equal(
      shouldProcessCalleeWebRtcSignal({
        isCaller: false,
        userAcceptedIncoming: false,
        signalType: 'end',
      }),
      true
    );
  });
});

describe('shouldDeferSignalWhileRinging', () => {
  it('defers WebRTC signals during incoming phase', () => {
    assert.equal(shouldDeferSignalWhileRinging({ phase: 'incoming', signalType: 'offer' }), true);
    assert.equal(shouldDeferSignalWhileRinging({ phase: 'incoming', signalType: 'end' }), false);
    assert.equal(shouldDeferSignalWhileRinging({ phase: 'active', signalType: 'offer' }), false);
  });
});

describe('shouldFireIncomingRingTimeout', () => {
  it('fires only while still ringing on same session', () => {
    assert.equal(
      shouldFireIncomingRingTimeout({
        phase: 'incoming',
        sessionId: 'call-1',
        expectedSessionId: 'call-1',
      }),
      true
    );
    assert.equal(
      shouldFireIncomingRingTimeout({
        phase: 'active',
        sessionId: 'call-1',
        expectedSessionId: 'call-1',
      }),
      false
    );
  });
});
