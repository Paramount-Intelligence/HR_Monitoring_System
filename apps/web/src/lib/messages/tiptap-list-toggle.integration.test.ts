/**
 * Real TipTap editor integration tests for Slack-style list toggle behavior.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { createComposerListTestExtensions } from './composer-editor-setup';
import {
  toggleSlackBulletList,
  toggleSlackOrderedList,
  unwrapListSelectionToParagraphs,
  cleanupLiveEmptyLists,
} from './tiptap-list-commands';

function setupDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>', {
    pretendToBeVisual: true,
  });
  const { window } = dom;
  // @ts-expect-error test harness assigns jsdom globals
  globalThis.document = window.document;
  // @ts-expect-error test harness assigns jsdom globals
  globalThis.window = window;
  // @ts-expect-error test harness assigns jsdom globals
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};

  const rect = {
    top: 0,
    left: 0,
    bottom: 20,
    right: 100,
    width: 100,
    height: 20,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;

  window.Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return rect;
  };
  window.Element.prototype.getClientRects = function getClientRects() {
    return [rect] as unknown as DOMRectList;
  };
}

function createTestEditor(): Editor {
  const element = document.getElementById('editor')!;
  const editor = new Editor({
    element,
    extensions: createComposerListTestExtensions(),
    content: '<p></p>',
  });
  editor.view.scrollToSelection = () => {};
  return editor;
}

function countListItems(html: string, listTag: 'ul' | 'ol'): number {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper.querySelectorAll(`${listTag} > li`).length;
}

function countEmptyListItems(html: string): number {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return Array.from(wrapper.querySelectorAll('li')).filter(
    li => (li.textContent || '').trim().length === 0
  ).length;
}

function snapshot(editor: Editor) {
  return { from: editor.state.selection.from, to: editor.state.selection.to };
}

function placeCursorAtEnd(editor: Editor) {
  const end = Math.max(1, editor.state.doc.content.size - 1);
  editor.commands.setTextSelection(end);
}

function placeCursorInEmptyParagraph(editor: Editor) {
  editor.commands.setTextSelection(1);
}

function selectInsideFirstListItem(editor: Editor) {
  let target = 1;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'listItem' && target === 1) {
      target = pos + 2;
      return false;
    }
    return undefined;
  });
  editor.commands.setTextSelection(target);
}

function selectAllDoc(editor: Editor) {
  const from = 1;
  const to = Math.max(1, editor.state.doc.content.size - 1);
  editor.commands.setTextSelection({ from, to });
}

describe('TipTap Slack list toggle integration', () => {
  let editor: Editor;

  before(() => {
    setupDom();
  });

  after(() => {
    editor?.destroy();
  });

  it('plain paragraph → Bullet ON creates one bullet', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>ASDSAFS</p>');
    placeCursorAtEnd(editor);
    const sel = snapshot(editor);

    toggleSlackBulletList(editor, sel);

    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ul'), 1);
    assert.match(html, /ASDSAFS/);
    editor.destroy();
  });

  it('plain paragraph → Numbered ON creates one numbered item', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>ASDSAFS</p>');
    placeCursorAtEnd(editor);
    const sel = snapshot(editor);

    toggleSlackOrderedList(editor, sel);

    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ol'), 1);
    assert.match(html, /ASDSAFS/);
    editor.destroy();
  });

  it('bullet OFF removes list without creating empty bullets', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>ASDSAFS</p>');
    placeCursorAtEnd(editor);
    const sel = snapshot(editor);

    toggleSlackBulletList(editor, sel);
    toggleSlackBulletList(editor, sel);

    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ul'), 0);
    assert.equal(countEmptyListItems(html), 0);
    assert.match(html, /ASDSAFS/);
    editor.destroy();
  });

  it('repeated bullet toggles do not stack empty bullets', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>ASDSAFS</p>');
    placeCursorAtEnd(editor);
    const sel = snapshot(editor);

    for (let i = 0; i < 10; i += 1) {
      toggleSlackBulletList(editor, sel);
    }

    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ul'), 0);
    assert.equal(countEmptyListItems(html), 0);
    assert.match(html, /ASDSAFS/);
    editor.destroy();
  });

  it('numbered ON/OFF preserves text without empty rows', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>ASDSAFS</p>');
    placeCursorAtEnd(editor);
    const sel = snapshot(editor);

    toggleSlackOrderedList(editor, sel);
    assert.equal(countListItems(editor.getHTML(), 'ol'), 1);

    toggleSlackOrderedList(editor, sel);
    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ol'), 0);
    assert.equal(countEmptyListItems(html), 0);
    assert.match(html, /ASDSAFS/);
    editor.destroy();
  });

  it('two paragraphs selected → Bullet ON creates two list items', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>line one</p><p>line two</p>');
    selectAllDoc(editor);
    const sel = snapshot(editor);

    toggleSlackBulletList(editor, sel);
    assert.equal(countListItems(editor.getHTML(), 'ul'), 2);
    editor.destroy();
  });

  it('two paragraphs selected → Numbered ON creates two list items', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>line one</p><p>line two</p>');
    selectAllDoc(editor);
    const sel = snapshot(editor);

    toggleSlackOrderedList(editor, sel);
    assert.equal(countListItems(editor.getHTML(), 'ol'), 2);
    editor.destroy();
  });

  it('hardBreak-separated lines selected → Bullet ON creates two list items', () => {
    editor = createTestEditor();
    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'line one' },
            { type: 'hardBreak' },
            { type: 'text', text: 'line two' },
          ],
        },
      ],
    });
    selectAllDoc(editor);
    const sel = snapshot(editor);

    toggleSlackBulletList(editor, sel);
    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ul'), 2);
    assert.match(html, /line one/);
    assert.match(html, /line two/);
    editor.destroy();
  });

  it('hardBreak-separated lines selected → Numbered ON creates two list items', () => {
    editor = createTestEditor();
    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'line one' },
            { type: 'hardBreak' },
            { type: 'text', text: 'line two' },
          ],
        },
      ],
    });
    selectAllDoc(editor);
    const sel = snapshot(editor);

    toggleSlackOrderedList(editor, sel);
    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ol'), 2);
    editor.destroy();
  });

  it('empty paragraph + Bullet ON creates one empty bullet item', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p></p>');
    placeCursorInEmptyParagraph(editor);
    const sel = snapshot(editor);

    toggleSlackBulletList(editor, sel);

    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ul'), 1);
    assert.equal(editor.isActive('bulletList'), true);
    editor.destroy();
  });

  it('empty paragraph + Numbered ON creates one empty ordered item', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p></p>');
    placeCursorInEmptyParagraph(editor);
    const sel = snapshot(editor);

    toggleSlackOrderedList(editor, sel);

    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ol'), 1);
    assert.equal(editor.isActive('orderedList'), true);
    editor.destroy();
  });

  it('unwrap cleans pre-existing empty list items in the same list', () => {
    editor = createTestEditor();
    editor.commands.setContent(
      '<ul><li><p>ASDSAFS</p></li><li><p></p></li><li><p><br></p></li></ul>'
    );
    selectInsideFirstListItem(editor);
    const sel = snapshot(editor);

    unwrapListSelectionToParagraphs(editor, 'bulletList');
    cleanupLiveEmptyLists(editor);

    const html = editor.getHTML();
    assert.match(html, /ASDSAFS/);
    assert.equal(countListItems(html, 'ul'), 0);
    editor.destroy();
  });

  it('multi-line selection converts to bullets then back to paragraphs', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>line one</p><p>line two</p><p>line three</p>');
    selectAllDoc(editor);
    const sel = snapshot(editor);

    toggleSlackBulletList(editor, sel);
    assert.equal(countListItems(editor.getHTML(), 'ul'), 3);

    selectAllDoc(editor);
    const selInList = snapshot(editor);
    toggleSlackBulletList(editor, selInList);
    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ul'), 0);
    assert.match(html, /line one/);
    assert.match(html, /line two/);
    assert.match(html, /line three/);
    editor.destroy();
  });

  it('cursor inside text without selection toggles single line off', () => {
    editor = createTestEditor();
    editor.commands.setContent('<p>ASDSAFS</p>');
    placeCursorAtEnd(editor);
    const selOn = snapshot(editor);
    toggleSlackBulletList(editor, selOn);

    const selOff = snapshot(editor);
    toggleSlackBulletList(editor, selOff);

    const html = editor.getHTML();
    assert.equal(countListItems(html, 'ul'), 0);
    assert.match(html, /ASDSAFS/);
    editor.destroy();
  });
});
