/* Headless render check for src/dock.js: the immersive dock must not throw with
   an empty live object, a running session, or a series with sparse data.
   Run: node tools/dock-smoke.cjs */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + msg); if (!cond) failures++; };

function createElement(type, props, ...children) {
  return { type, props: Object.assign({}, props, children.length ? { children: children.length === 1 ? children[0] : children } : null) };
}
const ReactStub = {
  createElement,
  Fragment: 'Fragment',
  useState(init) { return [typeof init === 'function' ? init() : init, () => {}]; },
};

const store = new Map();
const fakeStorage = {
  getItem(k) { return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
};
const BASELINE_KEY = 'dsh-haloflux:scene:baselines:v1';

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'dock.js'), 'utf8');
const sandbox = {
  React: ReactStub, console, Math, Date, Number, String, Object, Array, JSON, isFinite, isNaN,
  window: { localStorage: fakeStorage }, localStorage: fakeStorage,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.__D = HalofluxDock;', sandbox, { filename: 'dock.js' });
const D = sandbox.__D;

ok(!!D && typeof D.Dock === 'function' && typeof D.CSS === 'string', 'dock.js defines Dock + CSS');
ok(D.CSS.includes('.hfx-dock') && D.CSS.includes('.hfx-card'), 'CSS covers the dock and its cards');

function find(node, pred) {
  if (!node || typeof node !== 'object') return null;
  if (pred(node)) return node;
  const kids = node.props && node.props.children;
  const list = Array.isArray(kids) ? kids : (kids ? [kids] : []);
  for (const k of list) { const hit = find(k, pred); if (hit) return hit; }
  return null;
}
function findAll(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (pred(node)) out.push(node);
  const kids = node.props && node.props.children;
  const list = Array.isArray(kids) ? kids : (kids ? [kids] : []);
  for (const k of list) findAll(k, pred, out);
  return out;
}

/* empty live: no session data at all */
let tree = null, threw = null;
try { tree = D.Dock({ live: {}, onExit() {} }); } catch (e) { threw = e; }
ok(!threw, 'empty live renders without throwing' + (threw ? ': ' + threw.message : ''));
ok(!!find(tree, (n) => n.props && String(n.props.className || '').includes('hfx-dock')), 'empty live produces the dock root');
ok(tree && String(JSON.stringify(tree)).includes('等待'), 'empty live shows a waiting state');

/* running session with one sample and one tool */
const live = {
  running: true, model: 'deepseek-chat', step: 4, turn: 2, tps: 41.6,
  outputTokens: 1204, inputTokens: 8123, totalTokens: 9327, contextTokens: 8123, contextLimit: 65536,
  cacheHit: 0.62, reasoning: '先确认项目结构，再读 README。', recentText: '正在读取 README',
  tools: [{ id: 't1', name: 'read', state: 'ok', dur: 120 }, { id: 't2', name: 'pwsh', state: 'running', dur: 0 }],
  feed: [{ kind: 'tool', text: 'read(lab.html)' }, { kind: 'user', text: '解析这个项目' }],
  series: [{ t: 1, tps: 12, cache: 0.2, out: 400 }, { t: 2, tps: 38, cache: 0.6, out: 900 }, { t: 3, tps: 41.6, cache: 0.62, out: 1204 }],
};
threw = null;
try { tree = D.Dock({ live, onExit() {} }); } catch (e) { threw = e; }
ok(!threw, 'running live renders without throwing' + (threw ? ': ' + threw.message : ''));
const text = JSON.stringify(tree);
ok(text.includes('RUNNING') && text.includes('deepseek-chat'), 'header shows RUNNING + model');
ok(text.includes('62.0%') && text.includes('41'), 'header shows cache hit and tok/s');
ok(text.includes('REASONING'), 'thinking panel shows streamed reasoning');

const chart = find(tree, (n) => typeof n.type === 'function' && n.type.name === 'Chart');
ok(!!chart, 'dock mounts the chart component');
threw = null;
try { chart.type({ live }); } catch (e) { threw = e; }
ok(!threw, 'chart renders a populated series' + (threw ? ': ' + threw.message : ''));

const sparse = D.Dock({ live: Object.assign({}, live, { series: [] }), onExit() {} });
ok(!!sparse, 'dock renders with an empty series (chart waiting state)');

/* ---------------- shared scene / difference field ---------------- */
function renderScene(liveObj) {
  const tree = D.Dock({ live: liveObj, onExit() {} });
  const el = find(tree, (n) => typeof n.type === 'function' && n.type.name === 'SceneField');
  if (!el) return null;
  return el.type({ live: liveObj });
}
function countCells(node, pred) {
  let n = 0;
  (function walk(x) {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) { for (const y of x) walk(y); return; }
    if (x.type === 'i' && x.props && pred(x.props)) n++;
    const kids = x.props && x.props.children;
    const list = Array.isArray(kids) ? kids : (kids ? [kids] : []);
    for (const k of list) walk(k);
  })(node);
  return n;
}

const dockTree = D.Dock({ live, onExit() {} });
const cards = findAll(dockTree, (n) => n.type === 'section' && String(n.props.className || '').includes('hfx-card'));
ok(cards.length === 4, 'dock still has exactly four cards (' + cards.length + ')');
const sceneCard = cards[2];
ok(!!sceneCard && String(sceneCard.props.className || '').includes('hfx-scene-card'),
  'the third card is the scene host (no fifth card)');
