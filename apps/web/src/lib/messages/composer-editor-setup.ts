import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { sanitizeMessageHtml } from '@/lib/messages/message-sanitize';

export const ShiftEnterHardBreak = Extension.create({
  name: 'shiftEnterHardBreak',
  addKeyboardShortcuts() {
    return {
      'Shift-Enter': () => this.editor.commands.setHardBreak(),
    };
  },
});

/** Minimal extensions for list-toggle integration tests (no Placeholder DOM plugins). */
export function createComposerListTestExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      horizontalRule: false,
      codeBlock: false,
      link: false,
      underline: false,
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
      listItem: {},
    }),
    Underline,
  ];
}

/** Shared TipTap extensions for the message composer. */
export function createComposerExtensions(placeholder = 'Write a message…') {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      horizontalRule: false,
      codeBlock: false,
      link: false,
      underline: false,
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
      listItem: {},
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
    ShiftEnterHardBreak,
  ];
}

export function createComposerEditorProps(onSubmit?: () => void) {
  return {
    attributes: {
      class:
        'message-rich-body focus:outline-none min-h-[72px] px-3 py-2 text-sm text-[var(--text-primary)]',
    },
    transformPastedHTML(html: string) {
      return sanitizeMessageHtml(html);
    },
    handleKeyDown(view: import('@tiptap/pm/view').EditorView, event: KeyboardEvent) {
      if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
        const { $from } = view.state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name === 'listItem') {
            return false;
          }
        }
        event.preventDefault();
        onSubmit();
        return true;
      }
      return false;
    },
  };
}
