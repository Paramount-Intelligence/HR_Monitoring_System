'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MessageBodyProps {
  text: string;
  isSelf?: boolean;
  className?: string;
}

type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'underline'; value: string };

const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
const CODE_PATTERN = /`([^`\n]+)`/;
const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/;
const ITALIC_PATTERN = /\*([^*\n]+)\*|_([^_\n]+)_/;
const UNDERLINE_PATTERN = /<u>([^<]*)<\/u>/;

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseInline(text: string): InlineNode[] {
  if (!text) return [];

  const patterns: Array<{ regex: RegExp; map: (match: RegExpMatchArray) => InlineNode }> = [
    { regex: CODE_PATTERN, map: m => ({ type: 'code', value: m[1] }) },
    { regex: LINK_PATTERN, map: m => ({ type: 'link', label: m[1], href: m[2] }) },
    { regex: BOLD_PATTERN, map: m => ({ type: 'bold', value: m[1] }) },
    { regex: UNDERLINE_PATTERN, map: m => ({ type: 'underline', value: m[1] }) },
    {
      regex: ITALIC_PATTERN,
      map: m => ({ type: 'italic', value: m[1] || m[2] }),
    },
  ];

  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest: { index: number; length: number; node: InlineNode } | null = null;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (!match || match.index === undefined) continue;
      const node = pattern.map(match);
      if (node.type === 'link' && !isSafeUrl(node.href)) continue;
      if (!earliest || match.index < earliest.index) {
        earliest = { index: match.index, length: match[0].length, node };
      }
    }

    if (!earliest) {
      nodes.push({ type: 'text', value: remaining });
      break;
    }

    if (earliest.index > 0) {
      nodes.push({ type: 'text', value: remaining.slice(0, earliest.index) });
    }
    nodes.push(earliest.node);
    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return nodes;
}

function renderInline(nodes: InlineNode[], isSelf: boolean, keyPrefix: string) {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case 'bold':
        return (
          <strong key={key} className="font-semibold">
            {node.value}
          </strong>
        );
      case 'italic':
        return (
          <em key={key} className="italic">
            {node.value}
          </em>
        );
      case 'underline':
        return (
          <span key={key} className="underline">
            {node.value}
          </span>
        );
      case 'code':
        return (
          <code
            key={key}
            className={cn(
              'rounded px-1 py-0.5 text-[0.85em] font-mono',
              isSelf ? 'bg-white/15 text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
            )}
          >
            {node.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline underline-offset-2',
              isSelf ? 'text-white hover:text-white/90' : 'text-[var(--accent-primary)] hover:opacity-90'
            )}
          >
            {node.label}
          </a>
        );
      default:
        return <span key={key}>{node.value}</span>;
    }
  });
}

/** Safely render lightweight markdown-style message text. */
export function MessageBody({ text, isSelf = false, className }: MessageBodyProps) {
  const lines = useMemo(() => text.split('\n'), [text]);

  return (
    <div className={cn('whitespace-pre-wrap break-words', className)}>
      {lines.map((line, lineIndex) => {
        const nodes = parseInline(line);
        const isBullet = line.startsWith('- ');
        const content = isBullet ? line.slice(2) : line;
        const inlineNodes = isBullet ? parseInline(content) : nodes;

        return (
          <div key={lineIndex} className={cn(isBullet && 'flex gap-2')}>
            {isBullet && (
              <span className={cn('select-none', isSelf ? 'text-white/80' : 'text-[var(--text-muted)]')}>
                •
              </span>
            )}
            <span>{renderInline(inlineNodes, isSelf, `line-${lineIndex}`)}</span>
          </div>
        );
      })}
    </div>
  );
}
