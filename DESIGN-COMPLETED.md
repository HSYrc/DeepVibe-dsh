# HALOFLUX × DSH 沉浸式运行可视化 — 已完成设计清单

> 版本：本地 fork（基于 dsh-haloflux 0.3.1）
> 日期：2026-11-02
> 位置：`D:\project\haloflux-main\.vendor\dsh-haloflux`
> 许可：PolyForm Noncommercial 1.0.0（仅限非商业）

## 状态总览

| 设计 | 代码 | 自检 | 浏览器可见 |
|---|---|---|---|
| 运行态亮度 / 最强存在感 | ✅ | ✅ | ⏳ 待加载 |
| 沉浸模式状态机 | ✅ | ✅ | ⏳ 待加载 |
| 页面淡出 / 光环无遮挡 | ✅ | ✅ | ⏳ 待加载 |
| 底部看板升起 | ✅ | ✅ | ⏳ 待加载 |
| 思考 + 工具事件面板 | ✅ | ✅ | ⏳ 待加载 |
| Token / 缓存命中面板 | ✅ | ✅ | ⏳ 待加载 |
| 瞬时 token 波动折线 | ✅ | ✅ | ⏳ 待加载 |
| 工具耗时热力条 | ✅ | ✅ | ⏳ 待加载 |
| 上下文 / 会话 KPI | ✅ | ✅ | ⏳ 待加载 |
| 安装进 desktop profile | ✅ | — | ✅ 已链接 |

> "浏览器可见" 一栏最后检查时仍是旧 bundle（Code Cache 里没有 `hfx-dock` / `instTps`）。
> 需要一次硬刷新或重启 DSH，见文末激活清单。

---

## 1. 总体架构

```
DSH session events
  reasoning-delta / text-delta / tool-call / tool-result / usage / turn / step
        │
        ▼
src/live.js  ── 状态 + 指标派生 + 20Hz 序列
        │
        ├──▶ src/engine.js   光环亮度、运动强度、状态包络
        │
        └──▶ src/mount.js    沉浸状态机、淡出、键盘、看板挂载
                    │
                    ▼
             src/dock.js     四块真数据面板 + SVG 折线
```

设计原则：

- 不修改 `lab.html` / `mobile.html` / `wallpaper/`，原作保持原样
- 不伪造数据：看板里的每个数字都来自会话事件或投影
- 不改宿主 DOM 结构：沉浸淡出用 overlay 层内的遮罩，避免依赖 DSH 的哈希类名
- 所有新参数进入现有参数系统，控制台 / 设置页自动出现

---

## 2. 设计一：运行态存在感

**目标**：运行时最明显，空闲时保持原来的淡背景，中间是渐变。

| 参数 | 值 | 含义 |
|---|---|---|
| `opacity` | 0.45 | 空闲不透明度（原参数改名） |
| `runOpacity` | 1.0 | 运行不透明度（新增） |
| `runLevel` | 1.6 | 运行态运动强度（原 1.0） |
| `attackMs` | 800 | 起势时长 |
| `releaseMs` | 2600 | 收势时长 |
| `easeCurve` | 1 | smootherstep 平滑 |

引擎每帧计算：

```
mix     = clamp((env - idleMotion) / (runLevel - idleMotion), 0, 1)
opacity = opacity + (runOpacity - opacity) * mix
```

`env` 是现有的三态 level 状态机（void / idle / running），所以亮度与运动强度走**同一条包络**，不会一个先到、一个后到。

写入方式是引擎直接写 `canvas.style.opacity`，不经过 React 的 5Hz 重绘，因此是逐帧平滑。

---

## 3. 设计二：沉浸模式状态机

**目标**：对话运行时自动进入沉浸；页面内容淡出，光环无遮挡，看板升起；结束平滑退回。

### 进入 / 退出

