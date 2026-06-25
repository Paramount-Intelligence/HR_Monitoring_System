import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { isWebPushSupported, urlBase64ToUint8Array } from './web-push.ts';

describe('isWebPushSupported', () => {
  it('returns false in Node test environment without browser APIs', () => {
    assert.equal(isWebPushSupported(), false);
  });
});

describe('urlBase64ToUint8Array', () => {
  beforeEach(() => {
    globalThis.window = {
      atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
    } as unknown as Window & typeof globalThis;
  });

  it('converts URL-safe base64 VAPID public key to Uint8Array', () => {
    const sample =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    const bytes = urlBase64ToUint8Array(sample);
    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.length > 0);
  });

  it('handles padding for keys without trailing equals', () => {
    const padded = urlBase64ToUint8Array('YQ');
    assert.equal(padded.length, 1);
    assert.equal(padded[0], 97);
  });

  it('produces bytes suitable for PushManager applicationServerKey', () => {
    const vapidPublicKey =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    const bytes = urlBase64ToUint8Array(vapidPublicKey);
    assert.equal(bytes.length, 65);
  });
});

describe('web push security', () => {
  it('does not embed private VAPID key in helper module source', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const filePath = path.join(process.cwd(), 'src/lib/notifications/web-push.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    assert.equal(source.includes('VAPID_PRIVATE_KEY'), false);
    assert.equal(source.includes('private_key'), false);
  });
});
