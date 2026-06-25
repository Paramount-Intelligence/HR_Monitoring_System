'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { ComposerFormattingToolbar } from '@/components/messages/ComposerFormattingToolbar';
import {
  sanitizeMessageHtml,
  stripEmptyComposerListArtifacts,
} from '@/lib/messages/message-sanitize';
import {
  getComposerActiveState,
  runComposerFormatAction,
  shouldSubmitComposerOnEnter,
  type ComposerFormatAction,
} from '@/lib/messages/composer-formatting';
import {
  createComposerEditorProps,
  createComposerExtensions,
} from '@/lib/messages/composer-editor-setup';

const RICH_TEXT_DEBUG = process.env.NEXT_PUBLIC_RICH_TEXT_DEBUG === 'true';

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

export const RichTextComposer = forwardRef<RichTextComposerHandle, RichTextComposerProps>(
  function RichTextComposer(
    { placeholder = 'Write a message…', disabled = false, onUpdate, onSubmit, className },
    ref
  ) {
    const [toolbarVersion, setToolbarVersion] = useState(0);
    const selectionSnapshotRef = useRef<{ from: number; to: number } | null>(null);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: createComposerExtensions(placeholder),
      editorProps: {
        ...createComposerEditorProps(onSubmit),
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
      onSelectionUpdate: ({ editor: ed }) => {
        selectionSnapshotRef.current = {
          from: ed.state.selection.from,
          to: ed.state.selection.to,
        };
        setToolbarVersion(v => v + 1);
      },
    });

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [disabled, editor]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          const ed = editor;
          if (!ed?.isEditable) return;
          requestAnimationFrame(() => {
            if (!ed.isEditable) return;
            ed.chain().focus('end').run();
          });
        },
        clear: () => {
          editor?.commands.clearContent(true);
        },
        isEmpty: () => !editor || editor.isEmpty,
        getPlainText: () =>
          editor?.getText({ blockSeparator: '\n' }).trim() ?? '',
        getHtml: () =>
          sanitizeMessageHtml(
            stripEmptyComposerListArtifacts(editor?.getHTML() ?? '')
          ),
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

    const handleAction = (action: ComposerFormatAction, selection: SelectionSnapshot) => {
      if (!editor || disabled) return;

      if (RICH_TEXT_DEBUG) {
        console.debug('[composer-action]', action, {
          at: Date.now(),
          selection,
          bulletActive: editor.isActive('bulletList'),
          orderedActive: editor.isActive('orderedList'),
          doc: editor.getJSON(),
        });
      }

      if (action === 'link') {
        const previousUrl = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Enter link URL', previousUrl || 'https://');
        if (url === null) return;
        runComposerFormatAction(editor, action, { linkUrl: url, selection });
      } else {
        runComposerFormatAction(editor, action, { selection });
      }

      if (RICH_TEXT_DEBUG) {
        console.debug('[composer-action:after]', action, {
          bulletActive: editor.isActive('bulletList'),
          orderedActive: editor.isActive('orderedList'),
          html: editor.getHTML(),
          doc: editor.getJSON(),
        });
      }

      selectionSnapshotRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      };
      setToolbarVersion(v => v + 1);
    };

    return (
      <div className={cn('overflow-hidden', className)}>
        <ComposerFormattingToolbar
          editor={editor}
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
