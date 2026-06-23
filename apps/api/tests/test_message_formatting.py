"""Rich message HTML sanitization tests."""
from __future__ import annotations

from app.services.message_html_service import (
    html_to_plain_text,
    prepare_message_content,
    sanitize_message_html,
)


def test_sanitize_strips_script_keeps_strong():
    raw = '<p><script>alert(1)</script><strong>safe</strong></p>'
    cleaned = sanitize_message_html(raw)
    assert "script" not in cleaned.lower()
    assert "<strong>safe</strong>" in cleaned


def test_sanitize_preserves_lists_and_links():
    raw = '<ul><li>one</li></ul><a href="https://example.com">link</a>'
    cleaned = sanitize_message_html(raw)
    assert "<ul>" in cleaned
    assert "<li>" in cleaned
    assert 'href="https://example.com"' in cleaned
    assert 'rel="noopener noreferrer"' in cleaned


def test_prepare_message_content_derives_plain_text():
    plain, html = prepare_message_content(
        None,
        '<p><em>Hello</em> <strong>world</strong></p>',
    )
    assert plain == "Hello world"
    assert html is not None
    assert "<strong>" in html


def test_html_to_plain_text_for_previews():
    assert html_to_plain_text("<p><u>Hi</u> there</p>") == "Hi there"


def test_plain_text_message_unchanged():
    plain, html = prepare_message_content("Hello team", None)
    assert plain == "Hello team"
    assert html is None