| 阶段 | 触发 | 延迟 | 动画 |
|---|---|---|---|
| 进入 | `running === true` 且 `immersive === 1` | 260ms | 遮罩 900ms、光环放大 1.2s、看板 900ms |
| 退出 | `running === false` | 1800ms（接住 2.6s 光衰） | 反向 900ms |
| 提前退出 | `Esc` / 看板 `EXIT` | 立即 | 本次运行不再自动进入 |
| 手动开关 | `I` | 立即 | 可预览 / 可退出 |

`immersive` 参数默认 `1`；设为 `0` 后只保留运行态亮度，不弹看板。

### 页面淡出

- 在 `shell.overlay` 层内、光环 canvas 之下加一层 `.hfx-veil`
- 颜色 `#050608`，沉浸时 `opacity: .94`，900ms 过渡
- 非沉浸时 `opacity: 0` 且 `pointer-events: none`
- 沉浸时 `pointer-events: auto`，挡住被遮住的聊天输入

选择遮罩而不是改宿主 DOM 的原因：

- 不依赖 DSH 的哈希类名 / 列结构
- 不会误伤侧栏、右栏、底栏
- 宿主渲染在 overlay 之上的弹窗（如审批）仍然可见

### 光环无遮挡

- canvas 在遮罩之上（`z-index: 1`），遮罩之下的页面被压到 6% 亮度
- 沉浸时 canvas 轻微放大 `scale(1.045)`，1.2s 过渡
- 运行态亮度已经是 `runOpacity = 1`

### 看板升起

- 看板容器从 `translateY(112%)` 到 `0`，900ms，`cubic-bezier(.16,1,.3,1)`
- 四块面板各自带 `translateY(26px) + opacity`，错峰 40 / 110 / 180 / 250ms
- 退出时无延迟，整体落回

### 焦点安全

进入沉浸时主动 `blur()` 当前焦点，避免用户对着看不见的输入框继续打字。`Esc` 在输入框内也能生效。

---

## 4. 设计三：底部看板

全宽、底部贴边、4 列，高度约 238px（窄屏 / 矮屏有断点）。

### 顶部状态条

`HALOFLUX // LIVE` · RUNNING/IDLE · MODEL · STEP · TURN · TOK/S（2s 平均）· CACHE · `EXIT · ESC`

### 四块面板

| 面板 | 内容 | 真实来源 |
|---|---|---|
| **THINKING / EVENTS** | 流式思考文本（最多显示尾部 320 字符）+ 最近 7 条事件流 | `reasoning-delta`；`tool/call`、`tool/result`、`user/message`、`turn/end` |
| **TOKENS / CACHE** | OUT、缓存命中率、瞬时 tok/s + 双折线 | `text-delta` 计数；`usage` / `tokenUsage`；50ms 序列 |
| **TOOL DISPATCH** | 最近 6 个工具（名称/状态/耗时）+ 24 格耗时热力条 | `tool/call` → `tool/result` 的时间差 |
| **CONTEXT** | 已用/窗口进度条、IN/OUT/TOTAL、工具数 | `contextPressure`、`tokenUsage` |

### 视觉规格

- 深色半透明卡片 + 1px 细边 + `backdrop-filter: blur(8px)`
- 等宽字体、8–10px 标签、17px 数字、tabular-nums
- 青色 `#98e0cf` / 粉色 `#f0a6c6`，与 HALOFLUX 原作一致
- 空数据时显示"等待词元…" / "等待工具调用"，不造数

---

## 5. 设计四：瞬时 token 波动折线

**目标**：展示 token 消耗的完整瞬时波动，而不是平滑后的平均线。

### 采样

| 项 | 值 |
|---|---|
| 采样频率 | 20 Hz（50ms） |
| 计数器 | `arrivalTokens`：回答 `text-delta` + 思考 `reasoning-delta` |
| 速率 | `deltaTokens * 1000 / clamp(dt, 50, 250)` |
| 序列长度 | 2400 样本（约 2 分钟） |
| 图表窗口 | 最近 600 样本（30 秒） |
| 空闲 | 不追加样本；恢复时重新对齐，避免假尖峰 |
| 隐藏标签页 | `dt > 250ms` 时对齐后跳过，不制造巨大假峰 |