ok(!!find(sceneCard, (n) => typeof n.type === 'function' && n.type.name === 'SceneField'),
  'SceneField renders inside the third card');
ok(!find(dockTree, (n) => n.props && String(n.props.className || '').includes('hfx-heat')),
  'old heat strip is gone, not duplicated');
ok(!find(dockTree, (n) => n.props && n.props.className === 'hfx-scene'),
  'no extra full-width scene row was added');
ok(!find(dockTree, (n) => n.props && String(n.props.className || '').includes('hfx-tools')),
  'old tool list is gone, replaced by the scene');

const ctxLive = Object.assign({}, live, {
  model: 'deepseek-flash', contextTokens: 100000, contextLimit: 256000,
  compactions: 1, prunes: 13,
  todayUsage: { input: 2000000, output: 0, cacheRead: 0, cacheWrite: 0 },
  sessionUsage: { input: 2000000, output: 0, cacheRead: 0, cacheWrite: 0 },
  turnUsage: { input: 1000000, output: 0, cacheRead: 0, cacheWrite: 0 },
});
const ctxTree = D.Dock({
  live: ctxLive,
  billing: { wallets: [{ currency: 'CNY', balance: '12.34' }], bonus: [] },
  onExit() {},
});
const ctxText = JSON.stringify(ctxTree);
ok(ctxText.includes('LEFT') && ctxText.includes('156.0k'), 'context card shows remaining tokens');
ok(ctxText.includes('COMPACT') && ctxText.includes('PRUNE'), 'context card shows compaction + prune counters');
ok(ctxText.includes('¥12.34'), 'context card shows the real account balance amount');
ok(ctxText.includes('COST') && ctxText.includes('CNY'), 'cost section has a same-level COST heading with CNY currency');
ok(ctxText.includes('BALANCE') && ctxText.includes('TODAY') && ctxText.includes('—'),
  'cost section leaves today unavailable without platform data');
const noAccount = D.Dock({ live: ctxLive, billing: { unavailable: true, note: 'NO ACCOUNT' }, onExit() {} });
const noAccountText = JSON.stringify(noAccount);
ok(noAccountText.includes('BALANCE'), 'unavailable balance keeps the balance slot as —');
const platformTree = D.Dock({
  live: ctxLive, billing: { wallets: [{ currency: 'CNY', balance: '12.34' }], bonus: [] },
  platform: { ok: true, currency: 'CNY', balance: 8.95, bonus: 0, todayCost: 22.43 },
  onExit() {},
});
const platformText = JSON.stringify(platformTree);
ok(platformText.includes('¥8.95') && platformText.includes('¥22.43') && !platformText.includes('¥12.34'),
  'platform bridge overrides wallet balance and today estimate');

const emptyScene = renderScene({ toolCalls: 0, toolResults: 0, running: false });
ok(!!emptyScene, 'dock mounts SceneField');
const emptyText = JSON.stringify(emptyScene);
ok(emptyText.includes('IMPLEMENTATION / TOOL EXECUTION'), 'implementation panel title is rendered');
ok(emptyText.includes('WAITING FOR DSH EVENTS'), 'no events renders WAITING FOR DSH EVENTS');
ok(emptyText.includes('NO COMPLETED SAMPLES'), 'missing samples renders empty state');
ok(!emptyText.includes('REFERENCE') && !emptyText.includes('DIFFERENCE') && !emptyText.includes('CAPTURE'),
  'removed Reference / Difference / Capture UI is gone');
ok(!emptyText.includes('%'), 'no fabricated comparison percentage');

const sceneLive = {
  running: true, sessionId: 'S1', toolCalls: 3, toolResults: 2, lastToolEventAt: Date.now(),
  tools: [
    { id: 'run', name: 'pwsh', state: 'running', start: Date.now(), dur: 0 },
    { id: 'c1', name: 'read', state: 'ok', start: 2, t: 3, dur: 1200 },
    { id: 'c2', name: 'pwsh', state: 'error', start: 4, t: 5, dur: 800 },
  ],
};
const implScene = renderScene(sceneLive);
const implText = JSON.stringify(implScene);
ok(countCells(implScene, (p) => p['data-dur'] !== undefined) === 2,
  'only completed tools enter the matrix');
ok(implText.includes('2/100'), 'implementation count is real');
ok(implText.includes('COLLECTING') && implText.includes('PARTIAL'), 'status tags are data-driven');
ok(implText.includes('hfx-impl-grid'), 'single implementation matrix fills the card');
ok(countCells(implScene, (p) => String(p.className || '').includes('hfx-cell')) === 100,
  'the matrix keeps exactly 100 cells');
ok(!implText.includes('%') && !implText.includes('REFERENCE') && !implText.includes('DIFFERENCE'),
  'implementation-only panel renders no removed layers');

const liveScene = renderScene({
  running: true, sessionId: 'S1', toolCalls: 2, toolResults: 2, lastToolEventAt: Date.now(),
  tools: [
    { id: 'c1', name: 'read', state: 'ok', start: 2, t: 3, dur: 1200 },
    { id: 'c2', name: 'pwsh', state: 'error', start: 4, t: 5, dur: 800 },
  ],
});
ok(JSON.stringify(liveScene).includes('LIVE'), 'LIVE only after real completed events');

console.log(failures ? '\n' + failures + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
