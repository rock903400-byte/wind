import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const sharedJsContent = readFileSync(resolve('assets/shared.js'), 'utf-8');
const mbJsContent = readFileSync(resolve('assets/member-balance.js'), 'utf-8');

function createDOMSandbox() {
  const elements = new Map();
  const listeners = new Map();
  const storage = new Map();
  let currentActive = null;
  const confirms = [];
  const alerts = [];
  const toasts = [];
  const fetchCalls = [];

  function makeEl(id, tagName = 'div', extra = {}) {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      hidden: false,
      value: '',
      innerText: '',
      innerHTML: '',
      attributes: new Map(),
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); },
        toggle(c, force) {
          if (force === undefined) {
            this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c);
          } else if (force) {
            this._classes.add(c);
          } else {
            this._classes.delete(c);
          }
        }
      },
      style: {},
      isConnected: true,
      children: [],
      parentNode: null,
      getAttribute(k) { return this.attributes.get(k) || null; },
      setAttribute(k, v) { this.attributes.set(k, String(v)); },
      removeAttribute(k) { this.attributes.delete(k); },
      focus() {
        currentActive = this;
        domDocument.activeElement = this;
      },
      closest(sel) {
        if (sel === '[data-action]' && this.attributes.has('data-action')) return this;
        if (sel === 'dialog' && this.tagName === 'DIALOG') return this;
        return null;
      },
      querySelectorAll(sel) {
        return [];
      },
      querySelector(sel) {
        return null;
      },
      addEventListener(evt, fn) {
        if (!listeners.has(this)) listeners.set(this, new Map());
        const m = listeners.get(this);
        if (!m.has(evt)) m.set(evt, []);
        m.get(evt).push(fn);
      },
      dispatchEvent(evt) {
        const m = listeners.get(this);
        if (m && m.has(evt.type)) {
          for (const fn of m.get(evt.type)) {
            fn(evt);
          }
        }
      },
      showModal() { this.open = true; },
      close() { this.open = false; },
      ...extra
    };
    elements.set(id, el);
    return el;
  }

  const cloudBanner = makeEl('cloud-banner', 'div', { hidden: true });
  const cloudBannerText = makeEl('cloud-banner-text', 'span');
  const cloudBtnRetry = makeEl('cloud-btn-retry', 'button');
  const cloudBtnDiscard = makeEl('cloud-btn-discard', 'button', { hidden: true });
  const gasApiUrl = makeEl('gas-api-url', 'input', { value: 'https://script.google.com/macros/s/test/exec' });
  const gasAdminKey = makeEl('gas-admin-key', 'input', { value: 'test_admin_key_123' });
  const clientBaseUrl = makeEl('client-base-url', 'input', { value: 'https://wind.rock903400.workers.dev/' });
  const tabBtnActive = makeEl('tab-members', 'button', {
    classList: {
      _classes: new Set(['tab-btn', 'active']),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    }
  });

  const docListeners = new Map();

  const domDocument = {
    activeElement: null,
    body: makeEl('body', 'body'),
    getElementById(id) {
      if (elements.has(id)) return elements.get(id);
      return makeEl(id);
    },
    querySelector(sel) {
      if (sel === '.tab-btn.active') return tabBtnActive;
      if (sel === '#cloud-banner') return cloudBanner;
      if (sel === '#cloud-banner-text') return cloudBannerText;
      if (sel === '#cloud-btn-retry') return cloudBtnRetry;
      if (sel === '#cloud-btn-discard') return cloudBtnDiscard;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.tab-btn.active') return [tabBtnActive];
      return [];
    },
    addEventListener(evt, fn) {
      if (!docListeners.has(evt)) docListeners.set(evt, []);
      docListeners.get(evt).push(fn);
    },
    removeEventListener(evt, fn) {
      if (docListeners.has(evt)) {
        const arr = docListeners.get(evt);
        const idx = arr.indexOf(fn);
        if (idx !== -1) arr.splice(idx, 1);
      }
    },
    dispatchEvent(evt) {
      if (docListeners.has(evt.type)) {
        for (const fn of docListeners.get(evt.type)) {
          fn(evt);
        }
      }
    }
  };

  const localStorageMock = {
    getItem(k) { return storage.get(k) || null; },
    setItem(k, v) { storage.set(k, String(v)); },
    removeItem(k) { storage.delete(k); },
    clear() { storage.clear(); }
  };

  const sandbox = {
    document: domDocument,
    window: {
      location: { href: 'http://localhost/member-balance.html' }
    },
    localStorage: localStorageMock,
    confirm: (msg) => { confirms.push(msg); return true; },
    alert: (msg) => { alerts.push(msg); },
    showToast: (msg) => { toasts.push(msg); },
    crypto: {
      getRandomValues(arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      }
    },
    fetch: async (url, opts) => {
      fetchCalls.push({ url, opts });
      return {
        json: async () => ({
          success: true,
          data: {
            members: [{ id: 'MEM-001', name: '雲端會員', token: 'a1b2c3d4e5f6789012345678abcdef01' }],
            recharges: [],
            tasks: []
          }
        })
      };
    },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    URL: globalThis.URL,
    Date: globalThis.Date,
    JSON: globalThis.JSON,
    Math: globalThis.Math,
    String: globalThis.String,
    Boolean: globalThis.Boolean,
    Array: globalThis.Array,
    Set: globalThis.Set,
    Map: globalThis.Map,
    Uint8Array: globalThis.Uint8Array
  };

  const ctx = vm.createContext(sandbox);
  vm.runInContext(sharedJsContent, ctx);
  vm.runInContext(mbJsContent, ctx);

  const evalInCtx = (code) => vm.runInContext(code, ctx);

  return { ctx, evalInCtx, sandbox, elements, storage, confirms, alerts, toasts, fetchCalls, domDocument };
}

