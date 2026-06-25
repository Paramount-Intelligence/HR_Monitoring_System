import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

export type ComposerListName = 'bulletList' | 'orderedList';

export type SelectionSnapshot = { from: number; to: number };

const DEBUG = process.env.NEXT_PUBLIC_RICH_TEXT_DEBUG === 'true';

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.debug('[tiptap-list-commands]', ...args);
  }
}

function getParagraphContentFromListItem(listItem: ProseMirrorNode): ProseMirrorNode['content'] | null {
  let content: ProseMirrorNode['content'] | null = null;
  listItem.forEach(child => {
    if (!content && child.isBlock && child.type.name === 'paragraph') {
      content = child.content;
    }
  });
  return content;
}

function paragraphFromListItem(
  listItem: ProseMirrorNode,
  paragraphType: ProseMirrorNode['type']
): ProseMirrorNode {
  const paragraphContent = getParagraphContentFromListItem(listItem);
  if (paragraphContent && paragraphContent.textBetween(0, paragraphContent.size, '\n', '\n').trim()) {
    return paragraphType.create(null, paragraphContent);
  }
  return paragraphType.create();
}

/** Walk ancestor chain — more reliable than `isActive()` after toolbar clicks. */
export function isInsideListType(state: EditorState, listName: ComposerListName): boolean {
  const { $from, $to } = state.selection;
  return hasListAncestor($from, listName) || hasListAncestor($to, listName);
}

function hasListAncestor($pos: EditorState['selection']['$from'], listName: ComposerListName): boolean {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === listName) {
      return true;
    }
  }
  return false;
}

function findListItemDepthsInRange(
  state: EditorState,
  listName: ComposerListName
): Array<{ pos: number; node: ProseMirrorNode }> {
  const { from, to } = state.selection;
  const listType = state.schema.nodes[listName];
  const listItemType = state.schema.nodes.listItem;
  if (!listType || !listItemType) return [];

  const items: Array<{ pos: number; node: ProseMirrorNode }> = [];
  const seen = new Set<number>();

  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (node.type !== listItemType || seen.has(pos)) return;
    if (parent?.type === listType) {
      seen.add(pos);
      items.push({ pos, node });
    }
  });

  return items;
}

function safeTextSelection(
  doc: EditorState['doc'],
  anchor: number,
  head: number
): TextSelection {
  const max = doc.content.size;
  const safeAnchor = Math.max(1, Math.min(anchor, Math.max(1, max - 1)));
  const safeHead = Math.max(1, Math.min(head, Math.max(1, max - 1)));
  try {
    return TextSelection.create(doc, safeAnchor, safeHead);
  } catch {
    return TextSelection.near(doc.resolve(safeAnchor), 1);
  }
}

export function restoreComposerSelection(
  editor: Editor,
  snapshot: SelectionSnapshot | null | undefined
): void {
  if (!snapshot) return;
  try {
    const max = editor.state.doc.content.size;
    const from = Math.max(0, Math.min(snapshot.from, max));
    const to = Math.max(0, Math.min(snapshot.to, max));
    const anchor = Math.min(from, to);
    const head = Math.max(from, to);
    const tr = editor.state.tr.setSelection(
      safeTextSelection(editor.state.doc, anchor, head)
    );
    editor.view.dispatch(tr);
  } catch {
    // Snapshot may be stale or doc may not support text selection at those positions.
  }
}

function dispatchWithCursor(editor: Editor, tr: EditorState['tr'], cursorPos: number): void {
  const max = tr.doc.content.size;
  const safePos = Math.min(Math.max(1, cursorPos), Math.max(1, max - 1));
  try {
    const resolved = tr.doc.resolve(safePos);
    const selection = TextSelection.near(resolved, 1);
    editor.view.dispatch(tr.setSelection(selection));
  } catch {
    editor.view.dispatch(tr.setSelection(TextSelection.atEnd(tr.doc)));
  }
  editor.view.focus();
}

/** Unwrap one list item into a paragraph, splitting the parent list when needed. */
export function unwrapActiveListItemToParagraph(
  editor: Editor,
  listName: ComposerListName,
  listItemPos: number,
  listItemNode: ProseMirrorNode
): boolean {
  const { state } = editor;
  const { schema } = state;
  const listType = schema.nodes[listName];
  const paragraphType = schema.nodes.paragraph;
  if (!listType || !paragraphType) return false;

  const $inside = state.doc.resolve(listItemPos + 1);
  let listDepth = -1;
  let listItemDepth = -1;
  for (let depth = $inside.depth; depth > 0; depth -= 1) {
    if ($inside.node(depth).type.name === 'listItem') listItemDepth = depth;
    if ($inside.node(depth).type.name === listName) listDepth = depth;
  }
  if (listDepth === -1 || listItemDepth === -1) return false;

  const listNode = $inside.node(listDepth);
  const listPos = $inside.before(listDepth);
  const indexInList = $inside.index(listDepth);

  const paragraph = paragraphFromListItem(listItemNode, paragraphType);

  let tr = state.tr;
  let cursorPos = listPos + 1;

  if (listNode.childCount === 1) {
    tr = tr.replaceWith(listPos, listPos + listNode.nodeSize, paragraph);
    cursorPos = listPos + 1;
  } else {
    const before: ProseMirrorNode[] = [];
    const after: ProseMirrorNode[] = [];
    listNode.forEach((child, index) => {
      if (index < indexInList && !isListItemEmpty(child)) before.push(child);
      if (index > indexInList && !isListItemEmpty(child)) after.push(child);
    });

    const replacement: ProseMirrorNode[] = [];
    if (before.length > 0) replacement.push(listType.create(null, before));
    replacement.push(paragraph);
    if (after.length > 0) replacement.push(listType.create(null, after));

    tr = tr.replaceWith(listPos, listPos + listNode.nodeSize, replacement);

    let offset = listPos;
    for (const node of replacement) {
      if (node.type === paragraphType) {
        cursorPos = offset + 1;
        break;
      }
      offset += node.nodeSize;
    }
  }

  dispatchWithCursor(editor, tr, cursorPos);
  return true;
}

