import type { EditorView } from '@tiptap/pm/view';

export type ComposerFormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'link'
  | 'bulletList'
  | 'orderedList'
  | 'code';

type ChainRunner = {
  focus: () => ChainRunner;
  toggleBold: () => ChainRunner;
  toggleItalic: () => ChainRunner;
  toggleUnderline: () => ChainRunner;
  extendMarkRange: (mark: string) => ChainRunner;
  unsetLink: () => ChainRunner;
  setLink: (attrs: { href: string }) => ChainRunner;
  toggleBulletList: () => ChainRunner;
  toggleOrderedList: () => ChainRunner;
  toggleCode: () => ChainRunner;
  run: () => boolean;
};

export type ComposerEditorLike = {
  chain: () => ChainRunner;
  getAttributes: (mark: string) => Record<string, unknown>;
  isActive: (
    name: string,
    attributes?: Record<string, unknown>
  ) => boolean;
};

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

export function getComposerActiveState(editor: ComposerEditorLike) {
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    code: editor.isActive('code'),
    link: editor.isActive('link'),
  };
}

/** Run a Slack-style formatting command on the TipTap editor. */
export function runComposerFormatAction(
  editor: ComposerEditorLike,
  action: ComposerFormatAction,
  options?: { linkUrl?: string | null }
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
}
