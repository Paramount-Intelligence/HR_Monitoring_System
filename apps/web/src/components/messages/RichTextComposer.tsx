'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { ComposerFormattingToolbar } from '@/components/messages/ComposerFormattingToolbar';
import { sanitizeMessageHtml } from '@/lib/messages/message-sanitize';
import {
  getComposerActiveState,
  runComposerFormatAction,
  shouldSubmitComposerOnEnter,
  type ComposerFormatAction,
} from '@/lib/messages/composer-formatting';

export type { ComposerFormatAction };

export interface RichTextComposerHandle {
  focus: () => void;
  clear: () => void;
  isEmpty: () => boolean;
  getPlainText: () => string;
  getHtml: () => string;
  insertText: (text: string) => void;
}

interface RichTextComposerProps {
  placeholder?: string;
  disabled?: boolean;
  onUpdate?: (plainText: string) => void;
  onSubmit?: () => void;
  className?: string;
}

const ShiftEnterHardBreak = Extension.create({
  name: 'shiftEnterHardBreak',
  addKeyboardShortcuts() {
    return {
      'Shift-Enter': () => this.editor.commands.setHardBreak(),
    };
  },
});

export const RichTextComposer = forwardRef<RichTextComposerHandle, RichTextComposerProps>(
  function RichTextComposer(
    { placeholder = 'Write a message…', disabled = false, onUpdate, onSubmit, className },
    ref
  ) {
    const [toolbarVersion, setToolbarVersion] = useState(0);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
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
      ],
      editorProps: {
        attributes: {
          class:
            'message-rich-body focus:outline-none min-h-[72px] px-3 py-2 text-sm text-[var(--text-primary)]',
        },
        transformPastedHTML(html) {
          return sanitizeMessageHtml(html);
        },
        handleKeyDown(view, event) {
          if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
            if (!shouldSubmitComposerOnEnter(view)) {
              return false;
            }
            event.preventDefault();
            onSubmit();
            return true;
          }
          return false;
        },
      },
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        onUpdate?.(ed.getText({ blockSeparator: '\n' }).trimEnd());
        setToolbarVersion(v => v + 1);
      },
      onSelectionUpdate: () => {
        setToolbarVersion(v => v + 1);
      },
    });

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [disabled, editor]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus('end'),
        clear: () => editor?.commands.clearContent(true),
        isEmpty: () => !editor || editor.isEmpty,
        getPlainText: () =>
          editor?.getText({ blockSeparator: '\n' }).trim() ?? '',
        getHtml: () => sanitizeMessageHtml(editor?.getHTML() ?? ''),
        insertText: (text: string) => {
          editor?.chain().focus().insertContent(text).run();
        },
      }),
      [editor]
    );

    const activeState = useMemo(() => {
      if (!editor) {
        return {
          bold: false,
          italic: false,
          underline: false,
          bulletList: false,
          orderedList: false,
          code: false,
          link: false,
        };
      }
      void toolbarVersion;
      return getComposerActiveState(editor);
    }, [editor, toolbarVersion]);

    const handleAction = (action: ComposerFormatAction) => {
      if (!editor || disabled) return;

      if (action === 'link') {
        const previousUrl = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Enter link URL', previousUrl || 'https://');
        if (url === null) return;
        runComposerFormatAction(editor, action, { linkUrl: url });
      } else {
        runComposerFormatAction(editor, action);
      }
      setToolbarVersion(v => v + 1);
    };

    return (
      <div className={cn('overflow-hidden', className)}>
        <ComposerFormattingToolbar
          disabled={disabled}
          activeState={activeState}
          onAction={handleAction}
        />
        <EditorContent
          editor={editor}
          className={cn(
            'message-rich-editor bg-transparent',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>
    );
  }
);
