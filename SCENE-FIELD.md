# 第三块看板：真实数据接入与伪数据清除报告

> 日期：2026-11-02
> 范围：第三块 `SHARED SCENE / DIFFERENCE FIELD` 的数据链路与本地基准。
> 布局：沿用上一轮的原位替换，仍是四块卡片中的第 3 块。

## 1. 真实 DSH 事件结构（审计）

从当前真实会话日志（`session.v4.jsonl.zstd`，解压后 2054 行 / 2053 个 durable 事件）
核对到的事件形状：

```json
{
  "type": "tool/call",
  "seq": 20,
  "time": 1793587269872,
  "data": {
    "turn": 1, "step": 1,
    "callId": "call_00_x2huCwBhpfpbEZk4NmMk3748",
    "name": "pwsh",
    "arguments": "{...}"
  }
}
```

```json
{
  "type": "tool/result",
  "seq": 23,
  "time": 1793587269885,
  "data": {
    "turn": 1, "step": 1,
    "message": {
      "role": "tool",
      "toolCallId": "call_00_x2huCwBhpfpbEZk4NmMk3748",
      "source": { "kind": "tool", "callId": "call_00_x2huCwBhpfpbEZk4NmMk3748" },
      "content": [{ "type": "text", "text": "..." }],
      "isError": true
    }
  }
}
```

关键事实：

- `time` 在事件顶层，是真实 epoch 毫秒。
- 调用标识是 `data.callId`；结果是 `data.message.toolCallId` / `message.source.callId`。
- 失败由 `message.isError`（或 `data.error`）表达。
- 真正的开始/结束时间只能是这两个 `time`，不是前端处理时间。
- 日志中共 **362 个 tool/call、361 个 tool/result**（统计时仍有 1 个未完成）。

## 2. 从 DSH 到 Implementation 的完整链路

```text
eventSource entries
  { type:'event', event:{ type:'tool/call'|'tool/result', seq, time, data } }
        │
        ▼
live.js applyDurable(event)
        │  eventTime(event.time)
        ▼
upsertTool(callId, name, state, event.time)
   tool/call   → start = event.time
   tool/result → t = event.time
                 dur = t - start   （两者都存在时）
        │
        ▼
live.tools[]  （每项携带 id/name/state/start/t/dur/turn/step/sessionId）
        │
        ▼
dock.js completedTools()
   state !== 'running' 且 dur 是有限非负数
        │
        ▼
filterImplementation()
   有基准时排除基准样本：id 相同，或同会话 start <= baseline.createdAt
        │
        ▼
SceneField → 24 格 IMPLEMENTATION
```

## 3. 修正了哪些伪造 / 不可靠数据

| 问题 | 修正 |
|---|---|
| `start` 使用 `Date.now()`（UI 处理时间） | 改为事件真实 `tool/call.time` |
| `t` 使用 `Date.now()` | 改为事件真实 `tool/result.time` |
| `dur` 用两个 UI 时间相减 | 改为 `result.time - call.time` |
| `tool-call-delta` 提前创建带假 `start` 的条目 | 不再写 `start`；等 durable `tool/call` |
| 只有结果、没有调用的条目被当成 0ms | `dur` 保持 `undefined`，不进矩阵 |
| `LIVE` 只看 `running` + 有样本 | 必须收到真实工具事件；区分 `WAITING FOR DSH EVENTS` / `COLLECTING` / `LIVE` / `STALE` / `NO DATA` / `SOURCE ERROR` |
| Reference 从 `live.reference` 或 fixture 读取 | 移除该生产接缝；只从用户明确捕获的本地基准读取 |
| 没有基准却显示对比 | 显示 `BASELINE MISSING`，差异 `N/A`，不出百分比 |
| 测试 fixture 可能进入生产 | fixture 只在 `tools/`；生产构建只打包 `src/` |

## 4. `id` / `matchKey` 等字段的真实来源

| 字段 | 来源 |
|---|---|
| `id` | `tool/call.data.callId`；结果回填来自 `toolCallId` / `source.callId` |
| `matchKey` | **没有来源，也不生成**。只有事件自带时才会使用；当前 DSH 不提供 |
| `name` | `tool/call.data.name`；结果中的 `message.source.name` 可补 |
| `state` | `running`（调用已到）/ `ok` / `error`（`isError`） |
| `start` | 真实 `tool/call.time` |
| `t` | 真实 `tool/result.time` |
| `dur` | `t - start`，两者都有效才写入 |
| `sessionId` | 当前绑定的 DSH session id（`live.sessionId`） |
| `turn` / `step` | 事件 `data.turn` / `data.step` |

不同运行之间 call id 不通用，因此：

- 单元格级别只按 `id` 一一配对；
- 没有相同 id 时**不做下标配对**；
- 改为同工具组的统计对比（中位数 / P95 / 相对变化）。

## 5. Reference：真实基准保存

新增 `CAPTURE AS REFERENCE`（第三块标签行右侧）：

- 只在 `running === false` 且有已完成样本时可用；
- 点击后把**当前真实完成的工具样本**写入本地基准；
- 不会自动捕获，也不会把当前数据自动复制成 Reference；
- 不覆盖、不删除已有记录：基准以数组追加，读取最新一条为当前基准；
- 存储键：`dsh-haloflux:scene:baselines:v1`
- Schema：`{ schema:1, baselines:[ { schema:1, id, createdAt, sessionId, source, samples[] } ] }`
- 每条样本保存：`id`、`tool`、`dur`、`status`、`start`、`t`、`turn`、`step`、`sessionId`、`source`
- 读取时校验 schema / 时间 / tool / dur，无效样本被过滤；整份损坏则显示 `BASELINE SOURCE ERROR`，并且**拒绝覆盖**
- 存储不可用 / 写入失败会显示错误，不伪造成功
- 捕获后，当前实现里 `id` 相同或同会话 `start <= createdAt` 的样本被排除，避免同一批数据同时进入 Reference 和 Implementation

