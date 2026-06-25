import type { EditorView } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/core';
import {
  toggleSlackBulletList,
  toggleSlackOrderedList,
  isInsideListType,
  type SelectionSnapshot,
} from '@/lib/messages/tiptap-list-commands';

export type ComposerFormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'link'
  | 'bulletList'
  | 'orderedList'
  | 'code';

export type ComposerEditorLike = Pick<
  Editor,
  'chain' | 'getAttributes' | 'isActive'
>;

/** True when Enter should send the message instead of editing list structure. */
export function shouldSubmitComposerOnEnter(view: EditorView): boolean {
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'listItem') {
      return false;
    }
  }
  return true;
}

export type { SelectionSnapshot };

export function getComposerActiveState(editor: Editor) {
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    bulletList:
      editor.isActive('bulletList') || isInsideListType(editor.state, 'bulletList'),
    orderedList:
      editor.isActive('orderedList') || isInsideListType(editor.state, 'orderedList'),
    code: editor.isActive('code'),
    link: editor.isActive('link'),
  };
}

/** Run a Slack-style formatting command on the TipTap editor. */
export function runComposerFormatAction(
  editor: Editor,
  action: ComposerFormatAction,
  options?: { linkUrl?: string | null; selection?: SelectionSnapshot | null }
): void {
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
      if (options?.linkUrl === undefined) return;
      if (options.linkUrl === null) return;
      const trimmed = options.linkUrl.trim();
      if (!trimmed) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
      break;
    }
    case 'bulletList':
      toggleSlackBulletList(editor, options?.selection);
      break;
    case 'orderedList':
      toggleSlackOrderedList(editor, options?.selection);
      break;
    case 'code':
      editor.chain().focus().toggleCode().run();
      break;
    default:
      break;
  }
}

export {
  toggleSlackBulletList,
  toggleSlackOrderedList,
} from '@/lib/messages/tiptap-list-commands';
