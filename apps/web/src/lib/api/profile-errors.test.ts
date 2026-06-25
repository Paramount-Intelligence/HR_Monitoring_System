import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProfileLoadError } from './profile-errors.ts';

describe('classifyProfileLoadError', () => {
  it('maps network failures to connection guidance', () => {
    const result = classifyProfileLoadError({
      code: 'ERR_NETWORK',
      message: 'Network Error',
    });
    assert.equal(result.kind, 'network');
    assert.match(result.message, /Unable to reach the API server/);
  });

  it('maps 404 to profile not found', () => {
    const result = classifyProfileLoadError({
      response: { status: 404, data: { error: { message: 'User not found' } } },
    });
    assert.equal(result.kind, 'not_found');
    assert.equal(result.title, 'Profile Not Found');
  });

  it('maps 403 to access denied', () => {
    const result = classifyProfileLoadError({
      response: { status: 403, data: { error: { message: 'Forbidden' } } },
    });
    assert.equal(result.kind, 'forbidden');
    assert.equal(result.title, 'Access Denied');
  });

  it('maps 401 to session expired', () => {
    const result = classifyProfileLoadError({
      response: { status: 401, data: { error: { message: 'Invalid token' } } },
    });
    assert.equal(result.kind, 'unauthorized');
  });

  it('maps 500 to server error', () => {
    const result = classifyProfileLoadError({
      response: { status: 500, data: {} },
    });
    assert.equal(result.kind, 'server');
    assert.equal(result.title, 'Server Error');
  });
});
