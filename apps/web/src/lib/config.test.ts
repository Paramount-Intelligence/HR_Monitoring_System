import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('runtime config', () => {
  it('uses NEXT_PUBLIC_API_URL when set', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api/v1';
    process.env.NODE_ENV = 'development';
    const { getApiBaseUrl } = await import(`./config.ts?api=${Date.now()}`);
    assert.equal(getApiBaseUrl(), 'https://api.example.com/api/v1');
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('defaults to /api/v1 in development when unset', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = 'development';
    const { getApiBaseUrl } = await import(`./config.ts?dev=${Date.now()}`);
    assert.equal(getApiBaseUrl(), '/api/v1');
  });

  it('derives websocket URL from absolute API URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api/v1';
    delete process.env.NEXT_PUBLIC_WS_URL;
    process.env.NODE_ENV = 'development';
    const { getWebSocketUrl } = await import(`./config.ts?ws=${Date.now()}`);
    assert.equal(getWebSocketUrl(), 'wss://api.example.com/api/v1/ws');
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('uses explicit NEXT_PUBLIC_WS_URL when provided', async () => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://api.example.com/api/v1/ws';
    process.env.NODE_ENV = 'development';
    const { getWebSocketUrl } = await import(`./config.ts?wsex=${Date.now()}`);
    assert.equal(getWebSocketUrl(), 'wss://api.example.com/api/v1/ws');
    delete process.env.NEXT_PUBLIC_WS_URL;
  });

  it('throws when APP_ENV is production and NEXT_PUBLIC_API_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.APP_ENV = 'production';
    process.env.NODE_ENV = 'production';
    const { getApiBaseUrl } = await import(`./config.ts?prod=${Date.now()}`);
    assert.throws(
      () => getApiBaseUrl(),
      /NEXT_PUBLIC_API_URL is required when APP_ENV=production/
    );
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'test';
  });

  it('rejects relative NEXT_PUBLIC_API_URL when APP_ENV is production', async () => {
    process.env.NEXT_PUBLIC_API_URL = '/api/v1';
    process.env.APP_ENV = 'production';
    process.env.NODE_ENV = 'production';
    const { getApiBaseUrl } = await import(`./config.ts?relative=${Date.now()}`);
    assert.throws(
      () => getApiBaseUrl(),
      /absolute URL when APP_ENV=production/
    );
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'test';
  });
});

describe('config security', () => {
  it('does not reference VAPID private key in frontend config module', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/config.ts'), 'utf8');
    assert.equal(source.includes('VAPID_PRIVATE_KEY'), false);
    assert.equal(source.includes('hrmonitoringsystem-production'), false);
    assert.equal(source.includes('pimsmonitoringsystem'), false);
  });
});
