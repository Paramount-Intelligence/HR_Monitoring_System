import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasRichFormatting,
  htmlToPlainText,
  isEmptyComposerHtml,
  looksLikeLegacyFormattedText,
  sanitizeMessageHtml,
  stripEmptyComposerListArtifacts,
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

  it('preserves bullet list html', () => {
    const input = '<ul><li>one</li><li>two</li></ul>';
    const out = sanitizeMessageHtml(input);
    assert.match(out, /<ul>/);
    assert.match(out, /<li>one<\/li>/);
    assert.match(out, /<li>two<\/li>/);
    assert.equal(out.includes('- '), false);
  });

  it('preserves ordered list html', () => {
    const input = '<ol><li>first</li><li>second</li></ol>';
    const out = sanitizeMessageHtml(input);
    assert.match(out, /<ol>/);
    assert.match(out, /<li>first<\/li>/);
    assert.match(out, /<li>second<\/li>/);
    assert.equal(out.includes('1.'), false);
  });

  it('preserves inline code html', () => {
    const input = '<p>Use <code>npm test</code> locally</p>';
    const out = sanitizeMessageHtml(input);
    assert.match(out, /<code>npm test<\/code>/);
    assert.equal(out.includes('`'), false);
  });

  it('strips script tags from list and code html', () => {
    const input =
      '<ul><li><script>alert(1)</script>safe</li></ul><p><code>ok</code></p>';
    const out = sanitizeMessageHtml(input);
    assert.equal(out.includes('script'), false);
    assert.match(out, /<li>safe<\/li>/);
    assert.match(out, /<code>ok<\/code>/);
  });
});

describe('stripEmptyComposerListArtifacts', () => {
  it('removes trailing empty bullet list items', () => {
    const input = '<ul><li>one</li><li></li><li><p></p></li></ul>';
    const out = stripEmptyComposerListArtifacts(input);
    assert.equal(out, '<ul><li>one</li></ul>');
  });

  it('removes trailing empty numbered list items', () => {
    const input = '<ol><li>first</li><li>&nbsp;</li></ol>';
    const out = stripEmptyComposerListArtifacts(input);
    assert.equal(out, '<ol><li>first</li></ol>');
  });

  it('removes entirely empty lists', () => {
    const input = '<ul><li></li><li><br></li></ul>';
    const out = stripEmptyComposerListArtifacts(input);
    assert.equal(out, '');
  });

  it('preserves real list content', () => {
    const input = '<ul><li>alpha</li><li>beta</li></ul>';
    const out = stripEmptyComposerListArtifacts(input);
    assert.equal(out, input);
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

  it('detects list html as rich', () => {
    assert.equal(
      hasRichFormatting('<ul><li>one</li></ul>', 'one'),
      true
    );
  });

  it('detects inline code html as rich', () => {
    assert.equal(
      hasRichFormatting('<p><code>npm test</code></p>', 'npm test'),
      true
    );
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