当前运行环境无法由我直接点击浏览器按钮，所以：

- 本地存储逻辑已用 fake localStorage 做单元/集成验证；
- **真实浏览器里的 CAPTURE → reload → 仍存在** 仍需你手动点一次确认。

## 6. Difference 计算

单格（只有稳定 id 相同才成立）：

```text
delta_ms  = implementation_ms - reference_ms
delta_pct = (implementation_ms - reference_ms) / reference_ms * 100%
```

- 参考为 0 / 无效：不算 pct，显示缺失
- 任一侧缺失：不算
- 负值 FASTER（青）、正值 SLOWER（粉）、零 EQUAL（灰）
- 无法一一匹配时：按工具分组的中位数对比，只在统计行显示 `GROUP Δ`，不伪造单元格差异
- 无基准：`BASELINE MISSING`，全部 `N/A`

## 7. 24 格与第三块尺寸

第三块仍是原 `.hfx-card`，四列网格中的第 3 格，238px 高、约 1fr 宽，不新增卡片 / 行 / 高度。

```text
REFERENCE 24 格（8×3）    IMPLEMENTATION 24 格（8×3）
DIFFERENCE 24 格（24×1，中心零线）
MATCHED / FASTER / SLOWER / MEDIAN Δ / P95 Δ
CALLS / RESULTS / LAST / SAMPLES / REF / BASE
```

- 不足 24 格用虚线空态，不复制、不补零。
- 零耗时用灰点，空态用虚线。
- 统一色阶：两组共同 P95，超出阈值加 `.clip` 描边，图例显示 `P95 · N CLIPPED`。
- 参考中性灰，实现粉色。
- 悬停详情、配对高亮、点击固定沿用上一轮。

## 8. 测试结果

```text
engine-smoke   PASS=95  FAIL=0
client-smoke   PASS=17  FAIL=0
dock-smoke     PASS=42  FAIL=0
live-selftest  PASS=58  FAIL=0
node --check client.js   OK
```

真实会话日志回放（`tools/replay-real-session.mjs`）：

```json
{
  "logLines": 2054,
  "durableEvents": 2053,
  "totalToolCallsInLog": 362,
  "totalToolResultsInLog": 361,
  "windowToolCalls": 64,
  "windowToolResults": 63,
  "retainedTools": 24,
  "completedSamples": 23,
  "errorSamples": 0,
  "errorPair": { "state": "error", "dur": 13, "expected": 13 },
  "lastToolEventAt": 1793593380006,
  "mismatches": 0
}
```

- 23 个有效样本的 `start` / `t` / `dur` 与原始事件 `time` 逐一比对，**0 处不一致**。
- 从日志中任取一个真实失败对，`state=error`，耗时 13ms 与 `result.time - call.time` 一致。
- 窗口计数 64/63 是 `SCAN_MAX=400` 的扫描尾部；日志总计 362/361。UI 的 `CALLS/RESULTS` 是窗口计数，不是全量总数。

## 9. 真实环境验证状态（不要混淆）

| 项目 | 状态 |
|---|---|
| 单元测试（纯函数 / 渲染） | ✅ 通过 |
| fixture 测试（fake localStorage、假 live） | ✅ 通过 |
| 真实 DSH **事件日志**回放 | ✅ 通过（0 mismatch） |
| 真实 DSH **浏览器内**实时接入 | ⏳ 未验证：需要硬刷新/重启后实际跑一次工具 |
| 真实浏览器 CAPTURE → reload 持久化 | ⏳ 未验证：需要手动点击并刷新 |
| 真实基准 vs 新运行的 UI 差异 | ⏳ 未验证：需要先捕获基准，再跑新任务 |

**不能把前三项说成后三项已经完成。**

## 10. 未实现 / 取舍

| 项 | 原因 |
|---|---|
| 全量工具调用总数 | `live.tools` 只保留 24；计数是扫描窗口内的，日志全量需另读 |
| 基准选择 / 删除 | 只读取最新基准，不提供删除；避免误删用户记录 |
| 跨运行单元格匹配 | call id 不通用，DSH 没有稳定 experiment id；采用组级统计 |
| 真实 UI 捕获验证 | 无浏览器交互通道，需你手动验证 |
| 6 行工具列表 | 上一轮已移除；信息由格子的悬停/点击详情承载 |

## 11. 未修改确认

- `src/engine.js`、`src/mount.js`、`src/state.js`、`build.mjs`：本任务未改
- `src/live.js`：只改工具时间/计数/会话出口；Token、Cache、TPS、Context、事件订阅未改
- 第 1、2、4 块面板：未改
- 四列布局 / 第三块尺寸 / 看板升降 / 沉浸模式：未改
- `lab.html` / `mobile.html` / `wallpaper/`：未改

## 12. 如何验证真实接入

1. `Ctrl+Shift+R` 硬刷新（必要时重启 DSH）
2. 运行一次会触发工具的对话
3. 第三块应出现 `IMPLEMENTATION n/24`，格子来自真实 `tool/call → tool/result`
4. 运行结束后点 `CAPTURE AS REFERENCE`
5. 刷新页面，Reference 应仍存在（`BASELINE READY` + `REF n/24` + `BASE xxxx`）
6. 再运行一次同工具任务，Difference 应出现 `GROUP Δ`（跨运行无相同 call id，不会有伪造的单格配对）
7. 若第三块显示 `WAITING FOR DSH EVENTS`，说明客户端没有拿到事件，而不是样本为 0
