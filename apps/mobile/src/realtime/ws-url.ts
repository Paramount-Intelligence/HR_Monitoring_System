/**
 * Build a WebSocket URL using a single-use ticket (never JWT query auth).
 */
export function buildWebSocketUrl(wsBaseUrl: string, ticket: string): string {
  const base = wsBaseUrl.replace(/\/$/, '');
  const trimmedTicket = ticket.trim();
  if (!trimmedTicket) {
    throw new Error('WebSocket ticket is required');
  }
  const url = `${base}?ticket=${encodeURIComponent(trimmedTicket)}`;
  if (url.includes('token=')) {
    throw new Error('JWT query auth is not supported');
  }
  return url;
}
