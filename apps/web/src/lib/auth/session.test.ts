import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function installBrowserGlobals() {
  const store = new Map<string, string>();
  (globalThis as typeof globalThis & { localStorage: Storage }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;

  (globalThis as typeof globalThis & { window: Window & typeof globalThis }).window =
    globalThis as Window & typeof globalThis;
  (globalThis as typeof globalThis & { dispatchEvent: () => boolean }).dispatchEvent = () => true;
}

describe('auth session guards', () => {
  beforeEach(async () => {
    installBrowserGlobals();
    localStorage.clear();
    const session = await import('@/lib/auth/session');
    session.resetSessionState();
  });

  it('marks session expired and blocks protected fetch', async () => {
    const session = await import('@/lib/auth/session');
    localStorage.setItem('access_token', 'token');
    assert.equal(session.canFetchProtectedData(), true);

    session.markSessionExpired('test');
    session.markSessionExpired('test again');

    assert.equal(session.isSessionExpired(), true);
    assert.equal(session.canFetchProtectedData(), false);
    assert.equal(localStorage.getItem('access_token'), null);
  });

  it('marks session expired when refresh fails', async () => {
    const session = await import('@/lib/auth/session');
    localStorage.setItem('refresh_token', 'stale');

    const axios = await import('axios');
    const originalPost = axios.default.post;
    axios.default.post = (async () => {
      throw new Error('Unauthorized');
    }) as typeof axios.default.post;

    try {
      const token = await session.enqueueTokenRefresh();
      assert.equal(token, null);
      assert.equal(session.isSessionExpired(), true);
      assert.equal(localStorage.getItem('access_token'), null);
    } finally {
      axios.default.post = originalPost;
    }
  });
});

describe('avatar fallback cache', () => {
  it('remembers failed avatar URLs', async () => {
    const { isAvatarUrlFailed, markAvatarUrlFailed } = await import('@/lib/profile-picture');
    const url = '/media/profile-pictures/missing.jpg';
    assert.equal(isAvatarUrlFailed(url), false);
    markAvatarUrlFailed(url);
    assert.equal(isAvatarUrlFailed(url), true);
  });
});
