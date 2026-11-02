/**
 * HALOFLUX for DSH — immersive dock.
 *
 * The bottom instrument panel that rises while a run is in progress. Every
 * number comes from the live session adapter (src/live.js): streamed reasoning,
 * tool calls with durations, output tokens, tok/s, context occupancy and the
 * prompt-cache hit ratio. Nothing here is synthetic.
 *
 * Plain script fragment: no import / export. Defines exactly one symbol,
 * `HalofluxDock`.
 */
const HalofluxDock = (() => {
  'use strict';

  const CSS = `
.hfx-dock{position:absolute;left:0;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;gap:6px;
  padding:0 12px 12px;transform:translate3d(0,112%,0);opacity:0;pointer-events:none;
  transition:transform 900ms cubic-bezier(.16,1,.3,1),opacity 600ms ease;
  will-change:transform,opacity;backface-visibility:hidden;
  font:10px/1.5 "JetBrains Mono",Consolas,ui-monospace,monospace;color:#cfd2d8;letter-spacing:.04em}
.hfx-root[data-immersive="1"] .hfx-dock{transform:translate3d(0,0,0);opacity:1}
.hfx-dock-head{display:flex;align-items:center;gap:10px;height:30px;padding:0 10px;pointer-events:auto;
  border:1px solid rgba(58,62,70,.75);background:rgba(6,7,9,.94);white-space:nowrap;overflow:hidden}
.hfx-dock-head .b{font-weight:800;letter-spacing:1.6px;color:#f4f5f7}
.hfx-dock-head .sep{color:#3f434a}
.hfx-dock-head .pill{padding:1px 6px;border:1px solid rgba(240,166,198,.5);color:#f0a6c6;font-weight:800;letter-spacing:1px}
.hfx-dock-head .pill.run{background:rgba(240,166,198,.14)}
.hfx-dock-head .pill.idle{color:#6b6f78;border-color:#3a3e46;background:none}
.hfx-dock-head .k{color:#6b6f78}
.hfx-dock-head .v{color:#f4f5f7;font-variant-numeric:tabular-nums}
.hfx-dock-head .grow{flex:1}
.hfx-exit{cursor:pointer;border:1px solid #3a3e46;background:#0e0f12;color:#cfd2d8;font:inherit;
  padding:3px 9px;letter-spacing:.08em}
.hfx-exit:hover{border-color:#cfd2d8;color:#fff}
.hfx-dock-grid{display:grid;grid-template-columns:1.55fr 1.2fr 1fr .85fr;gap:8px;height:238px;min-height:0}
.hfx-card{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;padding:7px 9px 6px;
  border:1px solid rgba(58,62,70,.6);background:rgba(8,9,11,.94);
  transform:translate3d(0,26px,0);opacity:0;transition:transform 760ms cubic-bezier(.16,1,.3,1),opacity 460ms ease;
  will-change:transform,opacity;backface-visibility:hidden;pointer-events:auto}
.hfx-root[data-immersive="1"] .hfx-card{transform:translate3d(0,0,0);opacity:1}
.hfx-root[data-immersive="1"] .hfx-card:nth-child(1){transition-delay:40ms}
.hfx-root[data-immersive="1"] .hfx-card:nth-child(2){transition-delay:110ms}
.hfx-root[data-immersive="1"] .hfx-card:nth-child(3){transition-delay:180ms}
.hfx-root[data-immersive="1"] .hfx-card:nth-child(4){transition-delay:250ms}
.hfx-card h4{margin:0 0 5px;font-size:8.5px;font-weight:800;letter-spacing:1.4px;color:#f4f5f7;display:flex;align-items:center;gap:6px}
.hfx-card h4 .dot{width:4px;height:4px;background:#98e0cf;border-radius:50%}
.hfx-card h4 .right{margin-left:auto;font-weight:600;color:#6b6f78;letter-spacing:.06em}
.hfx-think{flex:0 0 auto;max-height:74px;overflow:hidden;padding:4px 6px;margin-bottom:5px;border-left:2px solid rgba(240,166,198,.55);
  background:rgba(240,166,198,.05);color:#dfe2e8;font-size:9.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.hfx-think .hd{color:#f0a6c6;font-weight:800;letter-spacing:.1em;font-size:8px}
.hfx-think .caret{display:inline-block;width:5px;height:9px;background:#f4f5f7;vertical-align:-1px;margin-left:2px;animation:hfxbl 1s steps(1) infinite}
@keyframes hfxbl{50%{opacity:0}}
.hfx-events{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:1px}
.hfx-events div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#8b93a7;font-size:9px}
.hfx-events .vb{display:inline-block;width:46px;font-weight:800;letter-spacing:.04em}
.hfx-events .tool{color:#98e0cf}.hfx-events .error{color:#ff8fb4}
.hfx-events .user{color:#f0a6c6}.hfx-events .assistant{color:#f4f5f7}
.hfx-events .turn{color:#6b6f78}
.hfx-chart{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}
.hfx-chart-hd{position:absolute;top:0;right:0;z-index:1;font-size:7.5px;color:#6b6f78;letter-spacing:.08em;pointer-events:none}
.hfx-chart-hd b{color:#98e0cf;font-weight:700}
.hfx-chart svg{width:100%;flex:1;min-height:0;overflow:visible}
.hfx-legend{display:flex;gap:12px;color:#6b6f78;font-size:8.5px;padding-top:2px}
.hfx-legend b{font-weight:700}
.hfx-legend .tps b{color:#98e0cf}.hfx-legend .cache b{color:#f0a6c6}.hfx-legend .avg b{color:#9aa0ad}
.hfx-big{display:flex;gap:14px;align-items:baseline;margin:1px 0 4px}
.hfx-big .m{display:flex;flex-direction:column;gap:1px}
.hfx-big .m .l{color:#6b6f78;font-size:8px;letter-spacing:.1em}
.hfx-big .m .n{color:#f4f5f7;font-size:17px;font-weight:800;line-height:1.15;font-variant-numeric:tabular-nums}
.hfx-big .m .n.pink{color:#f0a6c6}.hfx-big .m .n.teal{color:#98e0cf}
.hfx-bar{height:5px;background:#1c1e23;margin:3px 0 5px;overflow:hidden}
.hfx-bar i{display:block;height:100%;background:linear-gradient(90deg,#98e0cf,#f0a6c6);width:0;transition:width .4s ease}
.hfx-meta{display:flex;flex-wrap:wrap;gap:2px 10px;color:#6b6f78;font-size:8.5px;margin-top:auto}
.hfx-meta b{color:#cfd2d8;font-weight:600}
.hfx-ctx-top{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 4px}
.hfx-ctx-cell{display:flex;flex-direction:column;gap:1px;min-width:0}
.hfx-ctx-cell .l{font-size:7px;letter-spacing:.12em;color:#6b6f78}
.hfx-ctx-cell .n{font-size:18px;line-height:1.05;font-weight:800;color:#f4f5f7;font-variant-numeric:tabular-nums;white-space:nowrap}
.hfx-ctx-cell.left .n{color:#98e0cf}
.hfx-ctx-line{display:flex;justify-content:space-between;gap:6px;margin-top:2px;font-size:7px;color:#6b6f78;white-space:nowrap}
.hfx-ctx-line b{color:#cfd2d8;font-weight:700}
.hfx-ctx-money{display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-top:3px;font-size:7px;color:#6b6f78;white-space:nowrap}
.hfx-ctx-money b{font-size:9px;color:#98e0cf;font-weight:700}
.hfx-ctx-money.bal{margin-top:5px;padding-top:4px;border-top:1px solid rgba(58,62,70,.5)}
.hfx-ctx-money.bal .lbl{letter-spacing:.12em}
.hfx-ctx-money.bal b{font-size:13px;color:#f0a6c6}
.hfx-ctx-body{display:grid;grid-template-rows:1fr 1fr;flex:1;min-height:0}
.hfx-ctx-half{display:flex;flex-direction:column;justify-content:space-between;gap:2px;min-height:0;padding-bottom:5px}
.hfx-ctx-bottom{display:flex;flex-direction:column;gap:3px;min-height:0;padding-top:6px;
  border-top:1px solid rgba(58,62,70,.55)}
.hfx-ctx-balance{display:flex;flex-direction:column;gap:0;min-width:0;flex:0 0 auto}
.hfx-ctx-balance .lbl{font-size:7px;letter-spacing:.14em;color:#6b6f78}
.hfx-ctx-balance b{font-size:22px;line-height:1.05;font-weight:800;color:#f0a6c6;font-variant-numeric:tabular-nums;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hfx-ctx-balance .note{font-size:6px;letter-spacing:.1em;color:#6b6f78;margin-top:1px}
.hfx-ctx-h{flex:0 0 auto;margin-bottom:1px!important}
.hfx-ctx-costs{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1;min-height:0;align-items:end;padding-bottom:2px}
.hfx-ctx-costs .cell{display:flex;flex-direction:column;justify-content:flex-end;gap:3px;min-width:0;min-height:0}
.hfx-ctx-costs .lbl{font-size:7px;letter-spacing:.12em;color:#6b6f78}
.hfx-ctx-costs .note{font-size:6px;letter-spacing:.08em;color:#6b6f78;margin-top:1px}
.hfx-ctx-costs b{font-size:24px;line-height:1.05;font-weight:700;color:#98e0cf;font-variant-numeric:tabular-nums;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hfx-ctx-costs .session b{color:#f0a6c6}
/* ---- shared scene / difference field (inside the third card) ---- */
.hfx-scene-card{position:relative;overflow:visible!important;padding:6px 8px}
.hfx-impl-grid{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr);
  gap:2px;padding:4px;border:1px solid rgba(152,224,207,.18);background:rgba(4,5,7,.62);
  box-shadow:inset 0 0 22px rgba(0,0,0,.55),0 0 18px rgba(240,166,198,.04);min-width:0}
.hfx-impl-grid .hfx-cell{height:100%;border-color:rgba(58,62,70,.28)}
.hfx-impl-grid .hfx-cell.empty{background:rgba(10,12,16,.55);border-style:solid;border-color:rgba(58,62,70,.18)}
.hfx-impl-grid .hfx-cell.hi{outline:1px solid rgba(244,245,247,.9);outline-offset:1px;
  box-shadow:0 0 10px rgba(240,166,198,.55),inset 0 0 6px rgba(240,166,198,.35);z-index:2}
.hfx-impl-grid .hfx-scene-empty{inset:0}
.hfx-impl-grid .hfx-scene-empty{inset:0}
.hfx-scene-body{display:flex;flex-direction:column;gap:4px;flex:1;min-height:0;width:100%;box-sizing:border-box;overflow:hidden}
.hfx-scene-hd{display:flex;flex-direction:row;align-items:flex-end;justify-content:space-between;gap:8px;white-space:nowrap;overflow:hidden;flex:0 0 auto;line-height:1.15}
.hfx-title{display:flex;flex-direction:column;min-width:0}
.hfx-scene-hd b{font-size:8.5px;letter-spacing:1px;color:#f4f5f7}
.hfx-scene-hd .sub{font-size:6.8px;color:#6b6f78;letter-spacing:.04em}
.hfx-heat-key{display:flex;align-items:center;gap:4px;font-size:6px;color:#6b6f78;letter-spacing:.06em;flex:0 0 auto;padding-bottom:1px}
.hfx-heat-key i{display:block;width:54px;height:4px;border:1px solid rgba(240,166,198,.25);
  background:linear-gradient(90deg,rgba(240,166,198,.10),rgba(240,166,198,.95))}
.hfx-scene-hd .grow{flex:1}
.hfx-scene-tags{display:flex;gap:3px;flex-wrap:wrap;flex:0 0 auto;align-items:center;min-width:0;max-height:36px;overflow:hidden}
.hfx-scene-tags .grow{flex:1}
.hfx-cap{pointer-events:auto;font:inherit;font-size:6.8px;line-height:10px;padding:0 5px;letter-spacing:.04em;white-space:nowrap;
  border:1px solid rgba(240,166,198,.5);background:rgba(240,166,198,.08);color:#f0a6c6;cursor:pointer}
.hfx-cap:hover:not(:disabled){background:rgba(240,166,198,.18);color:#fff}
.hfx-cap:disabled{opacity:.35;cursor:default}
.hfx-scene-tags .tag{font-size:6.8px;line-height:10px;letter-spacing:.03em;padding:0 3px;border:1px solid #3a3e46;color:#8b93a7;white-space:nowrap}
.hfx-scene-tags .tag.ok{color:#98e0cf;border-color:rgba(152,224,207,.4)}
.hfx-scene-tags .tag.warn{color:#f0a6c6;border-color:rgba(240,166,198,.4)}
.hfx-scene-tags .tag.dim{color:#6b6f78}
.hfx-scene-duo{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:0 0 auto;width:100%;min-width:0}
.hfx-scene-col{position:relative;min-width:0}
.hfx-scene-col h5{margin:0 0 1px;font-size:6.8px;font-weight:700;letter-spacing:.08em;color:#6b6f78;display:flex;gap:4px;white-space:nowrap;overflow:hidden}
.hfx-scene-col h5 b{color:#cfd2d8;font-weight:700}
.hfx-scene-cells{display:grid;grid-template-columns:repeat(8,1fr);grid-auto-rows:1fr;gap:2px;height:58px}
.hfx-cell{position:relative;min-width:0;height:100%;background:#14161a;border:1px solid rgba(58,62,70,.35);font-style:normal}
.hfx-cell.empty{background:transparent;border-style:dashed;border-color:rgba(58,62,70,.45)}
.hfx-cell.zero{background:rgba(207,210,216,.08)}
.hfx-cell.zero:after{content:'';position:absolute;left:50%;top:50%;width:2px;height:2px;margin:-1px 0 0 -1px;background:#9aa0ad;border-radius:50%}
.hfx-cell.clip{box-shadow:inset 0 0 0 1px rgba(244,245,247,.55)}
.hfx-cell.hi{outline:1px solid rgba(244,245,247,.75);outline-offset:1px;z-index:1}
.hfx-cell.dim{opacity:.32}
.hfx-scene-empty{position:absolute;inset:9px 0 0;display:flex;align-items:center;justify-content:center;
  background:rgba(8,9,11,.55);color:#6b6f78;font-size:6.8px;letter-spacing:.08em;pointer-events:none;text-align:center}
.hfx-scene-empty.diff{inset:9px 0 0}
.hfx-scene-diff{position:relative;flex:0 0 auto;min-width:0}
.hfx-scene-diff .hd{display:flex;justify-content:space-between;gap:6px;font-size:6.8px;letter-spacing:.04em;color:#6b6f78;margin-bottom:1px;white-space:nowrap;overflow:hidden}
.hfx-scene-diff .hd b{color:#cfd2d8}
.hfx-scene-diff .cells{position:relative;display:grid;grid-template-columns:repeat(24,1fr);gap:1px;height:14px}
.hfx-cell.diff{border-color:rgba(58,62,70,.3)}
.hfx-cell.diff.missing{background:#101217;border-color:rgba(58,62,70,.22)}
.hfx-cell.diff:before{content:'';position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(207,210,216,.16)}
.hfx-cell.diff .bar{position:absolute;top:2px;bottom:2px;background:#98e0cf}
.hfx-cell.diff .bar.slow{background:#f0a6c6}
.hfx-cell.diff.eq:after{content:'';position:absolute;left:50%;top:50%;width:2px;height:2px;margin:-1px 0 0 -1px;background:#9aa0ad;border-radius:50%}
.hfx-scene-stats{display:flex;flex-wrap:wrap;gap:1px 6px;font-size:6.8px;line-height:1.3;color:#6b6f78;letter-spacing:.02em;flex:0 0 auto;min-width:0;max-height:40px;overflow:hidden}
.hfx-scene-stats b{color:#cfd2d8;font-weight:700}
.hfx-scene-stats .teal{color:#98e0cf}.hfx-scene-stats .pink{color:#f0a6c6}
.hfx-scene-stats .warn{color:#f0a6c6}
.hfx-scene-tip{position:absolute;right:0;bottom:calc(100% + 4px);z-index:60;width:282px;padding:7px 9px;
  border:1px solid rgba(58,62,70,.9);background:rgba(6,7,9,.97);box-shadow:0 10px 30px rgba(0,0,0,.6);
  color:#cfd2d8;font-size:8.5px;line-height:1.5;pointer-events:none;display:none}
.hfx-scene-tip.on{display:block}
.hfx-scene-tip b{color:#f4f5f7;letter-spacing:.1em;display:block;margin-bottom:3px}
.hfx-scene-tip .row{display:flex;justify-content:space-between;gap:10px;white-space:nowrap}
.hfx-scene-tip .k{color:#6b6f78}.hfx-scene-tip .v{color:#f4f5f7}
.hfx-scene-tip .v.pink{color:#f0a6c6}.hfx-scene-tip .v.teal{color:#98e0cf}
.hfx-empty{color:#3f434a;font-size:9px;margin:auto}
@media (max-width:1400px){
  .hfx-scene-duo{grid-template-columns:1fr;gap:3px}
  .hfx-scene-cells{height:32px}
  .hfx-scene-empty{inset:8px 0 0}
  .hfx-scene-stats{max-height:34px}}
@media (max-width:1100px){.hfx-dock-grid{grid-template-columns:1.4fr 1fr;height:auto}.hfx-card{height:150px}
  .hfx-scene-tags{display:none}.hfx-scene-hd .sub{display:none}.hfx-heat-key{display:none}.hfx-scene-cells{height:20px}.hfx-scene-diff .cells{height:8px}
  .hfx-scene-stats{font-size:6px;max-height:20px}
  .hfx-ctx-top{gap:6px;margin:2px 0 4px}.hfx-ctx-cell .n{font-size:15px}.hfx-ctx-line{font-size:6px;margin-top:1px}
  .hfx-ctx-bottom{gap:3px;margin-top:3px;padding-top:4px}.hfx-ctx-balance b{font-size:16px}.hfx-ctx-costs b{font-size:9px}
  .hfx-ctx-h{font-size:7px;margin-bottom:2px!important}.hfx-ctx-balance .lbl,.hfx-ctx-costs .lbl{font-size:6px}}
@media (max-height:760px){.hfx-dock-grid{height:196px}.hfx-big .m .n{font-size:15px}
  .hfx-scene-cells{height:42px}.hfx-scene-diff .cells{height:11px}}
`;

  const h = React.createElement;

  function fmt(n) {
    const v = Number(n);
    if (!isFinite(v) || v <= 0) return '0';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e4) return (v / 1e3).toFixed(1) + 'k';
    return String(Math.round(v));
  }

  function pct(v) {
    const n = Number(v);
    return isFinite(n) && n > 0 ? Math.round(n * 100) + '%' : '—';
  }

  function kindLabel(kind) {
    if (kind === 'tool') return 'tool';
    if (kind === 'error') return 'error';
    if (kind === 'user') return 'you';
    if (kind === 'assistant') return 'model';
    if (kind === 'turn') return 'turn';
    return kind || '—';
  }

  /* =========================================================
     SHARED SCENE / DIFFERENCE FIELD
     Reference / Implementation / Difference for completed tool
     executions. Implementation reads `live.tools` only; Reference
     is an explicitly captured local baseline and is never
     synthesised or copied from the current run.
     ========================================================= */

  const SCENE_CELLS = 100;
  const SCENE_SOURCE = 'tool/call → tool/result';

  function sceneNumber(value) {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }

  function scenePercentile(sorted, p) {
    if (!sorted.length) return undefined;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
    return sorted[idx];
  }

  function sceneMedian(sorted) {
    if (!sorted.length) return undefined;
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function sceneClock(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return 'N/A';
    const d = new Date(n);
    const pad = (v) => String(v).padStart(2, '0');
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function sceneStatus(status) {
    if (status === 'error') return 'ERROR';
    if (status === 'running') return 'RUNNING';
    if (status === 'ok' || status === 'success' || status === 'completed' || status === undefined) return 'SUCCESS';
    return String(status).toUpperCase();
  }

  function sceneSigned(value, digits, suffix) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'N/A';
    const sign = n > 0 ? '+' : '';
    return sign + n.toFixed(digits) + suffix;
  }

  const BASELINE_KEY = 'dsh-haloflux:scene:baselines:v1';
  const BASELINE_SCHEMA = 1;

  function sceneStore() {
    try {
      if (typeof window !== 'undefined' && window && window.localStorage) return window.localStorage;
    } catch { /* ignore */ }
    return null;
  }

  /** Completed real tool events, in event order. `dur` is only present when both
      the call and result carried a real event time. No UI clock is used here. */
  function completedTools(live) {
    const tools = (live && Array.isArray(live.tools)) ? live.tools : [];
    return tools
      .filter((t) => t && t.state !== 'running' && sceneNumber(t.dur) !== undefined)
      .map((t) => ({
        id: t.id,
        key: t.matchKey || t.id,          // never synthesised: absent means group-only
        tool: t.name || t.id || 'tool',
        dur: sceneNumber(t.dur),
        status: t.state === 'error' ? 'error' : 'ok',
        start: sceneNumber(t.start),
        t: sceneNumber(t.t),
        turn: Number.isFinite(Number(t.turn)) ? Number(t.turn) : undefined,
        step: Number.isFinite(Number(t.step)) ? Number(t.step) : undefined,
        sessionId: typeof t.sessionId === 'string' ? t.sessionId : undefined,
        source: SCENE_SOURCE,
      }));
  }

  /** Captured samples are never also counted as implementation: after a
      capture, only calls that started after it (or in another session) are new. */
  function filterImplementation(all, baseline, sessionId) {
    if (!baseline) return all.slice(-SCENE_CELLS);
    const ids = new Set(baseline.samples.map((s) => s.id).filter(Boolean));
    const otherSession = !!(baseline.sessionId && sessionId && baseline.sessionId !== sessionId);
    return all.filter((s) => {
      if (s.id && ids.has(s.id)) return false;
      if (otherSession) return true;
      const started = s.start !== undefined ? s.start : s.t;
      return started !== undefined && started > baseline.createdAt;
    }).slice(-SCENE_CELLS);
  }

  function normalizeBaseline(raw) {
    if (!raw || typeof raw !== 'object' || raw.schema !== BASELINE_SCHEMA) return null;
    const createdAt = Number(raw.createdAt);
    if (!Number.isFinite(createdAt) || createdAt <= 0) return null;
    if (!Array.isArray(raw.samples)) return null;
    const samples = [];
    for (const s of raw.samples) {
      if (!s || typeof s.tool !== 'string' || !s.tool) continue;
      const dur = sceneNumber(s.dur);
      if (dur === undefined) continue;
      samples.push({
        id: typeof s.id === 'string' && s.id ? s.id : undefined,
        tool: s.tool,
        dur,
        status: s.status === 'error' ? 'error' : 'ok',
        start: sceneNumber(s.start),
        t: sceneNumber(s.t),
        turn: Number.isFinite(Number(s.turn)) ? Number(s.turn) : undefined,
        step: Number.isFinite(Number(s.step)) ? Number(s.step) : undefined,
        sessionId: typeof s.sessionId === 'string' ? s.sessionId : undefined,
        source: typeof s.source === 'string' ? s.source : 'captured',
      });
    }
    if (!samples.length) return null;
    return {
      schema: BASELINE_SCHEMA,
      id: typeof raw.id === 'string' && raw.id ? raw.id : 'baseline-' + createdAt,
      createdAt,
      sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : undefined,
      source: typeof raw.source === 'string' ? raw.source : 'captured',
      samples: samples.slice(-SCENE_CELLS),
    };
  }

  function loadBaseline() {
    const store = sceneStore();
    if (!store) return { baseline: null, count: 0, error: 'NO STORAGE' };
    let raw;
    try { raw = store.getItem(BASELINE_KEY); } catch { return { baseline: null, count: 0, error: 'READ ERROR' }; }
    if (!raw) return { baseline: null, count: 0, error: null };
    let data;
    try { data = JSON.parse(raw); } catch { return { baseline: null, count: 0, error: 'INVALID BASELINE' }; }
    if (!data || data.schema !== BASELINE_SCHEMA || !Array.isArray(data.baselines)) {
      return { baseline: null, count: 0, error: 'INVALID BASELINE' };
    }
    const valid = data.baselines.map(normalizeBaseline).filter(Boolean);
    if (!valid.length) return { baseline: null, count: 0, error: 'INVALID BASELINE' };
    valid.sort((a, b) => b.createdAt - a.createdAt);
    return { baseline: valid[0], count: valid.length, error: null };
  }

  /** Append only. A corrupt store is reported, never overwritten; existing
      baseline entries are preserved byte-for-byte inside the array. */
  function saveBaseline(baseline) {
    const store = sceneStore();
    if (!store) return { ok: false, error: 'NO STORAGE' };
    let data = { schema: BASELINE_SCHEMA, baselines: [] };
    let raw;
    try { raw = store.getItem(BASELINE_KEY); } catch { return { ok: false, error: 'READ ERROR' }; }
    if (raw) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'INVALID BASELINE' }; }
      if (!parsed || parsed.schema !== BASELINE_SCHEMA || !Array.isArray(parsed.baselines)) {
        return { ok: false, error: 'INVALID BASELINE' };
      }
      data = parsed;
    }
    data.baselines.push(baseline);
    try { store.setItem(BASELINE_KEY, JSON.stringify(data)); } catch { return { ok: false, error: 'SAVE FAILED' }; }
    return { ok: true };
  }

  function makeBaseline(live, samples) {
    const createdAt = Date.now();
    return {
      schema: BASELINE_SCHEMA,
      id: 'bl-' + createdAt + '-' + Math.random().toString(36).slice(2, 6),
      createdAt,
      sessionId: live && typeof live.sessionId === 'string' ? live.sessionId : undefined,
      source: 'captured:current-session',
      samples: samples.slice(-SCENE_CELLS).map((s) => ({
        id: s.id, tool: s.tool, dur: s.dur, status: s.status,
        start: s.start, t: s.t, turn: s.turn, step: s.step,
        sessionId: s.sessionId || (live && live.sessionId),
        source: SCENE_SOURCE,
      })),
    };
  }

  function sceneSamples(live, baseline) {
    const all = completedTools(live);
    const impl = filterImplementation(all, baseline, live && live.sessionId);
    const ref = baseline
      ? baseline.samples.slice(-SCENE_CELLS).map((s) => ({
          id: s.id,
          key: s.id,
          tool: s.tool,
          dur: s.dur,
          status: s.status,
          ts: s.t !== undefined ? s.t : s.start,
          source: 'baseline ' + baseline.id,
          start: s.start,
          t: s.t,
          turn: s.turn,
          step: s.step,
          sessionId: s.sessionId,
        }))
      : [];
    return { impl, ref, all };
  }

  /* One-to-one only: a pair requires the same stable key (call id or an
     explicit matchKey). Tool names alone are not a pairing rule; that case
     falls through to the group-level medians below. */
  function scenePairs(ref, impl) {
    const used = new Set();
    return impl.map((s) => {
      if (!s.key) return null;
      const hit = ref.find((r) => r.key === s.key && !used.has(r.key));
      if (!hit) return null;
      used.add(hit.key);
      return hit;
    });
  }

  function sceneGroupDeltas(ref, impl) {
    const names = new Set();
    ref.forEach((r) => names.add(r.tool));
    impl.forEach((s) => names.add(s.tool));
    const out = [];
    names.forEach((name) => {
      const rv = ref.filter((r) => r.tool === name).map((r) => r.dur).sort((a, b) => a - b);
      const iv = impl.filter((s) => s.tool === name).map((s) => s.dur).sort((a, b) => a - b);
      if (!rv.length || !iv.length) return;
      const rm = sceneMedian(rv);
      const im = sceneMedian(iv);
      out.push({ tool: name, ref: rm, impl: im, pct: rm > 0 ? ((im - rm) / rm) * 100 : undefined });
    });
    return out;
  }

  function buildScene(live, baseline) {
    const { impl, ref, all } = sceneSamples(live, baseline);
    const pairs = scenePairs(ref, impl);
    const durations = ref.concat(impl).map((s) => s.dur);
    const sortedDur = durations.slice().sort((a, b) => a - b);
    const p95 = scenePercentile(sortedDur, 0.95);
    const scaleMax = Math.max(1, p95 || 0);
    const clipped = durations.filter((d) => d > scaleMax).length;

    const diffs = [];
    pairs.forEach((r, i) => {
      if (!r) return;
      const ms = impl[i].dur - r.dur;
      const pct = r.dur > 0 ? (ms / r.dur) * 100 : undefined;
      diffs.push({ index: i, ref: r, impl: impl[i], ms, pct });
    });
    const pcts = diffs.filter((d) => d.pct !== undefined).map((d) => d.pct).sort((a, b) => a - b);
    const groupDeltas = diffs.length === 0 ? sceneGroupDeltas(ref, impl) : [];
    const groupPcts = groupDeltas.filter((g) => g.pct !== undefined).map((g) => g.pct).sort((a, b) => a - b);

    return {
      ref, impl, pairs, diffs,
      allCount: all.length,
      capturedCount: baseline ? baseline.samples.length : 0,
      scaleMax, clipped,
      matched: diffs.length,
      faster: diffs.filter((d) => d.ms < 0).length,
      slower: diffs.filter((d) => d.ms > 0).length,
      equal: diffs.filter((d) => d.ms === 0).length,
      medianPct: sceneMedian(pcts),
      p95Pct: scenePercentile(pcts, 0.95),
      maxAbsPct: Math.max(1, ...pcts.map((v) => Math.abs(v))),
      groupDeltas,
      groupMedianPct: sceneMedian(groupPcts),
    };
  }

  function tipForImpl(scene, i) {
    const impl = scene.impl[i];
    if (!impl) return null;
    const ref = scene.pairs[i] || null;
    const ms = ref ? impl.dur - ref.dur : undefined;
    const pct = ref && ref.dur > 0 ? (ms / ref.dur) * 100 : undefined;
    return {
      key: 'impl:' + i, group: 'IMPLEMENTATION', index: i,
      tool: impl.tool, status: impl.status, dur: impl.dur, ts: impl.ts, source: impl.source,
      ref, deltaMs: ms, deltaPct: pct,
    };
  }

  function tipForRef(scene, i) {
    const ref = scene.ref[i];
    if (!ref) return null;
    const index = scene.pairs.indexOf(ref);
    const impl = index >= 0 ? scene.impl[index] : null;
    const ms = impl ? impl.dur - ref.dur : undefined;
    const pct = impl && ref.dur > 0 ? (ms / ref.dur) * 100 : undefined;
    return {
      key: 'ref:' + i, group: 'REFERENCE', index: index >= 0 ? index : -1,
      tool: ref.tool, status: ref.status, dur: ref.dur, ts: ref.ts, source: ref.source,
      ref, impl, deltaMs: ms, deltaPct: pct,
    };
  }

  function tipForDiff(scene, i) {
    const impl = scene.impl[i];
    const ref = scene.pairs[i] || null;
    if (!impl) return null;
    const d = scene.diffs.find((x) => x.index === i);
    return {
      key: 'diff:' + i, group: 'DIFFERENCE', index: i,
      tool: impl.tool, status: impl.status, dur: impl.dur, ts: impl.ts, source: impl.source,
      ref, deltaMs: d ? d.ms : undefined, deltaPct: d ? d.pct : undefined,
    };
  }

  function sceneCellTip(tip) {
    if (!tip) return null;
    const rows = [
      ['GROUP', 'IMPLEMENTATION'],
      ['TOOL', tip.tool || 'N/A'],
      ['STATUS', sceneStatus(tip.status)],
      ['DURATION', tip.dur !== undefined ? Math.round(tip.dur) + ' ms' : 'N/A'],
      ['TIMESTAMP', sceneClock(tip.ts)],
      ['SOURCE', tip.source || 'tool/call → tool/result'],
    ];
    return h('div', { className: 'hfx-scene-tip on' },
      h('b', null, 'TOOL EXECUTION DETAIL'),
      rows.map((row, i) => h('div', { className: 'row', key: i },
        h('span', { className: 'k' }, row[0]),
        h('span', { className: 'v' }, row[1])
      ))
    );
  }

  function sceneSourceState(live) {
    if (live && live.sourceError) return 'SOURCE ERROR';
    if (!live || !live.toolCalls) return 'WAITING FOR DSH EVENTS';
    const now = Date.now();
    const pending = !!(live.tools && live.tools.some((t) => t && t.state === 'running'
      && t.start !== undefined && now - t.start < 120000));
    if (live.running === true && pending) return 'COLLECTING';
    const at = Number(live.lastToolEventAt) || 0;
    const age = at ? now - at : Infinity;
    if (live.running === true && age < 15000) return 'LIVE';
    if (live.running === true) return 'STALE';
    return live.toolResults > 0 ? 'STALE' : 'NO DATA';
  }

  function SceneField({ live }) {
    const [hover, setHover] = React.useState(null);
    const [pinned, setPinned] = React.useState(null);
    const scene = buildScene(live, null);
    const sourceState = sceneSourceState(live);
    const tip = hover || pinned;
    const dimming = !!tip;

    const tags = [];
    tags.push([sourceState, sourceState === 'LIVE' ? 'ok' : (sourceState === 'SOURCE ERROR' || sourceState === 'STALE') ? 'warn' : 'dim']);
    if (scene.impl.length > 0 && scene.impl.length < SCENE_CELLS) tags.push(['PARTIAL', 'dim']);
    if (scene.impl.length === 0) tags.push(['NO SAMPLES', 'dim']);

    const implCells = Array.from({ length: SCENE_CELLS }, (_, i) => {
      const s = scene.impl[i];
      if (!s) return h('i', { key: 'i' + i, className: 'hfx-cell empty', 'data-empty': '1' });
      const hi = !!tip && !!tip.impl && tip.impl.key === s.key;
      const cls = 'hfx-cell' + (s.dur === 0 ? ' zero' : '') + (s.dur > scene.scaleMax ? ' clip' : '')
        + (hi ? ' hi' : '') + (dimming && !hi ? ' dim' : '');
      return h('i', {
        key: 'i' + i, className: cls, 'data-tool': s.tool, 'data-dur': String(s.dur),
        style: s.dur > 0 ? { background: 'linear-gradient(135deg,rgba(240,166,198,' + (0.08 + 0.86 * Math.pow(Math.min(1, s.dur / scene.scaleMax), 0.65)).toFixed(2) + '),rgba(214,126,158,' + (0.06 + 0.62 * Math.pow(Math.min(1, s.dur / scene.scaleMax), 0.65)).toFixed(2) + '))' } : undefined,
        onMouseEnter: () => setHover(tipForImpl(scene, i)),
        onMouseLeave: () => setHover(null),
        onClick: () => setPinned((prev) => (prev && prev.key === 'impl:' + i ? null : tipForImpl(scene, i))),
      });
    });

    const scaleText = scene.impl.length === 0
      ? '—'
      : (scene.scaleMax >= 1000 ? (scene.scaleMax / 1000).toFixed(1) + 's' : Math.round(scene.scaleMax) + 'ms')
        + (scene.clipped ? ' · ' + scene.clipped + ' CLIP' : '');

    return h(React.Fragment, null,
      h('div', { className: 'hfx-scene-body' },
        h('div', { className: 'hfx-scene-hd' },
          h('div', { className: 'hfx-title' },
            h('b', null, 'IMPLEMENTATION / TOOL EXECUTION'),
            h('span', { className: 'sub' }, 'tool/call → tool/result')
          ),
          h('div', { className: 'hfx-heat-key' },
            h('span', null, 'LOW'), h('i'), h('span', null, 'HIGH')
          )
        ),
        h('div', { className: 'hfx-scene-tags' },
          tags.map((tag, i) => h('span', { key: i, className: 'tag ' + tag[1] }, tag[0]))
        ),
        h('div', { className: 'hfx-impl-grid' },
          implCells,
          scene.impl.length === 0
            ? h('div', { className: 'hfx-scene-empty' },
                live && live.toolCalls ? 'WAITING FOR TOOL EVENTS' : 'NO COMPLETED SAMPLES')
            : null
        ),
        h('div', { className: 'hfx-scene-stats' },
          h('span', null, 'SAMPLES ', h('b', null, scene.impl.length + '/' + SCENE_CELLS)),
          h('span', null, 'CALLS ', h('b', null, (live && live.toolCalls) || 0)),
          h('span', null, 'RESULTS ', h('b', null, (live && live.toolResults) || 0)),
          h('span', null, 'LAST ', h('b', null, sceneClock(live && live.lastToolEventAt))),
          h('span', null, 'SCALE ', h('b', null, scaleText))
        )
      ),
      sceneCellTip(tip)
    );
  }

  /* Instantaneous arrivals on the teal line (each 50 ms slice / slice length),
     the 2 s average as a faint trend, cache hit on the pink dashed line.
     The x axis is sample order; 600 samples = 30 s at 20 Hz. */
  function Chart({ live }) {
    const data = (live && live.series ? live.series : []).slice(-600);
    const W = 320, H = 92, PAD = 4;
    if (data.length < 2) {
      return h('div', { className: 'hfx-empty' }, '等待词元…');
    }
    const maxTps = Math.max(30, ...data.map((d) => Number(d.tps) || 0));
    const x = (i) => (i / (data.length - 1)) * (W - 2) + 1;
    const yTps = (v) => H - PAD - ((Number(v) || 0) / maxTps) * (H - PAD * 2);
    const yCache = (v) => H - PAD - Math.min(1, Number(v) || 0) * (H - PAD * 2);
    const pts = (fn) => data.map((d, i) => x(i).toFixed(1) + ',' + fn(d).toFixed(1)).join(' ');
    const inst = pts((d) => yTps(d.tps));
    const avg = pts((d) => yTps(d.avg == null ? d.tps : d.avg));
    const area = 'M ' + x(0).toFixed(1) + ',' + H + ' L ' + inst.split(' ').join(' L ')
      + ' L ' + x(data.length - 1).toFixed(1) + ',' + H + ' Z';
    const last = data[data.length - 1] || {};
    return h('div', { className: 'hfx-chart' },
      h('div', { className: 'hfx-chart-hd' }, 'MAX ', h('b', null, Math.round(maxTps)), ' TOK/S'),
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' },
        [0.25, 0.5, 0.75].map((g) => h('line', {
          key: g, x1: 0, x2: W, y1: H * g, y2: H * g,
          stroke: 'rgba(58,62,70,.45)', strokeWidth: 0.6,
        })),
        h('path', { d: area, fill: 'rgba(152,224,207,.10)', stroke: 'none' }),
        h('polyline', { points: avg, fill: 'none', stroke: 'rgba(244,245,247,.28)', strokeWidth: 0.9, strokeDasharray: '2 3', strokeLinejoin: 'round' }),
        h('polyline', { points: inst, fill: 'none', stroke: '#98e0cf', strokeWidth: 1.4, strokeLinejoin: 'round' }),
        h('polyline', { points: pts((d) => yCache(d.cache)), fill: 'none', stroke: '#f0a6c6', strokeWidth: 1.1, strokeDasharray: '3 2', strokeLinejoin: 'round' })
      ),
      h('div', { className: 'hfx-legend' },
        h('span', { className: 'tps' }, 'NOW ', h('b', null, Math.round(last.tps || 0))),
        h('span', { className: 'avg' }, 'AVG ', h('b', null, Math.round(last.avg || 0))),
        h('span', { className: 'cache' }, 'CACHE ', h('b', null, pct(last.cache))),
        h('span', null, 'PEAK ', h('b', null, Math.round(maxTps)))
      )
    );
  }

  /* DeepSeek-V4.1-Flash CNY rate card, per 1M tokens
     (input / output / cache read / cache write). CNY is the billing currency:
     unknown models show — instead of inventing a price. */
  const MODEL_PRICES = {
    'deepseek-flash': { input: 2.00, output: 8.00, cacheRead: 0.20, cacheWrite: 0 },
    'deepseek-v4.1-flash': { input: 2.00, output: 8.00, cacheRead: 0.20, cacheWrite: 0 },
  };
  function modelPrice(model) {
    const key = String(model || '').toLowerCase().replace(/^deepseek-ai\//, '');
    return MODEL_PRICES[key];
  }
  function usageCost(usage, price) {
    if (!usage || !price) return undefined;
    const input = Number(usage.input) || 0;
    const output = Number(usage.output) || 0;
    const cacheRead = Number(usage.cacheRead) || 0;
    const cacheWrite = Number(usage.cacheWrite) || 0;
    return (input * price.input + output * price.output + cacheRead * price.cacheRead + cacheWrite * price.cacheWrite) / 1e6;
  }
  function fmtCost(value) {
    if (!Number.isFinite(value)) return '—';
    if (value <= 0) return '¥0.00';
    if (value < 0.0001) return '<¥0.0001';
    if (value >= 1) return '¥' + value.toFixed(2);
    return '¥' + value.toFixed(4);
  }
  function balanceSummary(billing) {
    if (!billing) return { text: '—', title: 'account balance unavailable', note: '' };
    if (billing.unavailable) {
      return {
        text: '—',
        title: 'DeepSeek account balance unavailable',
        note: billing.note || 'UNAVAILABLE',
      };
    }
    const all = [].concat(Array.isArray(billing.wallets) ? billing.wallets : [],
      Array.isArray(billing.bonus) ? billing.bonus : []);
    if (!all.length) return { text: '—', title: 'account balance unavailable', note: 'NO ACCOUNT' };
    const currency = ['CNY', 'USD'].find((code) => all.some((w) => w && w.currency === code))
      || (all[0] && all[0].currency) || 'USD';
    const total = all.filter((w) => w && w.currency === currency)
      .reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
    const symbol = currency === 'CNY' ? '¥' : '$';
    return {
      text: symbol + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      title: 'DeepSeek account balance · ' + currency,
      note: '',
    };
  }

  function platformBalanceSummary(platform) {
    if (!platform) return null;
    const value = Number(platform.balance);
    if (!isFinite(value)) return null;
    const bonus = Number(platform.bonus) || 0;
    const currency = platform.currency || 'CNY';
    const symbol = currency === 'CNY' ? '¥' : '$';
    const total = value + bonus;
    return {
      text: symbol + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      title: 'DeepSeek Platform actual balance · ' + currency,
      note: '',
    };
  }

  function Dock({ live, onExit, billing, platform }) {
    const events = (live && live.feed ? live.feed : []).slice(-7);
    const running = !!(live && live.running);
    const ctxUsed = Number(live && live.contextTokens) || 0;
    const ctxMax = Number(live && live.contextLimit) || 0;
    const ctxPct = ctxMax > 0 ? Math.min(100, (ctxUsed / ctxMax) * 100) : 0;
    const ctxLeft = ctxMax > 0 ? Math.max(0, ctxMax - ctxUsed) : undefined;
    const compactions = Number(live && live.compactions) || 0;
    const prunes = Number(live && live.prunes) || 0;
    const price = modelPrice(live && live.model);
    const platformToday = platform ? Number(platform.todayCost) : NaN;
    const todayCost = Number.isFinite(platformToday)
      ? platformToday
      : (price ? usageCost(live && live.todayUsage, price) : undefined);
    const balance = platformBalanceSummary(platform) || balanceSummary(billing);
    const reasoning = (live && live.reasoning) || '';
    const streamTail = reasoning || (live && live.recentText ? String(live.recentText).slice(-320) : '');

    return h(React.Fragment, null,
      h('style', null, CSS),
      h('div', { className: 'hfx-dock' },
        h('div', { className: 'hfx-dock-head' },
          h('span', { className: 'b' }, 'DEEPVIBE-DSH // LIVE'),
          h('span', { className: 'sep' }, '·'),
          h('span', { className: 'pill ' + (running ? 'run' : 'idle') }, running ? 'RUNNING' : 'IDLE'),
          h('span', { className: 'k' }, 'MODEL'), h('span', { className: 'v' }, (live && live.model) || '—'),
          h('span', { className: 'k' }, 'STEP'), h('span', { className: 'v' }, (live && live.step) || 0),
          h('span', { className: 'k' }, 'TURN'), h('span', { className: 'v' }, (live && live.turn) || 0),
          h('span', { className: 'k' }, 'TOK/S'), h('span', { className: 'v' }, Math.round((live && live.tps) || 0)),
          h('span', { className: 'k' }, 'CACHE'), h('span', { className: 'v' }, pct(live && live.cacheHit)),
          h('span', { className: 'grow' }),
          h('button', { className: 'hfx-exit', onClick: onExit, title: 'Esc' }, 'EXIT · ESC')
        ),
        h('div', { className: 'hfx-dock-grid' },
          h('section', { className: 'hfx-card' },
            h('h4', null, h('span', { className: 'dot' }), 'THINKING / EVENTS', h('span', { className: 'right' }, running ? 'LIVE' : 'SETTLED')),
            h('div', { className: 'hfx-think' },
              h('span', { className: 'hd' }, reasoning ? 'REASONING ' : 'STREAM '),
              streamTail || (running ? '等待模型输出…' : '本轮已结束'),
              running ? h('span', { className: 'caret' }) : null
            ),
            h('div', { className: 'hfx-events' },
              events.length === 0
                ? h('div', { className: 'hfx-empty' }, '等待事件')
                : events.map((e, i) => h('div', { key: i, className: e.kind || '' },
                    h('span', { className: 'vb' }, kindLabel(e.kind)), e.text))
            )
          ),
          h('section', { className: 'hfx-card' },
            h('h4', null, h('span', { className: 'dot' }), 'TOKENS / CACHE'),
            h('div', { className: 'hfx-big' },
              h('div', { className: 'm' }, h('span', { className: 'l' }, 'OUT'), h('span', { className: 'n' }, fmt(live && live.outputTokens))),
              h('div', { className: 'm' }, h('span', { className: 'l' }, 'CACHE HIT'), h('span', { className: 'n pink' }, pct(live && live.cacheHit))),
              h('div', { className: 'm' }, h('span', { className: 'l' }, 'INST TOK/S'), h('span', { className: 'n teal' }, Math.round((live && live.instTps) || 0)))
            ),
            h(Chart, { live })
          ),
          h('section', { className: 'hfx-card hfx-scene-card' },
            h(SceneField, { live })
          ),
          h('section', { className: 'hfx-card hfx-ctx-card' },
            h('h4', null, h('span', { className: 'dot' }), 'CONTEXT',
              h('span', { className: 'right' }, ctxMax ? Math.round(ctxPct) + '%' : '—')),
            h('div', { className: 'hfx-ctx-body' },
              h('div', { className: 'hfx-ctx-half' },
                h('div', { className: 'hfx-ctx-top' },
                  h('div', { className: 'hfx-ctx-cell' },
                    h('span', { className: 'l' }, 'USED'),
                    h('span', { className: 'n' }, fmt(ctxUsed))
                  ),
                  h('div', { className: 'hfx-ctx-cell left' },
                    h('span', { className: 'l' }, 'LEFT'),
                    h('span', { className: 'n' }, ctxLeft !== undefined ? fmt(ctxLeft) : '—')
                  )
                ),
                h('div', { className: 'hfx-bar' }, h('i', { style: { width: ctxPct + '%' } })),
                h('div', { className: 'hfx-ctx-line' },
                  h('span', null, 'WINDOW ', h('b', null, ctxMax ? fmt(ctxMax) : '—')),
                  h('span', null, 'FILL ', h('b', null, ctxMax ? Math.round(ctxPct) + '%' : '—'))
                ),
                h('div', { className: 'hfx-ctx-line' },
                  h('span', null, 'COMPACT ', h('b', null, compactions)),
                  h('span', null, 'PRUNE ', h('b', null, prunes))
                )
              ),
              h('div', { className: 'hfx-ctx-bottom' },
                h('h4', { className: 'hfx-ctx-h' },
                  h('span', { className: 'dot' }), 'COST',
                  h('span', { className: 'right' }, 'CNY')
                ),
                h('div', {
                  className: 'hfx-ctx-costs',
                  title: platform
                    ? 'BALANCE and TODAY are read from platform.deepseek.com actual wallet / billed usage'
                    : 'BALANCE is the DSH account wallet; TODAY is estimated from current-session usage at the CNY rate card',
                },
                  h('div', { className: 'cell balance', title: balance.title },
                    h('span', { className: 'lbl' }, 'BALANCE'),
                    h('b', null, balance.text),
                    balance.note ? h('span', { className: 'note' }, balance.note) : null
                  ),
                  h('div', { className: 'cell session' },
                    h('span', { className: 'lbl' }, 'TODAY'),
                    h('b', null, fmtCost(todayCost))
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  return { Dock, CSS };
})();