/** Replace an entire list node with one paragraph per non-empty item. */
function unwrapEntireListToParagraphs(
  editor: Editor,
  listName: ComposerListName,
  listPos: number,
  listNode: ProseMirrorNode
): boolean {
  const paragraphType = editor.state.schema.nodes.paragraph;
  if (!paragraphType) return false;

  const paragraphs: ProseMirrorNode[] = [];
  listNode.forEach(listItem => {
    const paragraph = paragraphFromListItem(listItem, paragraphType);
    if (paragraph.textContent.trim()) {
      paragraphs.push(paragraph);
    }
  });
  if (paragraphs.length === 0) {
    paragraphs.push(paragraphType.create());
  }

  const tr = editor.state.tr.replaceWith(listPos, listPos + listNode.nodeSize, paragraphs);
  dispatchWithCursor(editor, tr, listPos + 1);
  return true;
}

/** Unwrap every list item touched by the current selection. */
export function unwrapSelectedListItemsToParagraphs(
  editor: Editor,
  listName: ComposerListName
): boolean {
  const items = findListItemDepthsInRange(editor.state, listName);
  if (items.length === 0) return false;

  // Process from end to start so positions stay valid.
  const sorted = [...items].sort((a, b) => b.pos - a.pos);
  for (const { pos, node } of sorted) {
    unwrapActiveListItemToParagraph(editor, listName, pos, node);
  }
  return true;
}

/** OFF: unwrap selection or active list item. Never calls toggleBulletList/toggleOrderedList. */
export function unwrapListSelectionToParagraphs(
  editor: Editor,
  listName: ComposerListName
): boolean {
  const { state } = editor;
  const items = findListItemDepthsInRange(state, listName);

  if (items.length > 1) {
    if (items.length > 0) {
      const $inside = state.doc.resolve(items[0].pos + 1);
      for (let depth = $inside.depth; depth > 0; depth -= 1) {
        if ($inside.node(depth).type.name === listName) {
          const listNode = $inside.node(depth);
          const listPos = $inside.before(depth);
          if (items.length === listNode.childCount) {
            const ok = unwrapEntireListToParagraphs(editor, listName, listPos, listNode);
            cleanupLiveEmptyLists(editor);
            return ok;
          }
          break;
        }
      }
    }
    const ok = unwrapSelectedListItemsToParagraphs(editor, listName);
    cleanupLiveEmptyLists(editor);
    return ok;
  }

  if (items.length === 1) {
    const ok = unwrapActiveListItemToParagraph(editor, listName, items[0].pos, items[0].node);
    cleanupLiveEmptyLists(editor);
    return ok;
  }

  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== 'listItem') continue;
    const listItemPos = $from.before(depth);
    const listItemNode = $from.node(depth);
    const $item = state.doc.resolve(listItemPos);
    if ($item.depth < 1) continue;
    const parent = $item.node($item.depth);
    if (parent.type.name === listName) {
      const ok = unwrapActiveListItemToParagraph(editor, listName, listItemPos, listItemNode);
      cleanupLiveEmptyLists(editor);
      return ok;
    }
  }

  return false;
}

function isListItemEmpty(node: ProseMirrorNode): boolean {
  return !node.textContent.replace(/\u00a0/g, '').trim();
}