describe('實機與瀏覽器行為自動化驗證測試套件', () => {

  describe('H-1: 本機未同步變更保護與衝突橫幅測試', () => {
    it('情境 1: 開頁有未同步變更時，autoLoadFromCloud 不覆蓋本機資料並顯示衝突橫幅', async () => {
      const { evalInCtx, elements, storage } = createDOMSandbox();
      
      const localDB = {
        members: [{ id: 'MEM-LOCAL-999', name: '本機未上傳客戶', token: 'localtoken123' }],
        recharges: [],
        tasks: [],
        _demo: false
      };
      storage.set('feilu_member_system_v1', JSON.stringify(localDB));
      storage.set('feilu_synced_hash', '99999:100'); // 上次同步指紋不同

      evalInCtx('loadDatabase()');
      await evalInCtx('autoLoadFromCloud()');

      const db = evalInCtx('DB');
      const cloudLoadOk = evalInCtx('cloudLoadOk');
      assert.equal(db.members.length, 1);
      assert.equal(db.members[0].name, '本機未上傳客戶');
      assert.equal(cloudLoadOk, true);

      const banner = elements.get('cloud-banner');
      const bannerText = elements.get('cloud-banner-text');
      const btnDiscard = elements.get('cloud-btn-discard');
      assert.equal(banner.hidden, false);
      assert.match(bannerText.innerText, /本機有尚未上傳的變更/);
      assert.equal(btnDiscard.hidden, false);
    });

    it('情境 2: 點擊「捨棄本機變更，改用雲端」後確認覆蓋載入', async () => {
      const { evalInCtx, elements, storage, confirms } = createDOMSandbox();
      
      const localDB = {
        members: [{ id: 'MEM-LOCAL-999', name: '本機未上傳客戶', token: 'localtoken123' }],
        recharges: [],
        tasks: [],
        _demo: false
      };
      storage.set('feilu_member_system_v1', JSON.stringify(localDB));
      storage.set('feilu_synced_hash', '99999:100');

      evalInCtx('loadDatabase()');
      await evalInCtx('autoLoadFromCloud()');

      evalInCtx('discardLocalAndLoadCloud()');
      assert.equal(confirms.length, 1);

      await new Promise(r => setTimeout(r, 20));

      const db = evalInCtx('DB');
      assert.equal(db.members[0].name, '雲端會員');
      const banner = elements.get('cloud-banner');
      assert.equal(banner.hidden, true);
    });

    it('情境 3: 全新或無衝突環境下，自動載入成功並記錄同步指紋', async () => {
      const { evalInCtx, storage } = createDOMSandbox();
      
      evalInCtx('loadDatabase()');
      await evalInCtx('autoLoadFromCloud()');

      const cloudLoadOk = evalInCtx('cloudLoadOk');
      const db = evalInCtx('DB');
      assert.equal(cloudLoadOk, true);
      assert.equal(db.members[0].name, '雲端會員');
      const savedHash = storage.get('feilu_synced_hash');
      assert.ok(savedHash, '應記錄同步指紋');
    });

    it('I-2 情境 1: 無 feilu_synced_hash 但本機有既有資料時（遷移情境），保守視為未同步並阻止覆蓋', async () => {
      const { evalInCtx, elements, storage } = createDOMSandbox();
      
      const localDB = {
        members: [{ id: 'MEM-LEGACY-001', name: '既有舊客戶', token: 'legacytoken' }],
        recharges: [],
        tasks: [],
        _demo: false
      };
      storage.set('feilu_member_system_v1', JSON.stringify(localDB));
      storage.delete('feilu_synced_hash'); // 模擬升級前舊版瀏覽器

      evalInCtx('loadDatabase()');
      await evalInCtx('autoLoadFromCloud()');

      const db = evalInCtx('DB');
      assert.equal(db.members.length, 1);
      assert.equal(db.members[0].name, '既有舊客戶', '舊版既有資料不得被靜默覆蓋');
      
      const banner = elements.get('cloud-banner');
      assert.equal(banner.hidden, false, '應跳出衝突橫幅通知管理者處置');
    });

    it('I-2 情境 2: 無 feilu_synced_hash 且本機無資料時（全新瀏覽器），正常載入不誤報衝突', async () => {
      const { evalInCtx, elements, storage } = createDOMSandbox();
      storage.delete('feilu_member_system_v1');
      storage.delete('feilu_synced_hash');

      evalInCtx('loadDatabase()');
      await evalInCtx('autoLoadFromCloud()');

      const db = evalInCtx('DB');
      assert.equal(db.members.length, 1);
      assert.equal(db.members[0].name, '雲端會員');
      
      const banner = elements.get('cloud-banner');
      assert.equal(banner.hidden, true, '全新環境不應跳出衝突橫幅');
    });

    it('I-1: 載入失敗後 cloudLoadOk 必須重設為 false，同步功能被即時阻擋', async () => {
      const { evalInCtx, sandbox, alerts } = createDOMSandbox();
      
      // 模擬先前連線成功
      evalInCtx('cloudLoadOk = true');

      // 模擬後續重試時發生網路失敗
      sandbox.fetch = async () => { throw new Error('Network Offline'); };
      await evalInCtx('autoLoadFromCloud()');

      const cloudLoadOk = evalInCtx('cloudLoadOk');
      assert.equal(cloudLoadOk, false, '載入失敗後 cloudLoadOk 必須重設為 false');

      // 嘗試同步至 Google 試算表，應被 alert 阻擋且零網路請求
      await evalInCtx('syncToGoogleSheets()');
      assert.equal(alerts.length, 1);
      assert.match(alerts[0], /未成功從雲端載入資料/);
    });
  });

  describe('W-07 & F-2: 焦點捕獲與降級焦點測試', () => {
    it('W-07: Dialog 內按 Tab 到達最後元素時應循環回第一個元素 (Focus Trap)', () => {
      const { evalInCtx, domDocument } = createDOMSandbox();
      
      const input1 = domDocument.getElementById('member-name');
      const btnSave = domDocument.getElementById('btn-save-member');
      const modal = domDocument.getElementById('modal-member');
      modal.querySelectorAll = () => [input1, btnSave];

      evalInCtx('openDialog(document.getElementById("modal-member"))');
      
      // 焦點在最後元素 btnSave，按下 Tab
      domDocument.activeElement = btnSave;
      let defaultPrevented = false;
      evalInCtx(`
        onDialogKeydown({
          key: 'Tab',
          shiftKey: false,
          preventDefault: () => { defaultPrevented = true; }
        });
      `);

      assert.equal(domDocument.activeElement, input1, '焦點應循環回到第一個輸入框');
    });

    it('W-07: Dialog 內按 Shift+Tab 在第一個元素時應循環至最後一個元素', () => {
      const { evalInCtx, domDocument } = createDOMSandbox();
      
      const input1 = domDocument.getElementById('member-name');
      const btnSave = domDocument.getElementById('btn-save-member');
      const modal = domDocument.getElementById('modal-member');
      modal.querySelectorAll = () => [input1, btnSave];

      evalInCtx('openDialog(document.getElementById("modal-member"))');
      
      // 焦點在第一個元素 input1，按下 Shift+Tab
      domDocument.activeElement = input1;
      evalInCtx(`
        onDialogKeydown({
          key: 'Tab',
          shiftKey: true,
          preventDefault: () => {}
        });
      `);

      assert.equal(domDocument.activeElement, btnSave, '焦點應循環到最後一個按鈕');
    });

    it('W-07: 按 Escape 應自動關閉 Modal 並將焦點歸還原觸發元素', () => {
      const { evalInCtx, domDocument } = createDOMSandbox();
      
      const triggerBtn = domDocument.getElementById('btn-open-member-modal');
      const modal = domDocument.getElementById('modal-member');
      triggerBtn.isConnected = true;
      domDocument.activeElement = triggerBtn;

      evalInCtx('openDialog(document.getElementById("modal-member"))');
      assert.equal(modal.classList.contains('active'), true);

      evalInCtx(`
        onDialogKeydown({
          key: 'Escape',
          preventDefault: () => {}
        });
      `);

      assert.equal(modal.classList.contains('active'), false);
      assert.equal(domDocument.activeElement, triggerBtn, '關閉後焦點應回到原觸發按鈕');
    });

    it('F-2: 在 Drawer 內重新產生 Token 重繪 DOM 後關閉 Drawer，焦點應平穩降級至 active tab', () => {
      const { evalInCtx, elements, domDocument } = createDOMSandbox();
      
      const drawer = elements.get('drawer-panel');
      evalInCtx('activeDialog = document.getElementById("drawer-panel")');
      evalInCtx('dialogReturnFocus = { isConnected: false, focus: () => {} }');
      evalInCtx('closeDrawer()');

      const activeTab = elements.get('tab-members');
      assert.equal(domDocument.activeElement, activeTab);
    });
  });

  describe('G-4: 客戶專屬連結 Base URL 測試', () => {
    it('預設指向線上正式站網址，非本機 file://', () => {
      const { evalInCtx, storage } = createDOMSandbox();
      storage.delete('feilu_client_base_url');

      const clientUrl = evalInCtx(`
        (() => {
          const member = { token: 'testtoken123' };
          const base = safeUrl(localStorage.getItem(CLIENT_BASE_URL_KEY) || DEFAULT_CLIENT_BASE_URL) || DEFAULT_CLIENT_BASE_URL;
          return new URL('client-balance.html?token=' + encodeURIComponent(member.token), base).toString();
        })()
      `);

      assert.equal(clientUrl, 'https://wind.rock903400.workers.dev/client-balance.html?token=testtoken123');
    });

    it('防禦 javascript: 惡意 base URL 注入', () => {
      const { evalInCtx, storage } = createDOMSandbox();
      storage.set('feilu_client_base_url', 'javascript:alert(1)');

      const clientUrl = evalInCtx(`
        (() => {
          const member = { token: 'testtoken123' };
          const base = safeUrl(localStorage.getItem(CLIENT_BASE_URL_KEY) || DEFAULT_CLIENT_BASE_URL) || DEFAULT_CLIENT_BASE_URL;
          return new URL('client-balance.html?token=' + encodeURIComponent(member.token), base).toString();
        })()
      `);

      assert.equal(clientUrl, 'https://wind.rock903400.workers.dev/client-balance.html?token=testtoken123');
    });
  });

  describe('F-1: 舊版示範資料指紋回推測試', () => {
    it('舊瀏覽器 localStorage 存有示範資料但無 _demo 欄位時，loadDatabase 自動識別並補上 _demo: true', () => {
      const { evalInCtx, storage } = createDOMSandbox();
      
      const legacyDemoDB = {
        members: [{ id: 'MEM-2026-001', name: '林秘書長', token: 'a1b2c3d4e5f6789012345678abcdef01' }],
        recharges: [],
        tasks: []
        // 注意：無 _demo 欄位
      };
      storage.set('feilu_member_system_v1', JSON.stringify(legacyDemoDB));

      evalInCtx('loadDatabase()');

      const db = evalInCtx('DB');
      assert.equal(db._demo, true, '應自動識別 DEMO_TOKENS 並設定 _demo: true');
    });

    it('一般正式會員資料且無 _demo 欄位時，loadDatabase 正確設定 _demo: false', () => {
      const { evalInCtx, storage } = createDOMSandbox();
      
      const realDB = {
        members: [{ id: 'MEM-2026-999', name: '真實客戶', token: 'realrandomtoken99999999999999999' }],
        recharges: [],
        tasks: []
      };
      storage.set('feilu_member_system_v1', JSON.stringify(realDB));

      evalInCtx('loadDatabase()');

      const db = evalInCtx('DB');
      assert.equal(db._demo, false, '真實資料不應誤標為 _demo');
    });
  });
});
