import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getComposerActiveState,
  runComposerFormatAction,
  shouldSubmitComposerOnEnter,
} from './composer-formatting';

function createMockEditor() {
  const calls: string[] = [];
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
    calls,
  };

  return editor;
}

describe('runComposerFormatAction', () => {
  it('calls toggleBulletList for bullet list action', () => {
    const editor = createMockEditor();
    runComposerFormatAction(editor, 'bulletList');
    assert.deepEqual(editor.calls, ['toggleBulletList']);
  });

  it('calls toggleOrderedList for numbered list action', () => {
    const editor = createMockEditor();
    runComposerFormatAction(editor, 'orderedList');
    assert.deepEqual(editor.calls, ['toggleOrderedList']);
  });

  it('calls toggleCode for inline code action', () => {
    const editor = createMockEditor();
    runComposerFormatAction(editor, 'code');
    assert.deepEqual(editor.calls, ['toggleCode']);
  });
});

describe('getComposerActiveState', () => {
  it('reflects bullet list active state', () => {
    const editor = createMockEditor();
    editor.setActive('bulletList');
    assert.equal(getComposerActiveState(editor).bulletList, true);
    assert.equal(getComposerActiveState(editor).orderedList, false);
  });

  it('reflects ordered list active state', () => {
    const editor = createMockEditor();
    editor.setActive('orderedList');
    assert.equal(getComposerActiveState(editor).orderedList, true);
    assert.equal(getComposerActiveState(editor).bulletList, false);
  });

  it('reflects inline code active state', () => {
    const editor = createMockEditor();
    editor.setActive('code');
    assert.equal(getComposerActiveState(editor).code, true);
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
