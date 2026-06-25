import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getComposerActiveState,
  runComposerFormatAction,
  shouldSubmitComposerOnEnter,
} from './composer-formatting';

type MockListContext = 'bulletList' | 'orderedList' | null;

function createSelectionPos(insideList: MockListContext) {
  const nodeAtDepth = (depth: number) => {
    if (insideList === 'bulletList') {
      if (depth === 2) return { type: { name: 'bulletList' } };
      if (depth === 3) return { type: { name: 'listItem' } };
    }
    if (insideList === 'orderedList') {
      if (depth === 2) return { type: { name: 'orderedList' } };
      if (depth === 3) return { type: { name: 'listItem' } };
    }
    return { type: { name: 'paragraph' } };
  };

  return {
    depth: insideList ? 3 : 1,
    node: nodeAtDepth,
  };
}

function createMockEditor(options?: { insideList?: MockListContext }) {
  const calls: string[] = [];
  const insideList = options?.insideList ?? null;
  const $from = createSelectionPos(insideList);
  const $to = createSelectionPos(insideList);

  const chain = {
    focus: () => chain,
    toggleBold: () => {
      calls.push('toggleBold');
      return chain;
    },
    toggleItalic: () => {
      calls.push('toggleItalic');
      return chain;
    },
    toggleUnderline: () => {
      calls.push('toggleUnderline');
      return chain;
    },
    extendMarkRange: () => chain,
    unsetLink: () => chain,
    setLink: () => chain,
    toggleBulletList: () => {
      calls.push('toggleBulletList');
      return chain;
    },
    toggleOrderedList: () => {
      calls.push('toggleOrderedList');
      return chain;
    },
    toggleCode: () => {
      calls.push('toggleCode');
      return chain;
    },
    run: () => true,
  };

  const active = new Set<string>();

  const editor = {
    chain: () => chain,
    getAttributes: () => ({}),
    isActive: (name: string) => active.has(name),
    setActive: (...names: string[]) => {
      active.clear();
      names.forEach(name => active.add(name));
    },
    getHTML: () => '<p></p>',
    state: {
      selection: { $from, $to, from: 1, to: 1 },
      doc: {
        content: { size: 10 },
        resolve: () => ({
          depth: insideList ? 3 : 1,
          node: $from.node,
          before: () => 0,
          index: () => 0,
        }),
        descendants: () => {},
        nodesBetween: () => {},
      },
      schema: {
        nodes: {
          bulletList: {},
          orderedList: {},
          listItem: {},
          paragraph: { create: () => ({ type: { name: 'paragraph' }, nodeSize: 2 }) },
        },
      },
      tr: {
        setSelection: () => ({}),
        replaceWith: () => ({}),
        delete: () => ({}),
      },
    },
    view: {
      focus: () => {},
      dispatch: () => {},
    },
    calls,
  };

  return editor;
}

describe('runComposerFormatAction', () => {
  it('calls toggleBulletList when bullet list is inactive', () => {
    const editor = createMockEditor();
    runComposerFormatAction(editor as never, 'bulletList');
    assert.deepEqual(editor.calls, ['toggleBulletList']);
  });

  it('calls toggleOrderedList when ordered list is inactive', () => {
    const editor = createMockEditor();
    runComposerFormatAction(editor as never, 'orderedList');
    assert.deepEqual(editor.calls, ['toggleOrderedList']);
  });

  it('calls toggleCode for inline code action', () => {
    const editor = createMockEditor();
    runComposerFormatAction(editor as never, 'code');
    assert.deepEqual(editor.calls, ['toggleCode']);
  });
});

describe('getComposerActiveState', () => {
  it('reflects bullet list active state', () => {
    const editor = createMockEditor();
    editor.setActive('bulletList');
    assert.equal(getComposerActiveState(editor as never).bulletList, true);
    assert.equal(getComposerActiveState(editor as never).orderedList, false);
  });

  it('reflects ordered list active state', () => {
    const editor = createMockEditor();
    editor.setActive('orderedList');
    assert.equal(getComposerActiveState(editor as never).orderedList, true);
    assert.equal(getComposerActiveState(editor as never).bulletList, false);
  });

  it('reflects inline code active state', () => {
    const editor = createMockEditor();
    editor.setActive('code');
    assert.equal(getComposerActiveState(editor as never).code, true);
  });

  it('detects bullet list from cursor position when isActive is false', () => {
    const editor = createMockEditor({ insideList: 'bulletList' });
    assert.equal(getComposerActiveState(editor as never).bulletList, true);
  });
});

describe('shouldSubmitComposerOnEnter', () => {
  it('returns false when cursor is inside a list item', () => {
    const view = {
      state: {
        selection: {
          $from: {
            depth: 2,
            node: (depth: number) => ({
              type: { name: depth === 2 ? 'listItem' : 'paragraph' },
            }),
          },
        },
      },
    } as Parameters<typeof shouldSubmitComposerOnEnter>[0];

    assert.equal(shouldSubmitComposerOnEnter(view), false);
  });

  it('returns true when cursor is outside lists', () => {
    const view = {
      state: {
        selection: {
          $from: {
            depth: 1,
            node: () => ({ type: { name: 'paragraph' } }),
          },
        },
      },
    } as Parameters<typeof shouldSubmitComposerOnEnter>[0];

    assert.equal(shouldSubmitComposerOnEnter(view), true);
  });
});
