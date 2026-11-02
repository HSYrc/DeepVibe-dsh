# Local patch — immersive dock (not part of upstream 0.3.1)

Applied on top of [dsh-haloflux](https://github.com/Ke-wood/dsh-haloflux) 0.3.1
inside this checkout. Upstream is unchanged; this tree is a fork used by the
local DSH profile (linked from `~/.dsh/profiles/desktop/node_modules`).

## Behaviour added

- While a session is **running**, the halo brightens to `runOpacity` (default 1)
  and the bottom instrument dock rises: streamed reasoning, event feed, token
  rate, prompt-cache hit ratio chart, tool dispatch with durations/heat strip,
  context occupancy.
- The host page fades to 94% black behind the halo for the duration of the run,
  then returns after the light release (1.8 s hold + 0.9 s fade).
- `immersive` parameter (0/1, default 1) turns the automatic transition off.
  `I` toggles it manually; `Esc` or the dock's `EXIT · ESC` leaves early and
  suppresses auto-entry until the next run.

## Files

| File | Change |
|---|---|
| `src/engine.js` | `runOpacity` + `immersive` params; canvas opacity follows the level envelope (`idleMotion` → `runLevel`) |
| `src/live.js` | streamed `reasoning-delta` text, cache read/write tokens + hit ratio, 20 Hz instantaneous series (answer + reasoning tokens, 50 ms buckets), tool start/duration |
| `src/dock.js` | new immersive dock (React, plain fragment; CSS included) |
| `src/mount.js` | immersion state machine, veil, `I`/`Esc`, dock mount; hint text |
| `src/state.js` | author defaults: `runLevel 1.6`, `runOpacity 1`, `immersive 1` |
| `build.mjs` | adds `dock.js` to the bundle |
| `tools/engine-smoke.cjs` | 81 params, opacity assertions |
| `tools/dock-smoke.cjs` | new render check |

## Rebuild / test

```bash
node build.mjs
node tools/engine-smoke.cjs
node tools/client-smoke.cjs
node tools/dock-smoke.cjs
node tools/live-selftest.mjs
```

## Data sources (all real, read-only)

- `assistant/live-chunk` → `reasoning-delta` (thinking), `text-delta` (stream text),
  `tool-call-delta`, `usage` (input/output/cache tokens)
- durable `tool/call` / `tool/result` → tool name, state, duration
- `turn/start|end`, `step/start|end` → step/turn
- projections `contextPressure`, `tokenUsage`, `modelSelection` → context, cache, model
- `useSessionStatus` → running/idle

Cache hit = `cacheRead / (uncached + cacheRead + cacheWrite)`; the uncached share
is derived from `inputTokens` minus the cached parts, clamped at 0, so both
"input includes cache" and "input excludes cache" usage shapes report sanely.

## Notes / limits

- Reasoning only appears if the model streams `reasoning-delta`; otherwise the
  panel falls back to the tail of the answer stream.
- Cache figures update when a `usage` frame arrives (usually per step), not per token.
- The fade is a veil inside the `shell.overlay` layer, so it needs no host DOM
  selectors and cannot hide host modals that render above the overlay.
- Rebuilding `client.js` requires a page reload; the host may need a restart if
  it caches client bundles at boot.

## Rollback

Inside this checkout: `git checkout -- src build.mjs tools client.js` removes the
patch (client.js is generated; rebuild after restoring). The profile entry itself
is unchanged (`dsh-haloflux` link).
