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

const EMPTY_LIST_ITEM_PATTERN =
  /<li>(?:\s|<br\s*\/?>|&nbsp;|<p>\s*<\/p>)*<\/li>/gi;

/** Remove accidental trailing empty list items before send/sanitize. */
export function stripEmptyComposerListArtifacts(html: string): string {
  if (!html) return html;

  let result = html;
  let changed = true;

  while (changed) {
    changed = false;
    result = result.replace(
      /(<(?:ul|ol)[^>]*>)([\s\S]*?)(<\/(?:ul|ol)>)/gi,
      (_match, open: string, body: string, close: string) => {
        let trimmed = body;
        let localChanged = false;
        while (EMPTY_LIST_ITEM_PATTERN.test(trimmed)) {
          EMPTY_LIST_ITEM_PATTERN.lastIndex = 0;
          const next = trimmed.replace(
            new RegExp(`${EMPTY_LIST_ITEM_PATTERN.source}$`, 'i'),
            ''
          );
          if (next === trimmed) break;
          trimmed = next;
          localChanged = true;
        }
        if (localChanged) changed = true;
        if (!/<li[\s>]/i.test(trimmed)) return '';
        return `${open}${trimmed}${close}`;
      }
    );
  }

  return result.replace(/<(?:ul|ol)[^>]*>\s*<\/(?:ul|ol)>/gi, '');
}

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
