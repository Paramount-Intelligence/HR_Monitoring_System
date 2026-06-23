import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'a',
  'code',
  'pre',
  'span',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

/** Sanitize rich message HTML for storage and rendering. */
export function sanitizeMessageHtml(html: string): string {
  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
  });

  return cleaned.trim();
}

/** Plain text from HTML for previews and search. */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const cleaned = sanitizeMessageHtml(html);
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = cleaned;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }
  return cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True when sanitized HTML contains formatting beyond a single plain paragraph. */
export function hasRichFormatting(html: string, plainText: string): boolean {
  const sanitized = sanitizeMessageHtml(html);
  if (!sanitized) return false;
  const normalizedPlain = plainText.replace(/\s+/g, ' ').trim();
  if (!normalizedPlain) return false;
  if (/<(strong|b|em|i|u|s|ul|ol|li|code|pre|a)\b/i.test(sanitized)) {
    return true;
  }
  const plainFromHtml = htmlToPlainText(sanitized);
  return plainFromHtml !== normalizedPlain;
}

/** Detect legacy markdown/HTML-in-plain messages for backward-compatible rendering. */
export function looksLikeLegacyFormattedText(text: string): boolean {
  return (
    /\*\*[^*\n]+\*\*/.test(text) ||
    /(?<![*])\*[^*\n]+\*(?![*])/.test(text) ||
    /_[^_\n]+_/.test(text) ||
    /<u>[^<]*<\/u>/i.test(text) ||
    /`[^`\n]+`/.test(text) ||
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.test(text) ||
    /^-\s/m.test(text)
  );
}

/** Treat empty editor output as empty. */
export function isEmptyComposerHtml(html: string): boolean {
  const sanitized = sanitizeMessageHtml(html);
  if (!sanitized) return true;
  const text = htmlToPlainText(sanitized);
  return text.length === 0;
}
