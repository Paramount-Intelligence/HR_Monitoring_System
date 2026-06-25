/**
 * Browser verification for message composer list toggle.
 * Run: node scripts/composer-list-browser-check.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.COMPOSER_TEST_URL ?? 'http://localhost:3000';
const API = process.env.COMPOSER_TEST_API ?? 'http://localhost:8000/api/v1';
const EMAIL = process.env.COMPOSER_TEST_EMAIL ?? 'admin@example.com';
const PASSWORD = process.env.COMPOSER_TEST_PASSWORD ?? 'change-this-password';

function countListItems(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
  const lists = html.match(re) ?? [];
  let count = 0;
  for (const list of lists) {
    count += (list.match(/<li\b/gi) ?? []).length;
  }
  return count;
}

async function loginViaApi(page) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`API login failed: ${res.status}`);
  }
  const data = await res.json();
  const token = data.access_token;
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  let convRes = await fetch(`${API}/messages/conversations`, { headers: authHeaders });
  if (!convRes.ok) {
    throw new Error(`Failed to load conversations: ${convRes.status}`);
  }
  let conversations = await convRes.json();
  let conversationId = conversations[0]?.id;

  if (!conversationId) {
    const usersRes = await fetch(`${API}/users/active-directory`, { headers: authHeaders });
    if (!usersRes.ok) {
      throw new Error(`Failed to load messaging directory: ${usersRes.status}`);
    }
    const users = await usersRes.json();
    const other = users.find(u => u.id !== data.user.id);
    if (!other) {
      throw new Error('Need at least two users to open Messages composer');
    }
    const createRes = await fetch(`${API}/messages/conversations`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ type: 'direct', participant_ids: [other.id] }),
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create conversation: ${createRes.status}`);
    }
    const created = await createRes.json();
    conversationId = created.id;
  }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ access_token, refresh_token, user }) => {
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    }
  );

  return conversationId;
}

async function getEditorHtml(page) {
  return page.locator('.message-rich-editor .ProseMirror').evaluate(el => el.innerHTML);
}

async function clickToolbar(page, label) {
  await page.getByRole('button', { name: label }).dispatchEvent('mousedown');
}

async function runScenario(page, { label, listTag }) {
  const editor = page.locator('.message-rich-editor .ProseMirror');
  await editor.click();
  await page.keyboard.type('ASDSAFS');
  await clickToolbar(page, label);

  let html = await getEditorHtml(page);
  if (countListItems(html, listTag) !== 1) {
    throw new Error(`${label} ON: expected 1 list item, got ${countListItems(html, listTag)}. HTML: ${html}`);
  }
  if (!html.includes('ASDSAFS')) {
    throw new Error(`${label} ON: text missing`);
  }

  await clickToolbar(page, label);
  html = await getEditorHtml(page);
  if (countListItems(html, listTag) !== 0) {
    throw new Error(`${label} OFF: expected 0 list items, got ${countListItems(html, listTag)}. HTML: ${html}`);
  }
  if (!html.includes('ASDSAFS')) {
    throw new Error(`${label} OFF: text missing`);
  }

  for (let i = 0; i < 10; i += 1) {
    await clickToolbar(page, label);
  }
  html = await getEditorHtml(page);
  if (countListItems(html, listTag) !== 0) {
    throw new Error(`${label} 10x toggle: empty list artifacts. HTML: ${html}`);
  }
}

async function runBlankLineScenario(page, { label, listTag }) {
  const editor = page.locator('.message-rich-editor .ProseMirror');
  await editor.click();
  await clickToolbar(page, label);
  const html = await getEditorHtml(page);
  if (countListItems(html, listTag) !== 1) {
    throw new Error(`${label} blank ON: expected 1 list item, got ${countListItems(html, listTag)}. HTML: ${html}`);
  }
  await page.keyboard.type('hello');
  await clickToolbar(page, label);
  const offHtml = await getEditorHtml(page);
  if (countListItems(offHtml, listTag) !== 0) {
    throw new Error(`${label} blank OFF: expected 0 list items. HTML: ${offHtml}`);
  }
  if (!offHtml.includes('hello')) {
    throw new Error(`${label} blank OFF: text missing`);
  }
}

async function runMultiLineHardBreakScenario(page, { label, listTag }) {
  const editor = page.locator('.message-rich-editor .ProseMirror');
  await editor.click();
  await page.keyboard.type('line one');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('line two');
  await page.keyboard.press('Control+A');
  await clickToolbar(page, label);

  let html = await getEditorHtml(page);
  if (countListItems(html, listTag) !== 2) {
    throw new Error(`${label} multi-line: expected 2 list items, got ${countListItems(html, listTag)}. HTML: ${html}`);
  }

  await page.keyboard.press('Control+A');
  await clickToolbar(page, label);
  html = await getEditorHtml(page);
  if (countListItems(html, listTag) !== 0) {
    throw new Error(`${label} multi-line OFF: expected 0 list items. HTML: ${html}`);
  }
  if (!html.includes('line one') || !html.includes('line two')) {
    throw new Error(`${label} multi-line OFF: text missing`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const conversationId = await loginViaApi(page);
    await page.goto(`${BASE}/messages?conversation_id=${conversationId}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('.message-rich-editor .ProseMirror', { timeout: 20000 });

    await runScenario(page, { label: 'Bullet list', listTag: 'ul' });
    await page.locator('.message-rich-editor .ProseMirror').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    await runBlankLineScenario(page, { label: 'Bullet list', listTag: 'ul' });
    await page.locator('.message-rich-editor .ProseMirror').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    await runMultiLineHardBreakScenario(page, { label: 'Bullet list', listTag: 'ul' });
    await page.locator('.message-rich-editor .ProseMirror').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    await runScenario(page, { label: 'Numbered list', listTag: 'ol' });
    await page.locator('.message-rich-editor .ProseMirror').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    await runBlankLineScenario(page, { label: 'Numbered list', listTag: 'ol' });
    await page.locator('.message-rich-editor .ProseMirror').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    await runMultiLineHardBreakScenario(page, { label: 'Numbered list', listTag: 'ol' });

    console.log('PASS: composer list toggle browser check');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
