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

export type ComposerFormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'link'
  | 'bulletList'
  | 'orderedList'
  | 'code';

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
            'prose prose-sm max-w-none focus:outline-none min-h-[72px] px-3 py-2 text-sm text-[var(--text-primary)]',
        },
        transformPastedHTML(html) {
          return sanitizeMessageHtml(html);
        },
        handleKeyDown(_view, event) {
          if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
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
      return {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        code: editor.isActive('code'),
        link: editor.isActive('link'),
      };
    }, [editor, toolbarVersion]);

    const handleAction = (action: ComposerFormatAction) => {
      if (!editor || disabled) return;

      switch (action) {
        case 'bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'underline':
          editor.chain().focus().toggleUnderline().run();
          break;
        case 'link': {
          const previousUrl = editor.getAttributes('link').href as string | undefined;
          const url = window.prompt('Enter link URL', previousUrl || 'https://');
          if (url === null) return;
          const trimmed = url.trim();
          if (!trimmed) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
          break;
        }
        case 'bulletList':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'orderedList':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'code':
          editor.chain().focus().toggleCode().run();
          break;
        default:
          break;
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
