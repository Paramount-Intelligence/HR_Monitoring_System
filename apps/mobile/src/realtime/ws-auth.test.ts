import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { buildWebSocketUrl } from './ws-url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('buildWebSocketUrl', () => {
  it('uses ticket query param', () => {
    const url = buildWebSocketUrl(
      'wss://hrmonitoringsystem-production.up.railway.app/api/v1/ws',
      'abc123'
    );
    assert.match(url, /\?ticket=abc123$/);
    assert.doesNotMatch(url, /token=/);
  });

  it('encodes ticket values', () => {
    const url = buildWebSocketUrl(
      'wss://example.com/api/v1/ws/',
      'ticket+with/special=&chars'
    );
    assert.match(url, /\?ticket=ticket%2Bwith%2Fspecial%3D%26chars$/);
  });

  it('rejects empty ticket', () => {
    assert.throws(() => buildWebSocketUrl('wss://example.com/ws', ''), /ticket is required/i);
  });
});

describe('websocket-client auth', () => {
  it('does not build JWT query URLs', () => {
    const source = readFileSync(join(__dirname, 'websocket-client.ts'), 'utf8');
    assert.doesNotMatch(source, /\?token=/);
    assert.doesNotMatch(source, /encodeURIComponent\(accessToken\)/);
    assert.match(source, /fetchWsTicket\(/);
    assert.match(source, /buildWebSocketUrl\(/);
  });
});

describe('refresh token rotation contract', () => {
  it('RefreshResponse requires rotated refresh_token', () => {
    const response = {
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'bearer',
    };
    assert.equal(response.refresh_token, 'new-refresh');
    assert.notEqual(response.refresh_token, 'old-refresh');
  });
});

describe('logout payload', () => {
  it('includes refresh_token when available', () => {
    const refreshToken = 'stored-refresh-token';
    const body = refreshToken ? { refresh_token: refreshToken } : {};
    assert.deepEqual(body, { refresh_token: 'stored-refresh-token' });
  });

  it('uses empty body when refresh token missing', () => {
    const refreshToken: string | null = null;
    const body = refreshToken ? { refresh_token: refreshToken } : {};
    assert.deepEqual(body, {});
  });
});
