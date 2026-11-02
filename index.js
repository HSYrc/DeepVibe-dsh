/**
 * HALOFLUX Host half — portable Platform usage bridge.
 *
 * Uses the DSH account service's Host-only Platform session (origin + grant)
 * to read the real wallet balance and today's billed cost from
 * platform.deepseek.com. The renderer only receives aggregates; the account
 * token never leaves the Host.
 */
const ROUTE = '/haloflux/platform-summary'
const CACHE_MS = 3000
let cache = null

function sumCost(cost, currency) {
  let total = 0
  const groups = []
  if (cost && Array.isArray(cost.data)) groups.push(...cost.data)
  if (cost && Array.isArray(cost.function_series)) {
    groups.push({
      currency: cost.data && cost.data[0] ? cost.data[0].currency : currency,
      series: cost.function_series,
    })
  }
  for (const group of groups) {
    if (group.currency && group.currency !== currency) continue
    for (const series of (group.series || [])) {
      for (const bucket of (series.buckets || [])) total += Number(bucket.cost) || 0
    }
  }
  return total
}

function headersFor(session, authName) {
  const headers = {
    ...(session.requestHeaders || {}),
    'x-client-bundle-id': '',
    'x-client-platform': 'desktop-win',
    'x-client-version': '0.2.1-rc.5',
    'x-client-locale': 'zh_CN',
    'x-client-timezone-offset': '28800',
  }
  if (authName === 'x-dsh-auth-token') headers['x-dsh-auth-token'] = session.token
  else if (authName === 'bearer') headers.authorization = 'Bearer ' + session.token
  else headers.authorization = session.token
  return headers
}

async function getJson(url, headers) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* non-json */ }
  return { status: res.status, json, text }
}

async function readPlatform(account) {
  const session = await account.getPlatformSession()
  if (!session || !session.origin || !session.token) {
    return { ok: false, error: 'signed out' }
  }
  const d = new Date()
  const tz = -d.getTimezoneOffset() * 60
  const start = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000)
  const end = start + 86400
  let summary = null
  let usedAuth = ''
  for (const authName of ['x-dsh-auth-token', 'bearer', 'raw']) {
    const headers = headersFor(session, authName)
    const out = await getJson(session.origin + '/api/v0/users/get_user_summary', headers)
    if (out.status === 200 && out.json && out.json.code === 0 && out.json.data && out.json.data.biz_data) {
      summary = out.json.data.biz_data
      usedAuth = authName
      break
    }
  }
  if (!summary) return { ok: false, error: 'balance request failed' }
  const wallets = Array.isArray(summary.normal_wallets) ? summary.normal_wallets : []
  const bonusWallets = Array.isArray(summary.bonus_wallets) ? summary.bonus_wallets : []
  const currency = (wallets[0] && wallets[0].currency) || 'CNY'
  const balance = wallets.filter((w) => w.currency === currency)
    .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
  const bonus = bonusWallets.filter((w) => w.currency === currency)
    .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)

  let todayCost = null
  try {
    const headers = headersFor(session, usedAuth)
    const out = await getJson(
      session.origin + '/api/v0/usage/by_api_key/cost?start=' + start + '&end=' + end + '&tz=' + tz,
      headers,
    )
    if (out.status === 200 && out.json && out.json.code === 0 && out.json.data && out.json.data.biz_data) {
      todayCost = Number(sumCost(out.json.data.biz_data, currency).toFixed(6))
    }
  } catch { /* balance still useful */ }

  return {
    ok: true,
    source: 'dsh-host',
    capturedAt: new Date().toISOString(),
    currency,
    balance: Number(balance.toFixed(6)),
    bonus: Number(bonus.toFixed(6)),
    todayCost,
  }
}

export function apply(ctx) {
  ctx.inject(['webServer', 'deepseekAccount'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: ROUTE,
      handler: async (req, res) => {
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405)
          res.end(JSON.stringify({ ok: false, error: 'method not allowed' }))
          return
        }
        try {
          const account = webCtx.deepseekAccount
          const session = await account.getPlatformSession()
          const key = session ? String(session.token) : ''
          if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) {
            res.writeHead(cache.value.ok ? 200 : 503)
            res.end(JSON.stringify(cache.value))
            return
          }
          const value = await readPlatform(account)
          if (value.ok) cache = { key, at: Date.now(), value }
          res.writeHead(value.ok ? 200 : 503)
          res.end(JSON.stringify(value))
        } catch (error) {
          res.writeHead(500)
          res.end(JSON.stringify({ ok: false, error: 'read failed' }))
        }
      },
    }), 'haloflux: platform summary')
  })
}
