/**
 * HALOFLUX for DSH — Client assembly.
 *
 */
const HalofluxPlugin = (() => {
  const NS = 'haloflux';
  const STORAGE_KEY = 'dsh-haloflux:params:v2';
  const PARAMS_KEY = 'dsh-haloflux:params:default:v2';
  /** a Session switch can report "no main session" for a frame or two: never collapse inside it */
  const SWITCH_GRACE_MS = 1200;
  /** a stale "idle" right after a switch is held off only briefly, so a running -> idle
      switch starts dimming WITH the turn instead of spinning at full brightness first */
  const SWITCH_SETTLE_MS = 260;

  const DICT = {
    en: {
      'ui.console': 'CONTROL',
      'ui.consoleTitle': 'DeepVibe-dsh console',
      'ui.presets': 'Presets',
      'ui.export': 'Export',
      'ui.import': 'Import',
      'ui.saveDefault': 'Save as default',
      'ui.reset': 'Reset',
      'ui.close': 'Close',
      'ui.hint': 'C console · H hud · I immersive · Esc close',
      'ui.idle': 'IDLE',
      'ui.running': 'RUNNING',
      'ui.tokens': 'TOKENS',
      'ui.rate': 'TOK/S',
      'ui.context': 'CONTEXT',
      'ui.steps': 'STEPS',
      'ui.tools': 'TOOLS',
      'ui.feed': 'EVENT FEED',
      'ui.tokensFeed': 'TOKEN STREAM',
      'ui.dispatch': 'TOOL DISPATCH',
      'ui.empty': 'waiting for the next call',
      'ui.copied': 'copied',
      'ui.camera': 'CAMERA',
      'ui.cameraHint': 'Auto camera: occasional push-in on a detail. Off keeps one steady framing.',
      'ui.sectionLabel': 'DeepVibe-dsh',
      'ui.settingsHeading': 'DeepVibe-dsh live ring',
      'ui.settingsDesc': 'A frame-wide light-ring background driven by the current session: ring rotation, token capture and beams follow the running model call and stop when it settles.',
      'ui.dataTitle': 'Data source',
      'ui.dataMode': 'Data capture',
      'ui.mode0': 'Animation only',
      'ui.mode1': 'Mixed 30%',
      'ui.mode2': 'Full capture',
      'ui.mode0Hint': 'Level 0 - pure animation: the ring shows the original DeepVibe sample words and numbers and never touches the session text stream (pullTokens is skipped). Brightness still follows the running/idle state.',
      'ui.mode1Hint': 'Level 1 - mixed (the current look): ring text comes from the streaming answer whenever tokens are available, while numbers and headers stay synthetic.',
      'ui.mode2Hint': 'Level 2 - full capture: every word and number comes from this session (streaming tokens, tool names, step/turn, tok/s, context). A panel stays blank when there is nothing real to show.',
      'ui.configTitle': 'Presets & config',
      'ui.paramsTitle': 'Parameters',
      'ui.saved': 'saved',
      'ui.failed': 'failed',
      'ui.apply': 'Apply',
      'ui.importHint': 'Paste JSON, then Enter to apply',
    },
    zh: {
      'ui.console': '控制台',
      'ui.consoleTitle': 'DeepVibe-dsh 控制台',
      'ui.presets': '预设',
      'ui.export': '导出',
      'ui.import': '导入',
      'ui.saveDefault': '保存为默认',
      'ui.reset': '重置',
      'ui.close': '关闭',
      'ui.hint': 'C 控制台 · H 面板 · I 沉浸 · Esc 关闭',
      'ui.idle': '空闲',
      'ui.running': '运行中',
      'ui.tokens': '词元',
      'ui.rate': '词元/秒',
      'ui.context': '上下文',
      'ui.steps': '步数',
      'ui.tools': '工具',
      'ui.feed': '事件流',
      'ui.tokensFeed': '词元流',
      'ui.dispatch': '工具调度',
      'ui.empty': '等待下一次调用',
      'ui.copied': '已复制',
      'ui.camera': '运镜',
      'ui.cameraHint': '自动运镜：不定时推近画面看局部。关闭后保持固定机位。',
      'ui.sectionLabel': 'DeepVibe-dsh',
      'ui.settingsHeading': 'DeepVibe-dsh 实时光环',
      'ui.settingsDesc': '由当前会话驱动的全帧光环背景：圆盘转动、词元抓取与光束跟随模型调用，调用结束即同步停止。',
      'ui.dataTitle': '数据来源',
      'ui.dataMode': '数据抓取档位',
      'ui.mode0': '纯动画',
      'ui.mode1': '混合 30%',
      'ui.mode2': '完全抓取',
      'ui.mode0Hint': '0 档 · 纯动画：环上的词与数字全部来自原作示例，不抓取任何会话文字（不调用词元流）；画面亮度仍随「运行/静默」变化。',
      'ui.mode1Hint': '1 档 · 混合（现在的样子）：有词元时环上的文字来自正在流出的真实回答，数字与表头仍为合成数据。',
      'ui.mode2Hint': '2 档 · 完全抓取：每个词、每个数字都来自当前会话（流式词元、工具名、step/turn、tok/s、上下文）；没有真实数据时面板留空。',
      'ui.configTitle': '预设与配置',
      'ui.paramsTitle': '参数',
      'ui.saved': '已保存',
      'ui.failed': '失败',
      'ui.apply': '应用',
      'ui.importHint': '粘贴 JSON 后按 Enter 应用',
    },
  };

  const BASE_CSS = `
.hfx-root{position:absolute;inset:0;pointer-events:none;z-index:0;isolation:auto}
.hfx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:1;
  transition:transform 1.2s cubic-bezier(.16,1,.3,1);will-change:transform,opacity;backface-visibility:hidden}
.hfx-root[data-immersive="1"] .hfx-canvas{transform:scale(1.045) translateZ(0)}
.hfx-veil{position:absolute;inset:0;z-index:0;background:#050608;opacity:0;pointer-events:none;
  transition:opacity 900ms cubic-bezier(.4,0,.2,1);will-change:opacity}
.hfx-root[data-immersive="1"] .hfx-veil{opacity:1;pointer-events:auto}
.hfx-topic{position:absolute;right:24px;left:auto;top:50px;z-index:6;max-width:min(54vw,720px);
  pointer-events:none;opacity:0;transform:translateY(-5px);text-align:right;transition:opacity .35s ease,transform .5s cubic-bezier(.16,1,.3,1)}
.hfx-root[data-immersive="1"] .hfx-topic{opacity:1;transform:none}
.hfx-topic .t{display:block;min-width:0;max-width:min(54vw,720px);font:16px/1.5 "JetBrains Mono",Consolas,ui-monospace,monospace;letter-spacing:.02em;
  color:#ffffff;background:rgba(6,7,10,.64);border:1px solid rgba(255,255,255,.72);border-radius:6px;padding:7px 12px;
  box-shadow:0 0 12px rgba(255,255,255,.32),inset 0 0 12px rgba(255,255,255,.08);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;text-shadow:0 1px 8px rgba(0,0,0,.85),0 0 10px rgba(255,255,255,.22)}
.hfx-hud{position:absolute;inset:0;pointer-events:none;font:11px/1.45 "JetBrains Mono",Consolas,ui-monospace,monospace;
  letter-spacing:.06em;color:var(--dsw-alias-label-secondary,#8b93a7);user-select:none}
.hfx-panel{pointer-events:auto;background:color-mix(in srgb,var(--dsw-alias-bg-base,#0b0d10) 94%,transparent);
  border:1px solid color-mix(in srgb,var(--dsw-alias-border-l2,#2a2f3a) 70%,transparent);
  border-radius:10px}
.hfx-dim{color:var(--dsw-alias-label-tertiary,#6a7285)}
.hfx-num{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e6ecff)}
.hfx-pink{color:#ff9ecb}.hfx-cyan{color:#7fd8ff}
.hfx-launch{position:absolute;right:20px;bottom:20px;z-index:40;pointer-events:auto;cursor:pointer;
  display:flex;flex-direction:row;align-items:center;gap:6px;padding:7px 11px;
  border:1px solid rgba(240,166,198,.55);background:rgba(8,9,11,.94);color:#f0a6c6;
  font:9px/1 "JetBrains Mono",Consolas,ui-monospace,monospace;letter-spacing:.16em;
  box-shadow:0 0 18px rgba(240,166,198,.14);
  transition:background .2s ease,color .2s ease,transform .2s ease}
.hfx-launch:hover{background:rgba(240,166,198,.16);color:#fff;transform:translateY(-1px)}
.hfx-launch .glyph{font-size:12px;line-height:1;color:#98e0cf}
.hfx-launch .txt{white-space:nowrap}
.hfx-approval{position:absolute;right:clamp(18px,7vw,120px);top:50%;transform:translateY(-50%);z-index:60;pointer-events:auto;
  width:min(520px,calc(100vw - 48px));padding:18px 20px 16px;border:1px solid rgba(240,166,198,.68);
  border-radius:18px;background:rgba(8,9,11,.97);color:#dfe2e8;
  box-shadow:0 0 48px rgba(240,166,198,.16),inset 0 0 30px rgba(0,0,0,.55);
  font:11px/1.6 "JetBrains Mono",Consolas,ui-monospace,monospace;letter-spacing:.03em}
.hfx-approval .kicker{font-size:8px;letter-spacing:.22em;color:#f0a6c6}
.hfx-approval h3{margin:5px 0 10px;font-size:20px;line-height:1.2;font-weight:800;color:#f4f5f7;letter-spacing:.04em}
.hfx-approval .reason{max-height:190px;overflow:auto;padding:10px 12px;border-left:2px solid rgba(240,166,198,.55);
  background:rgba(240,166,198,.05);color:#cfd2d8;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.65}
.hfx-approval .reason.dim{color:#6b6f78}
.hfx-approval .err{margin-top:8px;color:#ff8fb4;font-size:9px}
.hfx-approval .actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
.hfx-approval button{font:inherit;font-size:11px;letter-spacing:.12em;padding:8px 16px;border-radius:8px;cursor:pointer}
.hfx-approval button:disabled{opacity:.45;cursor:default}
.hfx-approval .reject{border:1px solid rgba(155,160,172,.55);background:rgba(12,14,18,.6);color:#cfd2d8}
.hfx-approval .reject:hover:not(:disabled){border-color:#cfd2d8;color:#fff}
.hfx-approval .allow{border:1px solid rgba(240,166,198,.85);background:rgba(240,166,198,.18);color:#fff}
.hfx-approval .allow:hover:not(:disabled){background:rgba(240,166,198,.32)}
.hfx-question{border-color:rgba(143,216,198,.7);box-shadow:0 0 48px rgba(143,216,198,.13),inset 0 0 30px rgba(0,0,0,.55);
  max-height:min(86vh,760px);display:flex;flex-direction:column;transform:translateY(calc(-50% - 6em))}
.hfx-question .kicker{color:#8fd8c6}
.hfx-question .q-list{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:14px;padding-right:3px}
.hfx-question .q-block{border-top:1px solid rgba(143,216,198,.16);padding-top:10px}
.hfx-question .q-block:first-child{border-top:0;padding-top:0}
.hfx-question .q-header{font-size:8px;letter-spacing:.18em;color:#8fd8c6;margin-bottom:4px}
.hfx-question h3{font-size:16px;line-height:1.45;margin:0 0 8px}
.hfx-question .q-detail{max-height:100px;overflow:auto;margin-bottom:8px;color:#b9bec8;font-size:10px;white-space:pre-wrap}
.hfx-question .q-options{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}
.hfx-question .q-option{padding:9px 11px;text-align:left;border:1px solid rgba(120,128,142,.5);border-radius:8px;
  background:rgba(14,16,20,.72);color:#dfe2e8;font-size:11px;letter-spacing:.02em;line-height:1.45}
.hfx-question .q-option:hover:not(:disabled){border-color:rgba(143,216,198,.65)}
.hfx-question .q-option.on{border-color:rgba(143,216,198,.9);background:rgba(143,216,198,.13);color:#effffb}
.hfx-question .q-custom{width:100%;box-sizing:border-box;resize:vertical;min-height:54px;padding:9px 11px;
  border:1px solid rgba(120,128,142,.45);border-radius:8px;background:rgba(8,10,12,.9);color:#e6ebf3;
  font:11px/1.55 "JetBrains Mono",Consolas,ui-monospace,monospace;outline:none}
.hfx-question .q-custom:focus{border-color:rgba(143,216,198,.75)}
.hfx-question .allow{border-color:rgba(143,216,198,.85);background:rgba(143,216,198,.15)}
.hfx-question .allow:hover:not(:disabled){background:rgba(143,216,198,.28)}
@media (max-width:900px){.hfx-approval{right:16px;left:16px;width:auto}}
`;

  /* ---------- params live in the shared store (src/state.js) ---------- */

  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }

  /* ---------- locale ---------- */

  function makeT(locale) {
    function activeId() {
      try {
        const snap = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : undefined;
        const id = snap && (snap.locale || snap.id || snap.current);
        if (typeof id === 'string' && id) return id;
      } catch { /* ignore */ }
      try {
        const lang = (navigator.language || 'en').toLowerCase();
        if (lang.startsWith('zh')) return 'zh';
      } catch { /* ignore */ }
      return 'en';
    }
    return function t(key) {
      const id = activeId();
      const dict = DICT[id] || DICT[id.split('-')[0]] || DICT.en;
      return dict[key] || DICT.en[key] || key;
    };
  }

  /* ---------- stable selectors ---------- */

  const selectMainSessionId = (state) => {
    if (!state || !state.byId) return undefined;
    const rows = Object.values(state.byId);
    for (const row of rows) if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) return row.id;
    return rows.length === 1 && rows[0] ? rows[0].id : undefined;
  };

  /** A blank Session is the "new session" hero page: the decoration fades out there. */
  const selectMainBlank = (state) => {
    if (!state || !state.byId) return false;
    const id = selectMainSessionId(state);
    const row = id === undefined ? undefined : state.byId[id];
    return !!(row && row.blank === true);
  };

  /** Folder basename used as the project label (same derivation as the
      workspace chip). Keeps the label stable when a Session has no title yet. */
  const projectOf = (cwd) => {
    const raw = typeof cwd === 'string' ? cwd.trim() : '';
    if (!raw) return '';
    const parts = raw.replace(/[\\/]+$/, '').split(/[\\/]+/);
    return parts.length ? parts[parts.length - 1] : '';
  };

  /** Each label is capped at 12 characters; longer text gets an ellipsis. */
  const clipLabel = (value) => {
    const chars = Array.from(String(value || '').replace(/\s+/g, ' ').trim());
    return chars.length > 12 ? chars.slice(0, 12).join('') + '…' : chars.join('');
  };

  /** Project + session topic. The project prefix guarantees a visible change
      when switching to another project, even before DSH generates a title. */
  const selectMainTitle = (state) => {
    if (!state || !state.byId) return '';
    const id = selectMainSessionId(state);
    const row = id === undefined ? undefined : state.byId[id];
    if (!row || row.blank) return '';
    const title = clipLabel(typeof row.title === 'string' ? row.title : '');
    const project = clipLabel(projectOf(row.cwd));
    if (project && title && project.toLowerCase() !== title.toLowerCase()) return project + ' · ' + title;
    return project || title;
  };

  /**
   * Answer the Host approval through the already-mounted native approval panel.
   * The native panel lives in the (veiled) composer; programmatic click keeps a
   * single decision path, so the immersive panel and the Host cannot disagree.
   */
  function answerNativeApproval(outcome) {
    try {
      const root = document.querySelector('[data-approval-key]');
      if (!root) return false;
      const want = outcome === 'allowed-once' ? /允许一次|allow once/i : /拒绝|reject/i;
      const buttons = Array.from(root.querySelectorAll('button'));
      const target = buttons.find((b) => want.test(String(b.textContent || '').trim()));
      if (!target) return false;
      target.click();
      return true;
    } catch { return false; }
  }

  const questionSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function cleanQuestionLabel(label) {
    return String(label || '')
      .replace(/\s*\((?:recommended|推荐)\)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function nativeQuestionRoot() {
    const roots = Array.from(document.querySelectorAll('[data-question-key]'))
      .filter((el) => el && el.getClientRects && el.getClientRects().length > 0);
    return roots.length ? roots[roots.length - 1] : document.querySelector('[data-question-key]');
  }

  function nativeQuestionButton(root, pattern) {
    return Array.from(root.querySelectorAll('button'))
      .find((button) => !button.disabled && pattern.test(String(button.textContent || '').trim()));
  }

  async function waitNativeQuestionButton(pattern) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const root = nativeQuestionRoot();
      const button = root ? nativeQuestionButton(root, pattern) : null;
      if (button) return button;
      await questionSleep(30);
    }
    return null;
  }

  /**
   * Drive the native ask_user_question card. The immersive card only mirrors the
   * request; the Host's live waterfall still lives in the composer behind the
   * veil, so answering there keeps one decision path and one transcript.
   */
  async function answerNativeQuestion(prompt, answers, skipAll) {
    try {
      for (let i = 0; i < prompt.questions.length; i += 1) {
        const question = prompt.questions[i];
        const root = nativeQuestionRoot();
        if (!root) return false;
        if (skipAll) {
          const skip = await waitNativeQuestionButton(/跳过|skip/i);
          if (!skip) return false;
          skip.click();
          await questionSleep(180);
          continue;
        }
        const answer = answers[i] || { selected: [], custom: '' };
        const selected = Array.isArray(answer.selected) ? answer.selected : [];
        for (const label of selected) {
          const want = cleanQuestionLabel(label);
          const option = Array.from(root.querySelectorAll('button[role="radio"],button[role="checkbox"]'))
            .find((button) => cleanQuestionLabel(button.getAttribute('aria-label') || button.textContent) === want);
          if (!option) return false;
          option.click();
          await questionSleep(35);
        }
        const custom = String(answer.custom || '').trim();
        if (custom) {
          const area = root.querySelector('textarea');
          if (!area) return false;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
          if (setter && setter.set) setter.set.call(area, custom); else area.value = custom;
          area.dispatchEvent(new Event('input', { bubbles: true }));
          area.dispatchEvent(new Event('change', { bubbles: true }));
          await questionSleep(50);
        }
        const last = i === prompt.questions.length - 1;
        const next = await waitNativeQuestionButton(last
          ? /^(提交|submit|发送|回答|finish|done)$/i
          : /^(下一题|next|继续)$/i);
        if (!next) {
          const fallback = await waitNativeQuestionButton(last ? /提交|submit|发送/i : /下一题|next|继续/i);
          if (!fallback) return false;
          fallback.click();
        } else {
          next.click();
        }
        await questionSleep(180);
      }
      return true;
    } catch { return false; }
  }

  /** In-immersive approval card: the native composer is behind the veil. */
  function ApprovalPrompt({ request, onAnswer }) {    const [busy, setBusy] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const answer = (outcome) => {
      if (busy) return;
      setBusy(true);
      setFailed(false);
      if (!onAnswer(outcome)) {
        setBusy(false);
        setFailed(true);
      }
    };
    const reason = typeof request.displayReason === 'string' && request.displayReason
      ? request.displayReason : request.reason;
    return React.createElement('div', { className: 'hfx-approval', role: 'dialog', 'aria-modal': 'true' },
      React.createElement('div', { className: 'kicker' }, 'APPROVAL REQUEST'),
      React.createElement('h3', null, request.toolName ? String(request.toolName) + ' 请求' : '请求审批'),
      reason === undefined || reason === null || reason === ''
        ? React.createElement('div', { className: 'reason dim' }, '工具请求执行敏感操作，需要你确认。')
        : React.createElement('div', { className: 'reason' }, String(reason)),
      failed ? React.createElement('div', { className: 'err' }, '无法连接原生审批面板，请按 Esc 退出沉浸后处理。') : null,
      React.createElement('div', { className: 'actions' },
        React.createElement('button', { type: 'button', className: 'reject', disabled: busy, onClick: () => answer('rejected') }, '拒绝'),
        React.createElement('button', { type: 'button', className: 'allow', disabled: busy, onClick: () => answer('allowed-once') }, '允许一次')
      )
    );
  }

  /**
   * In-immersive ask_user_question card. It mirrors the request but submits by
   * driving the native composer takeover behind the veil, so the live
   * waterfall — not a second answer path — settles the tool call.
   */
  function QuestionPrompt({ prompt, onAnswer }) {
    const initial = () => prompt.questions.map((question) => {
      const first = question.options && question.options[0] ? question.options[0].label : '';
      const recommended = /\((?:recommended|推荐)\)\s*$/i.test(first) ? [first] : [];
      return { selected: recommended, custom: '' };
    });
    const [answers, setAnswers] = React.useState(initial);
    const [busy, setBusy] = React.useState(false);
    const [failed, setFailed] = React.useState('');
    const update = (index, patch) => {
      setAnswers((previous) => previous.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
      )));
    };
    const toggle = (index, question, label) => {
      const current = answers[index] || { selected: [], custom: '' };
      const selected = question.multiSelect
        ? (current.selected.includes(label)
          ? current.selected.filter((value) => value !== label)
          : current.selected.concat(label))
        : (current.selected.includes(label) ? [] : [label]);
      update(index, { selected, custom: '' });
    };
    const finish = async (skipAll) => {
      if (busy) return;
      if (!skipAll) {
        const missing = prompt.questions.findIndex((_, index) => {
          const item = answers[index] || { selected: [], custom: '' };
          return item.selected.length === 0 && !String(item.custom || '').trim();
        });
        if (missing >= 0) {
          setFailed('请为每个问题选择一个选项，或在下方补充你的想法。');
          return;
        }
      }
      setBusy(true);
      setFailed('');
      const ok = await onAnswer(prompt, answers, skipAll);
      if (!ok) {
        setBusy(false);
        setFailed('无法连接原生提问面板，请按 Esc 退出沉浸后处理。');
      }
    };
    return React.createElement('div', {
      className: 'hfx-approval hfx-question', role: 'dialog', 'aria-modal': 'true',
    },
      React.createElement('div', { className: 'kicker' },
        prompt.questions.length > 1 ? 'QUESTIONS · ' + String(prompt.questions.length) : 'QUESTION REQUEST'),
      React.createElement('div', { className: 'q-list' },
        prompt.questions.map((question, index) => React.createElement('section', {
          className: 'q-block', key: question.id + ':' + String(index),
        },
          question.header ? React.createElement('div', { className: 'q-header' }, question.header) : null,
          React.createElement('h3', null, question.question || '请选择'),
          question.detail ? React.createElement('div', { className: 'q-detail' }, question.detail) : null,
          question.options.length ? React.createElement('div', { className: 'q-options' },
            question.options.map((option) => {
              const active = (answers[index] || { selected: [] }).selected.includes(option.label);
              return React.createElement('button', {
                type: 'button',
                key: option.label,
                className: 'q-option' + (active ? ' on' : ''),
                title: option.description || undefined,
                disabled: busy,
                onClick: () => toggle(index, question, option.label),
              }, option.label);
            })
          ) : null,
          React.createElement('textarea', {
            className: 'q-custom',
            rows: 2,
            placeholder: '补充你的想法…',
            value: (answers[index] || { custom: '' }).custom,
            disabled: busy,
            onChange: (event) => update(index, {
              custom: event.target.value,
              selected: question.multiSelect === true ? (answers[index] || { selected: [] }).selected : [],
              skipped: false,
            }),
          })
        ))
      ),
      failed ? React.createElement('div', { className: 'err' }, failed) : null,
      React.createElement('div', { className: 'actions' },
        React.createElement('button', {
          type: 'button', className: 'reject', disabled: busy, onClick: () => finish(true),
        }, '拒绝'),
        React.createElement('button', {
          type: 'button', className: 'allow', disabled: busy, onClick: () => finish(false),
        }, busy ? '提交中…' : '提交')
      )
    );
  }

  /**
   * Keep the hidden dock mounted so its CSS enter transition can start on the
   * first frame, but stop re-rendering its 100-cell heatmap / charts at 5 Hz
   * while it is off-screen. On enter/exit, or while visible, ticks pass through.
   */
  const DockHost = React.memo(function HalofluxDockHost({ live, billing, platform, onExit, tick, active }) {
    return React.createElement(HalofluxDock.Dock, { live, billing, platform, onExit });
  }, (prev, next) => {
    if (prev.active !== next.active) return false;
    if (!next.active) return true;
    return prev.tick === next.tick && prev.billing === next.billing && prev.platform === next.platform;
  });

  /* ---------- the layer ---------- */

  function HalofluxLayer(props) {
    const { useSessions, useSessionStatus } = props;
    const h = React.createElement;

    const sessionsSvc = props.__sessions || undefined;
    const t = props.__t;

    const sessionId = useSessions(selectMainSessionId);
    const blank = useSessions(selectMainBlank);
    const sessionTitle = useSessions(selectMainTitle);
    const stateSelector = React.useCallback((map) => {
      const hit = map && map.get ? map.get(sessionId) : undefined;
      return hit ? hit.running === true : undefined;
    }, [sessionId]);
    const running = useSessionStatus(stateSelector);

    // "present" = a real conversation is on screen. The blank New Session hero page
    // (and the no-session page) both mean absent, so the halo fades out there.
    const present = sessionId !== undefined && !blank;

    const hostRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const engineRef = React.useRef(null);
    const liveRef = React.useRef(null);
    const sessionRef = React.useRef(sessionId);
    sessionRef.current = sessionId;
    const prevSessionRef = React.useRef(sessionId);
    /** when the current switch started: keeps a fresh Session's stale "not running" out */
    const switchAtRef = React.useRef(0);

    const params = HalofluxState.useParams();
    const [open, setOpen] = React.useState(false);
    const [stats, setStats] = React.useState(null);
    const [liveTick, setLiveTick] = React.useState(0);
    const [immersive, setImmersive] = React.useState(false);
    const [immSuppressed, setImmSuppressed] = React.useState(false);
    const [billing, setBilling] = React.useState(undefined);
    const [platform, setPlatform] = React.useState(null);
    const billingReadRef = React.useRef(null);
    const immRef = React.useRef(false);
    immRef.current = immersive;

    const patchParams = React.useCallback((partial) => { HalofluxState.set(partial); }, []);
    const exitImmersive = React.useCallback(() => {
      setImmersive(false);
      setImmSuppressed(true);
    }, []);

    /* live source: created once, bound to the active session */
    React.useEffect(() => {
      const live = createHalofluxLive({
        getSessionId: () => sessionRef.current,
        bindingOf: (id) => {
          try {
            const svc = sessionsSvc || (props.__ctx && props.__ctx.get && props.__ctx.get('sessions'));
            return svc && typeof svc.binding === 'function' ? svc.binding(id) : undefined;
          } catch { return undefined; }
        },
      });
      liveRef.current = live;
      // presence must be right before the first frame, not one effect later
      try { live.sessionPresent = sessionRef.current !== undefined; } catch { /* readonly */ }
      const off = live.subscribe(() => setLiveTick((n) => (n + 1) % 1000000));
      try { if (typeof window !== 'undefined' && window.__HFX_DEBUG) window.__hfx = { live: live, engine: () => engineRef.current }; } catch { /* debug hook */ }
      return () => { off(); live.dispose(); liveRef.current = null; };
    }, []);

    /* account balance: Remote query, no credentials in the renderer.
       The account namespace can be published after this plugin mounts, so the
       reader retries instead of bailing to — forever. */
    React.useEffect(() => {
      const ctx = props.__ctx;
      let version = '0.2.1-rc.5';
      let locale = 'zh-CN';
      try {
        const app = ctx.get && ctx.get('app');
        if (app && typeof app.version === 'string' && app.version) version = app.version;
      } catch { /* keep build version */ }
      try {
        const snap = ctx.get && ctx.get('locale') && ctx.get('locale').getSnapshot
          ? ctx.get('locale').getSnapshot() : undefined;
        const active = snap && (snap.active || snap.id || snap.current);
        if (typeof active === 'string' && active) locale = active;
      } catch { /* navigator fallback below */ }
      if (!locale) {
        try { locale = navigator.language || 'en-US'; } catch { locale = 'en-US'; }
      }
      const client = () => ({
        version,
        locale,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      });
      let stopped = false;
      const read = async () => {
        let account;
        try { account = ctx && ctx.remote && ctx.remote.account; } catch { account = undefined; }
        if (!account || typeof account.getBalance !== 'function') {
          setBilling((previous) => (previous && previous.wallets ? previous
            : { unavailable: true, note: 'NO ACCOUNT' }));
          return;
        }
        try {
          const result = await account.getBalance(client());
          if (stopped) return;
          if (!result || result.ok !== true) {
            setBilling((previous) => (previous && previous.wallets ? previous
              : { unavailable: true, note: 'UNAVAILABLE' }));
            return;
          }
          const value = result.value;
          if (!value) { setBilling({ unavailable: true, note: 'NO ACCOUNT' }); return; }
          if (value.status !== 'ready') { setBilling({ unavailable: true, note: 'UNAVAILABLE' }); return; }
          setBilling({
            wallets: Array.isArray(value.value) ? value.value : [],
            bonus: Array.isArray(value.bonusWallets) ? value.bonusWallets : [],
            at: Date.now(),
          });
        } catch {
          if (!stopped) {
            setBilling((previous) => (previous && previous.wallets ? previous
              : { unavailable: true, note: 'UNAVAILABLE' }));
          }
        }
      };
      billingReadRef.current = read;
      read();
      const timer = setInterval(read, 5000);
      const onVisible = () => { if (!document.hidden) read(); };
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        stopped = true;
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        if (billingReadRef.current === read) billingReadRef.current = null;
      };
    }, []);

    React.useEffect(() => {
      if (running === false && billingReadRef.current) {
        try { billingReadRef.current(); } catch { /* ignore */ }
      }
    }, [running]);

    /* Optional local Platform bridge (see .vendor/platform-sync/serve.mjs).
       When present, BALANCE / TODAY use the real Platform wallet and actual
       hourly billed cost instead of the token-rate estimate. */
    React.useEffect(() => {
      let stopped = false;
      let failures = 0;
      const read = async () => {
        const urls = [];
        try { urls.push(new URL('/haloflux/platform-summary', location.href).href); } catch { /* file origin */ }
        urls.push('http://127.0.0.1:47821/summary');
        for (const url of urls) {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) continue;
            const data = await res.json();
            if (!data || !data.ok) continue;
            const cost = Number(data.todayCost);
            if (!Number.isFinite(Number(data.balance)) && !Number.isFinite(cost)) continue;
            if (!stopped) { failures = 0; setPlatform(data); }
            return;
          } catch { /* try the next source */ }
        }
        failures += 1;
        if (!stopped && failures >= 2) setPlatform(null);
      };
      read();
      const timer = setInterval(read, 30000);
      return () => { stopped = true; clearInterval(timer); };
    }, []);

    /* live session switch. A switch can report "no main session" for a frame or
       two; skip those gaps so the previous feed (and its level) survives until the
       new Session's binding is actually published. */
    React.useEffect(() => {
      if (sessionId === undefined) return;
      if (liveRef.current) liveRef.current.setSession(sessionId);
    }, [sessionId]);

    /* presence: running conversation vs. New Session hero / no Session at all.
       Applied only after a short grace, otherwise the whole frame collapses to
       voidLevel in the middle of a Session switch. */
    React.useEffect(() => {
      const live = liveRef.current;
      if (!live) return undefined;
      if (present) { live.sessionPresent = true; return undefined; }
      const timer = setTimeout(() => {
        live.sessionPresent = false;
        live.setRunning(false);
        live.setSession(undefined);
      }, SWITCH_GRACE_MS);
      return () => { clearTimeout(timer); };
    }, [present]);

    /* switching to a different real conversation spins the ring exactly one turn.
       The last real id is remembered across a transient undefined gap, so a
       S1 -> (gap) -> S2 switch still revolves instead of resetting silently. */
    React.useEffect(() => {
      if (sessionId === undefined) return;
      const previous = prevSessionRef.current;
      prevSessionRef.current = sessionId;
      if (previous === undefined || previous === sessionId) return;
      switchAtRef.current = Date.now();
      const engine = engineRef.current;
      // the non-revolve switch effects run even when the ring spin is disabled
      if (engine && typeof engine.switchFx === 'function') engine.switchFx();
      if (!(params.revolveOnSwitch >= 0.5)) return;
      if (engine && typeof engine.revolve === 'function') engine.revolve(1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    /* author's default on first run */
    React.useEffect(() => {
      if (prefersReducedMotion() && params.idleMotion > 0.05) patchParams({ idleMotion: 0.05 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* immersive session: a run opens the dock and fades the host page; the
       settle closes it again. Esc suppresses it until the next run. */
    React.useEffect(() => {
      if (running === true) setImmSuppressed(false);
    }, [running]);

    React.useEffect(() => {
      if (!params.immersive || !present) { setImmersive(false); return undefined; }
      let timer;
      if (running === true && !immSuppressed) {
        timer = setTimeout(() => setImmersive(true), 260);
      } else if (running === false) {
        // stay through most of the light release (releaseMs 2600) so the page
        // does not snap back while the ring is still bright
        timer = setTimeout(() => setImmersive(false), 1800);
      }
      return () => { clearTimeout(timer); };
    }, [running, params.immersive, present, immSuppressed]);

    /* the chat input is about to be covered: never leave it focused, or typing
       would silently edit a page the user cannot see */
    React.useEffect(() => {
      if (!immersive) return;
      try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch { /* ignore */ }
    }, [immersive]);

    /* engine lifecycle */
    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !liveRef.current) return undefined;
      const engine = HalofluxEngine.create({
        canvas,
        live: liveRef.current,
        params,
        onStats: setStats,
      });
      engineRef.current = engine;
      engine.setImmersive(immRef.current);
      engine.start();
      return () => { engineRef.current = null; engine.dispose(); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      const engine = engineRef.current;
      if (engine && typeof engine.setImmersive === 'function') engine.setImmersive(immersive);
    }, [immersive]);

    /* params -> engine */
    React.useEffect(() => {
      const engine = engineRef.current;
      if (engine) engine.setParams(params);
    }, [params]);

    /* running state -> live (a hero/no-session page is never "running").
       Absence is applied by the presence effect above, with its grace period. */
    React.useEffect(() => {
      const live = liveRef.current;
      if (!live) return undefined;
      if (!present) return undefined;
      if (typeof running !== 'boolean') return undefined;
      if (running === false) {
        // A freshly opened Session may project running=false for a beat before its
        // own status arrives; hold it off briefly, then let the release overlap the
        // turn so the light drains while the ring is still moving.
        const left = SWITCH_SETTLE_MS - (Date.now() - switchAtRef.current);
        if (left > 0) {
          const timer = setTimeout(() => { live.setRunning(false); }, left);
          return () => { clearTimeout(timer); };
        }
      }
      live.setRunning(running);
      return undefined;
    }, [running, present]);

    /* container resize */
    React.useEffect(() => {
      const host = hostRef.current;
      if (!host || typeof ResizeObserver === 'undefined') return undefined;
      let raf = 0;
      const ro = new ResizeObserver(() => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (engineRef.current) engineRef.current.resize();
        });
      });
      ro.observe(document.documentElement);
      return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
    }, []);

    /* visibility: stop burning frames on a hidden tab */
    React.useEffect(() => {
      const onVis = () => {
        const engine = engineRef.current;
        if (!engine) return;
        if (document.hidden) engine.stop(); else engine.start();
      };
      document.addEventListener('visibilitychange', onVis);
      return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    /* keyboard: C console, H hud */
    React.useEffect(() => {
      const onKey = (event) => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        const tag = target && target.tagName ? String(target.tagName).toUpperCase() : '';
        const key = String(event.key || '').toLowerCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) {
          if (key === 'escape' && immRef.current) { setImmersive(false); setImmSuppressed(true); }
          return;
        }
        if (key === 'c') { setOpen((v) => !v); }
        else if (key === 'h') { patchParams({ hudOn: params.hudOn ? 0 : 1 }); }
        else if (key === 'i') {
          // manual preview / exit; Esc suppresses auto-entry until the next run
          if (immRef.current) { setImmersive(false); setImmSuppressed(true); }
          else { setImmSuppressed(false); setImmersive(true); }
        }
        else if (key === 'escape') {
          if (immRef.current) { setImmersive(false); setImmSuppressed(true); }
          setOpen(false);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [params.hudOn, patchParams]);

    const blendMode = ['screen', 'lighten', 'normal'][params.blend | 0] || 'screen';
    const hudVisible = params.hudOn >= 0.5 && params.opacity > 0.02;
    /* After Esc/EXIT the running session stays alive but the dock is gone.
       Keep a small manual launcher while the run is still active. */
    const showLauncher = !!present && running === true && !immersive && !open
      && (immSuppressed || !params.immersive);

    const live = liveRef.current;
    /** stable defaults object: the slider list memoises on reference identity */
    const baseDefaults = React.useMemo(() => HalofluxState.baseParams(), []);

    const hudProps = {
      params, setParams: patchParams, live, t, stats,
      open, setOpen,
      defaults: baseDefaults,
      presets: HalofluxEngine.PRESETS,
      applyPreset: (name) => {
        const preset = HalofluxEngine.PRESETS[name];
        if (preset) patchParams({ ...preset });
      },
      exportJson: () => HalofluxState.exportJson(),
      importJson: (text) => HalofluxState.importJson(text),
      saveDefault: () => HalofluxState.saveDefault(),
      resetDefault: () => HalofluxState.resetDefault(),
    };

    return h('div', { className: 'hfx-root', ref: hostRef, 'data-immersive': immersive ? '1' : '0', 'aria-hidden': open ? undefined : true, style: { pointerEvents: 'none' } },
      h('style', null, BASE_CSS),
      h('div', { className: 'hfx-veil' }),
      h('canvas', {
        ref: canvasRef,
        className: 'hfx-canvas',
        style: { opacity: 0, mixBlendMode: blendMode === 'normal' ? undefined : blendMode },
      }),
      sessionTitle ? h('div', { className: 'hfx-topic', title: sessionTitle },
        h('span', { className: 't' }, sessionTitle)
      ) : null,
      hudVisible && HalofluxHud && live ? h(HalofluxHud.Stats, { ...hudProps, liveTick }) : null,
      hudVisible && HalofluxHud && live ? h(HalofluxHud.Feed, { ...hudProps, liveTick }) : null,
      hudVisible && HalofluxHud && live ? h(HalofluxHud.Tools, { ...hudProps, liveTick }) : null,
      HalofluxDock && live ? h(DockHost, {
        live, billing, platform, onExit: exitImmersive,
        tick: liveTick, active: immersive,
      }) : null,
      showLauncher ? h('button', {
        className: 'hfx-launch',
        type: 'button',
        title: '进入沉浸模式（I）',
        'aria-label': 'Enter immersive mode',
        onClick: () => { setImmSuppressed(false); setImmersive(true); },
      },
        h('span', { className: 'glyph' }, '◉'),
        h('span', { className: 'txt' }, 'ENTER')
      ) : null,
      immersive && live && live.questionPending && live.questionPrompt
        ? h(QuestionPrompt, {
          key: 'question:' + String(live.questionPrompt.callId || ''),
          prompt: live.questionPrompt,
          onAnswer: answerNativeQuestion,
        })
        : immersive && live && live.approvalRequest
          ? h(ApprovalPrompt, { request: live.approvalRequest, onAnswer: answerNativeApproval })
          : null,
      HalofluxHud && live ? h(HalofluxHud.Console, { ...hudProps, liveTick }) : null,
    );
  }

  /**
   * Root-scoped slot entries cannot read the plugin's own context from props,
   * so the registration closes over it here.
   */
  function makeLayer(ctx, t) {
    return function HalofluxLayerBound(props) {
      return HalofluxLayer({ ...props, __ctx: ctx, __t: t, __sessions: ctx.get('sessions') });
    };
  }

  /**
   * The settings page lives in the Settings panel's own React tree, so it only
   * receives the locale closure; parameters travel through HalofluxState.
   */
  function makeSettingsPage(t) {
    return function HalofluxSettingsPage() {
      return React.createElement(HalofluxSettings.SettingsPage, { __t: t });
    };
  }

  return {
    inject: ['slots', 'sessions', 'remote'],
    apply(ctx) {
      let t = makeT(undefined);
      try {
        const locale = ctx.get('locale');
        if (locale) {
          try { locale.register(NS, 'en', DICT.en); } catch { /* already registered */ }
          try { locale.register(NS, 'zh', DICT.zh); } catch { /* already registered */ }
          t = makeT(locale);
        }
      } catch { /* locale absent: fall back to navigator */ }

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'haloflux',
        order: -10,
        label: () => t('ui.consoleTitle'),
      }, makeLayer(ctx, t)));

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'haloflux',
        order: 50,
        label: () => t('ui.sectionLabel'),
      }, makeSettingsPage(t)));
    },
  };
})();