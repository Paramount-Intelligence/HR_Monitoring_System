export type FormatAction = 'bold' | 'italic' | 'underline' | 'link' | 'list' | 'code';

export interface TextSelectionResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function insertAroundSelection(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  placeholder = ''
): TextSelectionResult {
  const selected = text.slice(selectionStart, selectionEnd);
  const content = selected || placeholder;
  const newValue =
    text.slice(0, selectionStart) + before + content + after + text.slice(selectionEnd);
  const newStart = selectionStart + before.length;
  const newEnd = newStart + content.length;

  if (!selected) {
    return { value: newValue, selectionStart: newStart, selectionEnd: newStart };
  }

  return { value: newValue, selectionStart: newStart, selectionEnd: newEnd };
}

export function insertAtCursor(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string
): TextSelectionResult {
  const newValue = text.slice(0, selectionStart) + insert + text.slice(selectionEnd);
  const cursor = selectionStart + insert.length;
  return { value: newValue, selectionStart: cursor, selectionEnd: cursor };
}

export function toggleLinePrefix(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string
): TextSelectionResult {
  const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineEndRaw = text.indexOf('\n', selectionEnd);
  const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
  const block = text.slice(lineStart, lineEnd);
  const lines = block.split('\n');

  const allPrefixed = lines.every(line => line.startsWith(prefix) || line === '');
  const updatedLines = lines.map(line => {
    if (!line) return prefix.trimEnd();
    if (allPrefixed && line.startsWith(prefix)) {
      return line.slice(prefix.length);
    }
    if (!allPrefixed && !line.startsWith(prefix)) {
      return prefix + line;
    }
    return line;
  });

  const updatedBlock = updatedLines.join('\n');
  const newValue = text.slice(0, lineStart) + updatedBlock + text.slice(lineEnd);
  const delta = updatedBlock.length - block.length;

  return {
    value: newValue,
    selectionStart: selectionStart + (allPrefixed ? -prefix.length : prefix.length),
    selectionEnd: selectionEnd + delta,
  };
}

export function handleFormattingAction(
  action: FormatAction,
  text: string,
  selectionStart: number,
  selectionEnd: number,
  linkUrl?: string
): TextSelectionResult {
  switch (action) {
    case 'bold':
      return insertAroundSelection(text, selectionStart, selectionEnd, '**', '**');
    case 'italic':
      if (selectionStart !== selectionEnd) {
        return insertAroundSelection(text, selectionStart, selectionEnd, '*', '*');
      }
      return insertAroundSelection(text, selectionStart, selectionEnd, '_', '_');
    case 'underline':
      return insertAroundSelection(text, selectionStart, selectionEnd, '<u>', '</u>');
    case 'link': {
      const selected = text.slice(selectionStart, selectionEnd);
      const label = selected || 'link text';
      const url = linkUrl?.trim() || 'url';
      return insertAroundSelection(text, selectionStart, selectionEnd, '[', `](${url})`, label);
    }
    case 'list':
      if (selectionStart === selectionEnd) {
        return insertAtCursor(text, selectionStart, selectionEnd, '- ');
      }
      return toggleLinePrefix(text, selectionStart, selectionEnd, '- ');
    case 'code':
      return insertAroundSelection(text, selectionStart, selectionEnd, '`', '`');
    default:
      return { value: text, selectionStart, selectionEnd };
  }
}

export function applyTextSelection(
  textarea: HTMLTextAreaElement | null,
  result: TextSelectionResult,
  setValue: (value: string) => void
) {
  setValue(result.value);
  requestAnimationFrame(() => {
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  });
}