### 三条线

| 线 | 颜色 | 含义 |
|---|---|---|
| 瞬时 | 青色实线 + 10% 面积填充 | 每个 50ms 切片的真实到达速率 |
| 平均 | 白色细虚线 | 2 秒滑动平均（趋势） |
| 缓存 | 粉色虚线 | 缓存命中率 0–1 |

图例：`NOW` / `AVG` / `CACHE` / `PEAK`；右上角显示窗口内 `MAX ... TOK/S`。

### 为什么这样设计

- 50ms 桶能保留"一次来 8 个 token → 160 tok/s"的脉冲形状
- 分母钳到 50–250ms，避免调度抖动（1ms 间隔）算出 9000 tok/s 的假峰
- 思考 delta 也计数，所以模型"想"的时候线是活的，而不是平在 0
- 工具调用 / 等待期间 `running` 仍为 true，会持续采样 0，形成真实的空档
- 瞬时线不加平滑；平均线只作为辅助

### 缓存命中率

```
uncached = max(0, inputTokens - cacheRead - cacheWrite)
hit      = cacheRead / (uncached + cacheRead + cacheWrite)
```

两种 `inputTokens` 语义（含缓存 / 不含缓存）都能得到 0–100% 的合理值。

---

## 6. 设计五：实时数据层

`src/live.js` 新增 / 扩展的字段：

| 字段 | 含义 |
|---|---|
| `reasoning` | 最近 1200 字符的思考文本 |
| `reasoningAt` | 最后一条思考时间 |
| `cacheReadTokens` / `cacheWriteTokens` / `uncachedInputTokens` | 缓存明细 |
| `cacheHit` | 0–1 命中率 |
| `instTps` | 最新 50ms 切片速率 |
| `series[]` | `{t, tps, avg, cache, out, ctx}` |
| `tools[].start` / `tools[].dur` | 工具开始时间 / 耗时 |

事件映射：

- `reasoning-delta` → 思考文本 + 流式 token 计数
- `text-delta` → 回答 token 计数 / 队列 / tps
- `tool/call` / `tool/result` → 工具状态与耗时
- `usage` / `tokenUsage` → 输入、输出、缓存
- `contextPressure` → 上下文占用
- `modelSelection` → 模型名
- `turn/start|end`、`step/start|end` → turn / step
- `useSessionStatus` → running / idle

---

## 7. 设计六：参数系统

参数总数从 79 增至 **81**，仍由同一套 `PARAMS` 驱动控制台与设置页。

| 新参数 | 默认 | 范围 | 作用 |
|---|---|---|---|
| `runOpacity` | 1 | 0–1 | 运行态不透明度 |
| `immersive` | 1 | 0–1 | 运行时自动沉浸 |

调整过的默认：

- `opacity`：0.45（空闲）
- `runLevel`：1.6
- `attackMs` / `releaseMs`：800 / 2600
- 引擎 `BASE` 同步包含新参数，旧 localStorage 参数仍兼容

---

## 8. 生命周期与边界

| 场景 | 行为 |
|---|---|
| 切换会话 | 序列清空、工具清空、思考清空；光环转一圈（原设计） |
| 新会话空白页 | `present=false`，退出沉浸 |
| 运行中切到空闲会话 | 收光与转圈重叠，1.8s 后退出沉浸 |
| Esc 提前退出 | 本次运行内不再自动进入；下次运行恢复 |
| 手动 `I` | 无运行也可预览看板 |
| 隐藏标签页 | 停止采样 / 停止绘制；恢复后重新对齐 |
| 无 token 的长工具调用 | 序列持续为 0，曲线真实显示空档 |
| 思考无回答 | 思考面板有文本，曲线有速率（按思考 token 估算） |

快捷键：`C` 控制台、`H` HUD、`I` 沉浸、`Esc` 退出、`F` 全屏（原功能）。

