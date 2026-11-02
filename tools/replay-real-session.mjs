/**
 * Replay a REAL DSH session log (jsonl, already decompressed) through
 * src/live.js and verify that tool start/end/duration come from the event
 * `time` fields, not from the UI clock.
 *
 *   node tools/replay-real-session.mjs <session.jsonl>
 *
 * This is a local validation helper, not part of the shipped bundle. It uses
 * recorded DSH events exactly as the client eventSource exposes them:
 *   { type: 'event', event: { type, seq, time, data } }
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = process.argv[2]
if (!file || !fs.existsSync(file)) {
  console.log('SKIP: pass a real decompressed session .jsonl path')
  process.exit(0)
}

const src = fs.readFileSync(path.join(here, '..', 'src', 'live.js'), 'utf8')
const createHalofluxLive = new Function(src + '\nreturn createHalofluxLive;')()

const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
const events = []
for (const line of lines) {
  try {
    const o = JSON.parse(line)
    if (o && typeof o.type === 'string' && typeof o.seq === 'number') events.push(o)
  } catch { /* ignore corrupt line */ }
}

const calls = new Map()
const results = new Map()
for (const e of events) {
  if (e.type === 'tool/call') {
    const id = e.data && e.data.callId
    if (id) calls.set(String(id), e.time)
  } else if (e.type === 'tool/result') {
    const m = (e.data && e.data.message) || {}
    const s = m.source || {}
    const id = m.toolCallId || s.callId
    if (id) results.set(String(id), e.time)
  }
}

const entries = events.map((event) => ({ type: 'event', event }))
const eventSource = {
  getSnapshot() {
    return { entries, hasMore: false, revision: 1, change: { kind: 'replace', entries } }
  },
  subscribe() { return () => {} },
}
const session = {
  getSnapshot() { return { running: false } },
  projections: { faceOf() { return { getSnapshot() { return undefined } } } },
}
let currentId = 'S-real'
const live = createHalofluxLive({
  getSessionId: () => currentId,
  bindingOf: () => ({ sessionId: currentId, session, eventSource }),
})
live.setSession('S-real')

await new Promise((r) => setTimeout(r, 200))

const completed = live.tools.filter((t) => t.state !== 'running' && Number.isFinite(t.dur))
let bad = 0
for (const t of completed) {
  const c = calls.get(String(t.id))
  const r = results.get(String(t.id))
  const ok = c !== undefined && r !== undefined && t.start === c && t.t === r && t.dur === r - c
  if (!ok) {
    bad++
    console.log('MISMATCH', t.id, { start: t.start, call: c, t: t.t, result: r, dur: t.dur, expected: r - c })
  }
}
const errors = completed.filter((t) => t.state === 'error').length

/* The tail window may not contain a failure; replay one real error pair from
   anywhere in the log to verify ERROR + real duration handling. */
const errResult = events.find((e) => e.type === 'tool/result' && e.data && e.data.message && e.data.message.isError === true)
let errorPair = null
if (errResult) {
  const m = errResult.data.message
  const id = m.toolCallId || (m.source && m.source.callId)
  const errCall = events.find((e) => e.type === 'tool/call' && e.data && String(e.data.callId) === String(id))
  if (errCall) {
    const pairEntries = [{ type: 'event', event: errCall }, { type: 'event', event: errResult }]
    const pairSource = {
      getSnapshot() { return { entries: pairEntries, hasMore: false, revision: 1, change: { kind: 'replace', entries: pairEntries } } },
      subscribe() { return () => {} },
    }
    const pairLive = createHalofluxLive({
      getSessionId: () => 'S-error',
      bindingOf: () => ({ sessionId: 'S-error', session, eventSource: pairSource }),
    })
    pairLive.setSession('S-error')
    await new Promise((r) => setTimeout(r, 100))
    const t = pairLive.tools.find((x) => String(x.id) === String(id))
    errorPair = t ? { state: t.state, dur: t.dur, expected: errResult.time - errCall.time } : null
    if (!t || t.state !== 'error' || t.dur !== errResult.time - errCall.time) bad++
    pairLive.dispose()
  }
}

console.log(JSON.stringify({
  logLines: lines.length,
  durableEvents: events.length,
  totalToolCallsInLog: calls.size,
  totalToolResultsInLog: results.size,
  windowToolCalls: live.toolCalls,
  windowToolResults: live.toolResults,
  retainedTools: live.tools.length,
  completedSamples: completed.length,
  errorSamples: errors,
  errorPair,
  lastToolEventAt: live.lastToolEventAt,
  mismatches: bad,
}, null, 2))

live.dispose()
process.exit(bad === 0 && completed.length > 0 ? 0 : 1)
