import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldFireOutgoingRingTimeout } from './call-timer-utils';

describe('shouldFireOutgoingRingTimeout', () => {
  it('fires only while ringing (calling)', () => {
    assert.equal(shouldFireOutgoingRingTimeout('calling'), true);
  });

  it('does not fire after callee accepts (connecting)', () => {
    assert.equal(shouldFireOutgoingRingTimeout('connecting'), false);
  });

  it('does not fire when connected', () => {
    assert.equal(shouldFireOutgoingRingTimeout('connected'), false);
  });
});