/** Split inline hardBreaks into separate paragraphs inside the current selection. */
export function splitHardBreaksInSelectionToParagraphs(editor: Editor): boolean {
  const { state } = editor;
  const { from, to } = state.selection;
  if (from === to) return false;

  const hardBreakType = state.schema.nodes.hardBreak;
  const paragraphType = state.schema.nodes.paragraph;
  if (!hardBreakType || !paragraphType) return false;

  const replacements: Array<{ from: number; to: number; nodes: ProseMirrorNode[] }> = [];

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type !== paragraphType) return;

    const paraStart = pos;
    const paraEnd = pos + node.nodeSize;
    const intersectsSelection = from < paraEnd && to > paraStart;
    if (!intersectsSelection) return;

    let hasHardBreak = false;
    node.forEach(child => {
      if (child.type === hardBreakType) hasHardBreak = true;
    });
    if (!hasHardBreak) return;

    const paragraphs = splitParagraphNodeAtHardBreaks(node, paragraphType);
    if (paragraphs.length <= 1) return;

    replacements.push({ from: pos, to: pos + node.nodeSize, nodes: paragraphs });
  });

  if (replacements.length === 0) return false;

  const sortedAsc = [...replacements].sort((a, b) => a.from - b.from);
  const anchorPos = sortedAsc[0].from;
  let totalSize = 0;
  sortedAsc[0].nodes.forEach(node => {
    totalSize += node.nodeSize;
  });

  let tr = state.tr;
  replacements
    .sort((a, b) => b.from - a.from)
    .forEach(({ from: replaceFrom, to: replaceTo, nodes }) => {
      tr = tr.replaceWith(replaceFrom, replaceTo, nodes);
    });

  const selectionFrom = anchorPos + 1;
  const selectionTo = anchorPos + totalSize - 1;
  tr = tr.setSelection(safeTextSelection(tr.doc, selectionFrom, selectionTo));
  editor.view.dispatch(tr);
  return true;
}

function splitParagraphNodeAtHardBreaks(
  paragraph: ProseMirrorNode,
  paragraphType: ProseMirrorNode['type']
): ProseMirrorNode[] {
  const hardBreakType = paragraph.type.schema.nodes.hardBreak;
  const segments: ProseMirrorNode[][] = [[]];

  paragraph.forEach(child => {
    if (hardBreakType && child.type === hardBreakType) {
      segments.push([]);
      return;
    }
    segments[segments.length - 1].push(child);
  });

  return segments.map(inline =>
    inline.length > 0 ? paragraphType.create(null, inline) : paragraphType.create()
  );
}

function applyListOn(editor: Editor, listName: ComposerListName): void {
  splitHardBreaksInSelectionToParagraphs(editor);
  if (listName === 'bulletList') {
    editor.chain().toggleBulletList().run();
    return;
  }
  editor.chain().toggleOrderedList().run();
}

/** Remove empty list items and empty list wrappers from the live document. */
export function cleanupLiveEmptyLists(editor: Editor): void {
  const listItemType = editor.state.schema.nodes.listItem;
  const bulletType = editor.state.schema.nodes.bulletList;
  const orderedType = editor.state.schema.nodes.orderedList;
  if (!listItemType) return;

  let safety = 0;
  while (safety < 20) {
    safety += 1;
    const { state, view } = editor;
    const emptyListItems: Array<{ from: number; to: number }> = [];

    state.doc.descendants((node, pos) => {
      if (node.type === listItemType && isListItemEmpty(node)) {
        emptyListItems.push({ from: pos, to: pos + node.nodeSize });
      }
    });

    if (emptyListItems.length === 0) break;

    let tr = state.tr;
    emptyListItems
      .sort((a, b) => b.from - a.from)
      .forEach(({ from, to }) => {
        tr = tr.delete(from, to);
      });
    view.dispatch(tr);
  }

  const emptyLists: Array<{ from: number; to: number }> = [];
  editor.state.doc.descendants((node, pos) => {
    if ((node.type === bulletType || node.type === orderedType) && node.childCount === 0) {
      emptyLists.push({ from: pos, to: pos + node.nodeSize });
    }
  });

  if (emptyLists.length === 0) return;

  let tr2 = editor.state.tr;
  emptyLists
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => {
      tr2 = tr2.delete(from, to);
    });
  editor.view.dispatch(tr2);
}

export function toggleSlackBulletList(
  editor: Editor,
  savedSelection?: SelectionSnapshot | null
): void {
  restoreComposerSelection(editor, savedSelection ?? null);
  editor.view.focus();

  const state = editor.state;
  debugLog('toggleSlackBulletList:before', {
    inside: isInsideListType(state, 'bulletList'),
    html: editor.getHTML(),
    selection: state.selection,
  });

  if (isInsideListType(state, 'bulletList')) {
    unwrapListSelectionToParagraphs(editor, 'bulletList');
    cleanupLiveEmptyLists(editor);
    debugLog('toggleSlackBulletList:off', { html: editor.getHTML() });
    return;
  }

  applyListOn(editor, 'bulletList');
  debugLog('toggleSlackBulletList:on', { html: editor.getHTML() });
}

export function toggleSlackOrderedList(
  editor: Editor,
  savedSelection?: SelectionSnapshot | null
): void {
  restoreComposerSelection(editor, savedSelection ?? null);
  editor.view.focus();

  const state = editor.state;
  if (isInsideListType(state, 'orderedList')) {
    unwrapListSelectionToParagraphs(editor, 'orderedList');
    cleanupLiveEmptyLists(editor);
    return;
  }

  applyListOn(editor, 'orderedList');
}

/** @deprecated Use toggleSlackBulletList */
export const toggleComposerBulletList = toggleSlackBulletList;
/** @deprecated Use toggleSlackOrderedList */
export const toggleComposerOrderedList = toggleSlackOrderedList;
