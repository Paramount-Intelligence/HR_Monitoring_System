import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasRichFormatting,
  htmlToPlainText,
  isEmptyComposerHtml,
  looksLikeLegacyFormattedText,
  sanitizeMessageHtml,
} from './message-sanitize';

describe('sanitizeMessageHtml', () => {
  it('removes script tags and keeps safe formatting', () => {
    const input = '<p><script>alert(1)</script><strong>safe</strong></p>';
    const out = sanitizeMessageHtml(input);
    assert.equal(out.includes('script'), false);
    assert.match(out, /<strong>safe<\/strong>/);
  });

  it('does not leave markdown markers in output', () => {
    const out = sanitizeMessageHtml('<p><strong>hello</strong></p>');
    assert.equal(out.includes('**'), false);
  });
});

describe('hasRichFormatting', () => {
  it('detects bold html as rich', () => {
    assert.equal(
      hasRichFormatting('<p><strong>hello</strong></p>', 'hello'),
      true
    );
  });

  it('treats plain paragraph as not rich', () => {
    assert.equal(hasRichFormatting('<p>hello</p>', 'hello'), false);
  });
});

describe('htmlToPlainText', () => {
  it('strips tags for sidebar previews', () => {
    assert.equal(htmlToPlainText('<p><strong>Hi</strong> there</p>'), 'Hi there');
  });
});

describe('isEmptyComposerHtml', () => {
  it('treats empty paragraph as empty', () => {
    assert.equal(isEmptyComposerHtml('<p></p>'), true);
    assert.equal(isEmptyComposerHtml('<p><br></p>'), true);
  });
});

describe('looksLikeLegacyFormattedText', () => {
  it('detects old markdown bold messages', () => {
    assert.equal(looksLikeLegacyFormattedText('**hello**'), true);
  });

  it('detects old underline html in plain body', () => {
    assert.equal(looksLikeLegacyFormattedText('<u>hello</u>'), true);
  });
});
