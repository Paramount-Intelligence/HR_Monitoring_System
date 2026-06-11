const EXP_BUFFER_SEC = 60;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAccessTokenExp(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === 'number' ? exp : null;
}

export function isTokenExpiringSoon(token: string, withinSeconds = EXP_BUFFER_SEC): boolean {
  const exp = getAccessTokenExp(token);
  if (!exp) return true;
  return exp * 1000 <= Date.now() + withinSeconds * 1000;
}

export async function ensureFreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  let token = localStorage.getItem('access_token');
  if (!token) return null;

  if (!isTokenExpiringSoon(token)) {
    return token;
  }

  console.log('[AUTH] access token expiring, refreshing');

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    window.dispatchEvent(new Event('auth:unauthorized'));
    return null;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error(`refresh failed status=${res.status}`);
    }

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    if (!data.access_token) {
      throw new Error('refresh response missing access_token');
    }

    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }

    return data.access_token;
  } catch {
    window.dispatchEvent(new Event('auth:unauthorized'));
    return null;
  }
}
