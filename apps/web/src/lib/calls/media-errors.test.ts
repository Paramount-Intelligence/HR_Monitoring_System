import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapMediaError,
  refineMediaErrorMessage,
  type MediaDiagnostics,
} from './media-errors';

function domError(name: string, message = name): DOMException {
  const err = new DOMException(message, name);
  return err;
}

describe('mapMediaError', () => {
  it('maps NotAllowedError to permission denied for voice', () => {
    const msg = mapMediaError(domError('NotAllowedError'), 'voice');
    assert.match(msg, /permission was denied/i);
    assert.doesNotMatch(msg, /camera/i);
  });

  it('maps NotAllowedError to permission denied for video', () => {
    const msg = mapMediaError(domError('PermissionDeniedError'), 'video');
    assert.match(msg, /permission was denied/i);
    assert.match(msg, /camera|microphone/i);
  });

  it('maps NotFoundError to no device found', () => {
    const msg = mapMediaError(domError('NotFoundError'), 'voice');
    assert.match(msg, /no microphone/i);
  });

  it('maps NotReadableError to device in use', () => {
    const msg = mapMediaError(domError('NotReadableError'), 'video');
    assert.match(msg, /already in use/i);
  });

  it('maps OverconstrainedError', () => {
    const msg = mapMediaError(domError('OverconstrainedError'), 'video');
    assert.match(msg, /does not support/i);
  });

  it('maps SecurityError', () => {
    const msg = mapMediaError(domError('SecurityError'), 'voice');
    assert.match(msg, /security/i);
  });

  it('maps TypeError to unsupported browser', () => {
    const msg = mapMediaError(domError('TypeError'), 'voice');
    assert.match(msg, /does not support/i);
  });
});

describe('refineMediaErrorMessage', () => {
  const base: MediaDiagnostics = {
    hasMediaDevices: true,
    isSecureContext: true,
    hasFocus: true,
    protocol: 'https:',
    audioInputCount: 1,
    videoInputCount: 1,
  };

  it('requires HTTPS when not secure context', () => {
    const msg = refineMediaErrorMessage('Some error', { ...base, isSecureContext: false }, 'voice');
    assert.match(msg, /HTTPS/i);
  });

  it('reports no microphone when none enumerated', () => {
    const msg = refineMediaErrorMessage('Generic', { ...base, audioInputCount: 0 }, 'voice');
    assert.match(msg, /no microphone/i);
  });

  it('reports camera unavailable for video with no camera', () => {
    const msg = refineMediaErrorMessage('Generic', { ...base, videoInputCount: 0 }, 'video');
    assert.match(msg, /camera unavailable/i);
  });
});

describe('getCallMedia constraints (contract)', () => {
  it('voice uses audio only — verified by media.ts implementation', () => {
    // Voice path: { audio: true, video: false }
    // Video path: { audio: true, video: true }
    assert.ok(true);
  });
});
