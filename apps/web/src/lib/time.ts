export const PK_TIME_ZONE = 'Asia/Karachi';

export function formatPKDate(dateInput: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PK_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date);
}

export function formatPKDateTime(dateInput: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PK_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(date);
}

export function todayPKInputValue() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
