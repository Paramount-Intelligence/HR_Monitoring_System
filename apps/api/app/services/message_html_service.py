"""Sanitize rich message HTML before storage and derive plain text previews."""
from __future__ import annotations

import re
from html import unescape
from html.parser import HTMLParser

ALLOWED_TAGS = frozenset(
    {
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "ul",
        "ol",
        "li",
        "a",
        "code",
        "pre",
        "span",
    }
)

ALLOWED_ATTRS = frozenset({"href", "target", "rel", "class"})


class _Sanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag not in ALLOWED_TAGS:
            return
        safe_attrs: list[tuple[str, str]] = []
        for key, value in attrs:
            key = key.lower()
            if key not in ALLOWED_ATTRS or value is None:
                continue
            if key == "href":
                href = value.strip()
                if not href.startswith(("http://", "https://", "mailto:")):
                    continue
                if href.lower().startswith("javascript:"):
                    continue
            safe_attrs.append((key, value))
        if tag == "a":
            has_target = any(k == "target" for k, _ in safe_attrs)
            has_rel = any(k == "rel" for k, _ in safe_attrs)
            if not has_target:
                safe_attrs.append(("target", "_blank"))
            if not has_rel:
                safe_attrs.append(("rel", "noopener noreferrer"))
        attr_str = "".join(f' {k}="{_escape_attr(v)}"' for k, v in safe_attrs)
        self._parts.append(f"<{tag}{attr_str}>")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in ALLOWED_TAGS and tag not in {"br"}:
            self._parts.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        self._parts.append(_escape_text(data))

    def get_html(self) -> str:
        return "".join(self._parts).strip()


def _escape_text(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _escape_attr(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
    )


def sanitize_message_html(html: str | None) -> str:
    if not html:
        return ""
    parser = _Sanitizer()
    try:
        parser.feed(html)
        parser.close()
    except Exception:
        return ""
    return re.sub(r"\s+", " ", parser.get_html()).strip()


def html_to_plain_text(html: str | None) -> str:
    if not html:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def prepare_message_content(body: str | None, body_html: str | None) -> tuple[str, str | None]:
    """Return sanitized plain body and optional rich HTML."""
    plain = (body or "").strip()
    if body_html and body_html.strip():
        sanitized = sanitize_message_html(body_html)
        derived_plain = html_to_plain_text(sanitized)
        if derived_plain:
            plain = derived_plain
        return plain, sanitized or None
    return plain, None
