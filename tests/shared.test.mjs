import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedCode = fs.readFileSync(path.join(__dirname, '../assets/shared.js'), 'utf-8');

const sandbox = {
  window: {
    location: {
      href: 'https://wind.rock903400.workers.dev/member-balance.html'
    }
  },
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {}, className: '', innerText: '' })
  },
  setTimeout: () => {},
  URL: globalThis.URL
};

vm.createContext(sandbox);
vm.runInContext(sharedCode, sandbox);

const { escapeHTML, formatDate, safeUrl, getPreferredTheme, applyTheme, toggleTheme } = sandbox;

test('escapeHTML tests', async (t) => {
  await t.test('handles 0 correctly without returning empty string', () => {
    assert.equal(escapeHTML(0), '0');
  });

  await t.test('handles null and undefined', () => {
    assert.equal(escapeHTML(null), '');
    assert.equal(escapeHTML(undefined), '');
  });

  await t.test('escapes special characters', () => {
    assert.equal(escapeHTML('<script>alert("xss" & \'test\')</script>'), '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;');
  });
});

test('formatDate tests', async (t) => {
  await t.test('formats ISO strings with T to yyyy-MM-dd', () => {
    assert.equal(formatDate('2026-08-28T10:20:30.000Z'), '2026-08-28');
  });

  await t.test('returns plain date string slice', () => {
    assert.equal(formatDate('2026-08-28'), '2026-08-28');
  });

  await t.test('returns empty string for falsy input', () => {
    assert.equal(formatDate(''), '');
    assert.equal(formatDate(null), '');
    assert.equal(formatDate(undefined), '');
  });
});

test('safeUrl tests', async (t) => {
  await t.test('allows valid https, http, and mailto URLs', () => {
    assert.equal(safeUrl('https://docs.google.com/spreadsheets/d/123'), 'https://docs.google.com/spreadsheets/d/123');
    assert.equal(safeUrl('http://example.com/task'), 'http://example.com/task');
    assert.equal(safeUrl('mailto:user@example.com'), 'mailto:user@example.com');
  });

  await t.test('blocks javascript: URLs in various obfuscations', () => {
    assert.equal(safeUrl('javascript:alert(1)'), '');
    assert.equal(safeUrl('JaVaScRiPt:alert(1)'), '');
    assert.equal(safeUrl('  javascript:alert(1)'), '');
    assert.equal(safeUrl('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(safeUrl('vbscript:msgbox(1)'), '');
  });

  await t.test('resolves relative URLs safely', () => {
    assert.equal(safeUrl('client-balance.html?token=123'), 'https://wind.rock903400.workers.dev/client-balance.html?token=123');
  });

  await t.test('handles empty or non-string inputs', () => {
    assert.equal(safeUrl(''), '');
    assert.equal(safeUrl(null), '');
    assert.equal(safeUrl(undefined), '');
  });
});

test('theme engine tests', async (t) => {
  await t.test('defaults to dark when no storage or matchMedia', () => {
    assert.equal(getPreferredTheme(), 'dark');
  });

  await t.test('handles applyTheme safely without crashing in sandbox', () => {
    assert.doesNotThrow(() => applyTheme('light'));
    assert.doesNotThrow(() => applyTheme('dark'));
  });

  await t.test('handles toggleTheme safely without crashing in sandbox', () => {
    assert.doesNotThrow(() => toggleTheme());
  });
});