---

## 9. 工程与验证

### 安装

- 链接安装到 `C:\Users\HSY\.dsh\profiles\desktop`（GUI 实际使用的 profile，含 ds-bot）
- 依赖：`dsh-haloflux: link:D:\project\haloflux-main\.vendor\dsh-haloflux`
- 备份：`package.json.bak-1793588367342`
- 卸载：恢复备份 + 删除 `node_modules\dsh-haloflux` 链接

### 构建

```bash
cd .vendor/dsh-haloflux
node build.mjs          # src/*.js → client.js（约 231.9 KB）
```

`build.mjs` 顺序：`engine.js → state.js → live.js → hud.js → dock.js → settings.js → mount.js`

### 自检（全部通过）

| 套件 | 覆盖 |
|---|---|
| `tools/engine-smoke.cjs` | 81 参数、BASE、亮度包络、revolve、switchFx、三档数据 |
| `tools/client-smoke.cjs` | 模块注册、双 slot、参数 store |
| `tools/dock-smoke.cjs` | 看板空数据/运行数据渲染、图表组件 |
| `tools/live-selftest.mjs` | 词元队列、tps、序列采样、瞬时峰、instTps 一致性、销毁 |

新增断言：序列持续采样、存在高于 2 秒平均的爆发峰、`instTps` 与最新样本一致。

### 文档

- `PATCH-immersion.md`：改动清单、数据来源、重建/回滚
- 本文件：完整设计清单

---

## 10. 未完成 / 已知限制

| 项 | 状态 | 说明 |
|---|---|---|
| 浏览器实际可见性 | ⏳ | 代码已完成，页面仍加载旧 bundle；需硬刷新/重启 |
| 顶部 KPI 条 | ⬜ | 截图里的顶部横条未做，KPI 收在看板状态条 |
| 完整 8 宫格状态墙 | ⬜ | 只做了 4 块核心面板 |
| 纵轴分位数截断 | ⬜ | 当前线性满量程；一次超大 chunk 会压扁正常波动 |
| 逐 token 精确计量 | ⬜ | 用字符切分近似，非 tokenizer |
| 缓存命中逐 token 更新 | ⬜ | 随 `usage` 帧更新，通常每步一次 |
| 思考内容脱敏 | ⬜ | 直接显示原文；仅本地渲染，未上屏到日志 |
| 商业化 | ❌ | PolyForm NC，禁止商用 |

---

## 11. 文件地图

| 文件 | 作用 |
|---|---|
| `src/engine.js` | 新增 `runOpacity` / `immersive` 参数；canvas 不透明度跟随 level 包络 |
| `src/live.js` | 思考、缓存、工具耗时、20Hz 瞬时序列 |
| `src/dock.js` | 沉浸看板（4 面板 + SVG 折线） |
| `src/mount.js` | 沉浸状态机、遮罩、键盘、看板挂载 |
| `src/state.js` | 默认值（runLevel 1.6 / runOpacity 1 / immersive 1） |
| `build.mjs` | 加入 dock.js |
| `tools/engine-smoke.cjs` | 81 参数与亮度断言 |
| `tools/dock-smoke.cjs` | 看板渲染自检 |
| `tools/live-selftest.mjs` | 瞬时序列断言 |
| `client.js` | 构建产物（勿手改） |
| `PATCH-immersion.md` | 改动/回滚说明 |

---

## 12. 激活检查清单

1. `Ctrl+Shift+R` 硬刷新当前页面
2. 发一条消息，确认：
   - 页面在约 900ms 内淡到近黑
   - 底部看板升起
   - `THINKING / EVENTS` 有内容
   - `TOKENS / CACHE` 折线出现尖峰和归零
3. 看板没出现 → 完整退出并重开 DSH
4. 想关掉自动沉浸：`C` → 插件组 → 沉浸模式 = 0
5. 想连光环文字也全真实：设置 → HALOFLUX → 数据抓取 = 完全抓取
