// Lumiere product page.
// Accounts: Privy (email code or MetaMask signature). Live data: Lumiere API with the Privy access token (see /app/config.js).
// Preview mode (no configuration or signed out): an illustrative basket computed in the browser with the
// same formulas as the API, labelled as illustrative everywhere it appears.

import { loadAnswers, resetOnboarding, runOnboarding, saveAnswers, scopeOnboarding } from "./onboarding.js"
import { runTour, scopeTour, tourDone } from "./tour.js"
import { getPrivy, currentUser, runAuthGate, signOut } from "./auth.js"

const CFG = window.LUMIERE_CONFIG || {}
const AUTH = Boolean(CFG.privyAppId)
const API = Boolean(CFG.apiBaseUrl)
const $ = sel => document.querySelector(sel)

const LABELS = {
  housing: "Housing", groceries: "Groceries", restaurants: "Restaurants", transportation: "Transportation",
  energy: "Energy", healthcare: "Healthcare", insurance: "Insurance", subscriptions: "Subscriptions",
  education: "Education", entertainment: "Entertainment", other: "Other",
}
const SCENARIO_LABELS = { baseline: "Baseline", lower_inflation: "Lower inflation", higher_inflation: "Higher inflation" }

let currency = "USD"
let privy = null
let userEmail = null
let live = false // signed in AND the API is configured

// ------------------------------------------------------------------ formatting

const money = (v, digits = 0) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: digits }).format(v)
const pct = (v, digits = 1) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`)
const pp = v => (v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)} pt`)
const monthLabel = ym => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

// ------------------------------------------------------------------ illustrative model (preview)

const DEMO = {
  base: { housing: 1500, groceries: 420, transportation: 210, restaurants: 160, energy: 130, healthcare: 95, entertainment: 70, subscriptions: 48 },
  inflation: { housing: 0.042, groceries: 0.021, transportation: 0.018, restaurants: 0.036, energy: 0.065, healthcare: 0.031,
               entertainment: 0.02, subscriptions: 0.012, other: 0.029 },
  headline: 0.029,
  months: 21, // 2025-01 .. 2026-09
}
let answers = loadAnswers()

function applyAnswers() {
  if (!answers?.spending) return
  const base = Object.fromEntries(Object.entries(answers.spending).filter(([, v]) => v > 0))
  if (Object.keys(base).length) DEMO.base = base
  if (answers.reserves > 0) $("#reserves").value = Math.round(answers.reserves)
}

function demoData() {
  const total = Object.values(DEMO.base).reduce((a, b) => a + b, 0)
  const w = Object.fromEntries(Object.entries(DEMO.base).map(([c, v]) => [c, v / total]))
  const history = []
  for (let t = 0; t < DEMO.months; t++) {
    const d = new Date(2025, t, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const pei = 100 * Object.entries(w).reduce((s, [c, wc]) => s + wc * (1 + DEMO.inflation[c]) ** (t / 12), 0)
    history.push({ month: ym, pei, headline: 100 * (1 + DEMO.headline) ** (t / 12) })
  }
  const last = history.at(-1), prev = history.at(-13)
  const peiYoy = last.pei / prev.pei - 1, headYoy = last.headline / prev.headline - 1
  const scenario = shift => {
    let sum = 0
    for (let m = 1; m <= 12; m++)
      for (const [c, b] of Object.entries(DEMO.base)) sum += b * (1 + DEMO.inflation[c] + shift / 100) ** (m / 12)
    return sum
  }
  return {
    pei: { value: last.pei, as_of_month: last.month, base_month: history[0].month, year_over_year: peiYoy,
           headline_year_over_year: headYoy, gap_vs_headline_yoy_pp: (peiYoy - headYoy) * 100 },
    history,
    summary: { average_monthly_expenses: total,
               by_category: Object.entries(DEMO.base).map(([c, v]) => ({ category: c, monthly_average: v, share: v / total })) },
    scenarios: [["baseline", 0], ["lower_inflation", -1.5], ["higher_inflation", 3]].map(([name, shift]) => {
      const t = scenario(shift)
      return { scenario: name, inflation_shift_pp: shift, expected_total: t, expected_monthly_average: t / 12 }
    }),
  }
}

function demoCoverage(reserves) {
  const run = shift => {
    let remaining = reserves, months = 0
    for (let m = 1; m <= 600; m++) {
      const spend = Object.entries(DEMO.base).reduce((s, [c, b]) => s + b * (1 + DEMO.inflation[c] + shift / 100) ** (m / 12), 0)
      if (remaining >= spend) { remaining -= spend; months += 1 } else { return months + remaining / spend }
    }
    return null
  }
  const monthly = Object.values(DEMO.base).reduce((a, b) => a + b, 0)
  return { nominal: { months: reserves / monthly },
           projected: [["baseline", 0], ["lower_inflation", -1.5], ["higher_inflation", 3]].map(([s, x]) => ({ scenario: s, months: run(x) })) }
}

// ------------------------------------------------------------------ API (live)

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}

async function api(path, init = {}) {
  const token = await privy.getAccessToken()
  if (!token) throw new ApiError(401, "unauthorized", "Your session has expired. Please sign in again.")
  const headers = { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json"
  const res = await fetch(`${CFG.apiBaseUrl.replace(/\/$/, "")}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body?.error?.code || "http_error", body?.error?.message || res.statusText)
  }
  return res.status === 204 ? null : res.json()
}

// ------------------------------------------------------------------ rendering

function banner(text) {
  const el = $("#banner")
  el.hidden = !text
  el.textContent = text || ""
}

function renderPei(pei) {
  $("#pei-value").textContent = pei ? pei.value.toFixed(1) : "—"
  $("#pei-yoy").textContent = pei ? pct(pei.year_over_year) : "—"
  $("#head-yoy").textContent = pei ? pct(pei.headline_year_over_year) : "—"
  $("#pei-gap").textContent = pei ? pp(pei.gap_vs_headline_yoy_pp) : "—"
}

function renderChart(history, illustrative) {
  const el = $("#pei-chart")
  if (!history?.length) { el.innerHTML = ""; return }
  el._last = [history, illustrative]
  const W = Math.max(el.clientWidth, 280), H = Math.max(el.clientHeight, 220), L = 30, R = 44, T = 10, B = 26
  const vals = history.flatMap(h => [h.pei, h.headline]).filter(v => v != null)
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5)
  const x = i => L + (i / Math.max(history.length - 1, 1)) * (W - L - R)
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const step = Math.max(1, Math.ceil((hi - lo) / 4))
  let g = ""
  for (let v = lo; v <= hi; v += step)
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eef1f4"/><text x="0" y="${y(v) + 4}">${v}</text>`
  history.forEach((h, i) => {
    const every = W < 500 ? 6 : 3
    const isLast = i === history.length - 1
    if ((i % every === 0 && history.length - 1 - i >= every / 2) || isLast) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${monthLabel(h.month)}</text>`
  })
  const path = key => history.map((h, i) => (h[key] == null ? "" : `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(h[key]).toFixed(1)}`)).join("")
  const last = history.at(-1)
  g += `<path d="${path("headline")}" fill="none" stroke="#9aa6b4" stroke-width="1.6"/>`
  g += `<path d="${path("pei")}" fill="none" stroke="#07111d" stroke-width="2"/>`
  g += `<circle cx="${x(history.length - 1)}" cy="${y(last.pei)}" r="3.5" fill="#07111d"/>`
  g += `<text x="${x(history.length - 1) + 8}" y="${y(last.pei) + 4}" style="fill:#07111d">${last.pei.toFixed(1)}</text>`
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}</svg>`
  $("#pei-foot").textContent = `Base ${monthLabel(history[0].month)} = 100.` +
    (illustrative ? (answers?.spending ? " Built from your answers with illustrative inflation rates." : " Illustrative basket and inflation rates.")
                  : " Category prices from official statistics.")
}

function renderCategories(summary) {
  $("#avg-monthly").textContent = summary ? money(summary.average_monthly_expenses) : "—"
  const rows = (summary?.by_category || []).filter(c => c.monthly_average > 0).slice(0, 8)
  const max = Math.max(...rows.map(r => r.share), 0.0001)
  $("#category-bars").innerHTML = rows.map(r => `
    <li><span>${esc(LABELS[r.category] || r.category)}</span>
        <span class="bar"><i style="width:${(r.share / max) * 100}%"></i></span>
        <span class="amt">${money(r.monthly_average)}</span>
        <span class="share">${Math.round(r.share * 100)}%</span></li>`).join("")
}

function renderScenarios(scenarios) {
  $("#scenarios").innerHTML = (scenarios || []).map(s => `
    <div class="scn">
      <div><div class="name">${esc(SCENARIO_LABELS[s.scenario] || s.scenario)}</div>
           <div class="assume">${s.inflation_shift_pp ? `Inflation ${pp(s.inflation_shift_pp)} vs. trend` : "Current category trends"}</div></div>
      <div><div class="total">${money(s.expected_total)}</div><div class="per">${money(s.expected_monthly_average)} / month</div></div>
    </div>`).join("")
}

function renderCoverage(cov) {
  if (!cov) { $("#coverage-out").innerHTML = ""; return }
  const rows = [["Flat prices", cov.nominal.months, true], ...cov.projected.map(p => [SCENARIO_LABELS[p.scenario] || p.scenario, p.months, false])]
  const max = Math.max(...rows.map(r => r[1] || 0), 0.0001)
  $("#coverage-out").innerHTML = rows.map(([name, m, nominal]) => `
    <div class="cov-row${nominal ? " nominal" : ""}">
      <span class="name">${esc(name)}</span>
      <span class="months">${m == null ? "50+ yrs" : `${m.toFixed(1)} mo`}</span>
      <span class="track"><span class="fill" style="display:block;width:${((m || max) / max) * 100}%"></span></span>
    </div>`).join("")
}

function addMessage(role, text, sources) {
  const div = document.createElement("div")
  div.className = `msg ${role}`
  div.textContent = text
  if (sources?.length) {
    const s = document.createElement("div")
    s.className = "src"
    s.textContent = "Sources: " + sources.map(x => (x.type === "economic_series" ? `${x.source} ${x.series_id}` : x.tool)).join(" · ")
    div.append(s)
  }
  $("#chat").append(div)
  $("#chat").scrollTop = $("#chat").scrollHeight
}

// ------------------------------------------------------------------ modes

function setPreviewControls(reason) {
  $("#mode-chip").hidden = false
  $("#mode-chip").textContent = "Illustrative data"
  $("#drop").classList.add("disabled")
  $("#chat-input").disabled = true
  $("#chat-input").placeholder = reason
  document.querySelectorAll("#suggestions .pill, #chat-form .pill").forEach(b => (b.disabled = true))
}

function renderPreview(reason) {
  applyAnswers()
  const d = demoData()
  currency = answers?.currency || "USD"
  $("#currency").textContent = currency
  renderPei(d.pei)
  renderChart(d.history, true)
  renderCategories(d.summary)
  renderScenarios(d.scenarios)
  renderCoverage(demoCoverage(Number($("#reserves").value) || 20000))
  setPreviewControls(reason)
}

// A new account starts at zero: nothing is estimated until real transactions are imported.
function renderEmpty() {
  renderPei({ value: 0, year_over_year: 0, headline_year_over_year: 0, gap_vs_headline_yoy_pp: 0 })
  renderChart([], false)
  $("#pei-foot").textContent = "Your index appears after your first import."
  renderCategories({ average_monthly_expenses: 0, by_category: [] })
  renderScenarios(["baseline", "lower_inflation", "higher_inflation"].map((scenario, i) =>
    ({ scenario, inflation_shift_pp: [0, -1.5, 3][i], expected_total: 0, expected_monthly_average: 0 })))
  renderCoverage(null)
}

/** The "import a statement" message, written from the questionnaire answers. */
function welcomeBanner() {
  const a = answers || {}
  const parts = []
  let place = ""
  try { if (a.country && a.country !== "XX") place = new Intl.DisplayNames(["en"], { type: "region" }).of(a.country) } catch {}
  parts.push(place ? `Your account is set up for ${place}, in ${currency}.` : `Your account is set up in ${currency}.`)
  const spend = Object.entries(a.spending || {}).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1])
  const total = spend.reduce((t, [, v]) => t + v, 0)
  if (total > 0) {
    const top = spend.filter(([c]) => c !== "other").slice(0, 2).map(([c]) => (LABELS[c] || c).toLowerCase()).join(" and ")
    parts.push(`You estimated about ${money(total)} a month` + (top ? `, mostly ${top}.` : "."))
  }
  const worries = (a.concerns || []).map(c => (LABELS[c] || c).toLowerCase())
  parts.push(`Import a bank statement (CSV) to compute your Personal Expense Index and projections from your real spending` +
    (worries.length ? `, including how ${worries.slice(0, 2).join(" and ")} prices affect you.` : "."))
  return parts.join(" ")
}

async function loadLive() {
  if (answers?.completed && !answers.synced) {
    const body = { base_currency: answers.currency }
    if (answers.country && answers.country !== "XX") body.country = answers.country
    await api("/me", { method: "PATCH", body: JSON.stringify(body) }).catch(() => null)
    answers.synced = true
    saveAnswers(answers)
  }
  const me = await api("/me")
  currency = me.base_currency
  $("#currency").textContent = currency
  $("#mode-chip").textContent = me.email || userEmail || "Signed in"
  $("#drop").classList.remove("disabled")
  $("#chat-input").disabled = false
  $("#chat-input").placeholder = "Ask a question"
  document.querySelectorAll("#suggestions .pill, #chat-form .pill").forEach(b => (b.disabled = false))
  banner(welcomeBanner())
  let hasData = false
  const tasks = [
    api("/expenses/summary").then(s => { if (s.has_data) { hasData = true; renderCategories(s); banner("") } }),
    Promise.all([api("/pei"), api("/pei/history")]).then(([p, h]) => { renderPei(p); renderChart(h.items, false) }),
    api("/forecasts", { method: "POST", body: JSON.stringify({ horizon_months: 12 }) })
      .then(f => renderScenarios(f.scenarios.map(s => ({ ...s, inflation_shift_pp: s.assumptions.inflation_shift_pp })))),
    calculateCoverage(),
  ]
  const results = await Promise.allSettled(tasks)
  const err = results.find(r => r.status === "rejected")?.reason
  if (!err || err.code === "insufficient_data") return
  if (err.code === "unsupported_geography") banner(err.message)
  else if (hasData) banner(`Some figures could not be loaded: ${err.message}`)
}

async function calculateCoverage() {
  const reserves = Number($("#reserves").value)
  if (!(reserves > 0)) return
  if (!live) { renderCoverage(demoCoverage(reserves)); return }
  renderCoverage(await api("/coverage/calculate", { method: "POST", body: JSON.stringify({ reserves, currency }) }))
}

// ------------------------------------------------------------------ events

$("#coverage-form").addEventListener("submit", e => {
  e.preventDefault()
  calculateCoverage().catch(err => banner(err.message))
})

// ------------------------------------------------------------------ accounts (Privy, see auth.js)

async function ensurePrivy() {
  privy = await getPrivy(CFG.privyAppId)
  return privy
}

$("#auth-button").addEventListener("click", async () => {
  await signOut(CFG.privyAppId)
  location.reload() // back to the sign-in gate
})

async function setSignedIn(email) {
  userEmail = email
  $("#auth-button").textContent = "Sign out"
  $("#mode-chip").textContent = email || "Signed in"
  if (API) {
    await ensurePrivy()
    live = true
    loadLive().catch(err => banner(err.message)) // in the background: the tour must not wait for the API
  } else {
    banner("Your account is ready. Until bank imports open, this view is built from your answers with illustrative inflation rates.")
    setPreviewControls("Available when bank imports open")
    $("#mode-chip").textContent = email || "Signed in"
  }
}

const drop = $("#drop")
const upload = async file => {
  if (!live || !file) return
  const form = new FormData()
  form.append("file", file)
  $("#import-status").textContent = "Importing…"
  try {
    const r = await api("/transactions/import", { method: "POST", body: form })
    $("#import-status").textContent = `${r.imported} transactions imported, ${r.duplicates} duplicates skipped, ${r.rejected} rows rejected.` +
      (r.warnings.length ? ` ${r.warnings[0]}` : "")
    await loadLive()
  } catch (err) {
    $("#import-status").textContent = err.message
  }
}
$("#file").addEventListener("change", e => upload(e.target.files[0]))
drop.addEventListener("dragover", e => { e.preventDefault(); if (live) drop.classList.add("over") })
drop.addEventListener("dragleave", () => drop.classList.remove("over"))
drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); upload(e.dataTransfer.files[0]) })
drop.addEventListener("click", e => { if (!live) e.preventDefault() })

let conversationId = null
async function ask(text) {
  if (!live || !text) return
  addMessage("user", text)
  $("#chat-input").value = ""
  try {
    const r = await api("/agent/chat", { method: "POST", body: JSON.stringify({ message: text, conversation_id: conversationId }) })
    conversationId = r.conversation_id
    addMessage("assistant", r.answer, r.sources)
  } catch (err) {
    addMessage("assistant", err.message)
  }
}
$("#chat-form").addEventListener("submit", e => { e.preventDefault(); ask($("#chat-input").value.trim()) })
document.querySelectorAll("#suggestions .pill").forEach(b => b.addEventListener("click", () => ask(b.textContent)))

// Redraw the chart whenever its box changes size (grid stretch, viewport resize).
let lastChartSize = ""
new ResizeObserver(entries => {
  const { width, height } = entries[0].contentRect
  const key = `${Math.round(width)}x${Math.round(height)}`
  const l = $("#pei-chart")._last
  if (l && key !== lastChartSize) { lastChartSize = key; renderChart(...l) }
}).observe($("#pei-chart"))

// ------------------------------------------------------------------ boot

const TOUR = [
  { target: "#overview", title: "Your Personal Expense Index",
    body: "It starts at 100 and shows how the cost of your own spending basket has moved at official category prices. The three figures compare it with headline inflation." },
  { target: "#history", title: "Your basket vs. the average",
    body: "When your line sits above the grey one, the things you buy are getting more expensive faster than the national average." },
  { target: "#coverage", title: "How long your reserves last",
    body: "Reserves are drawn down against projected costs month by month, including inflation. Change the amount to see how it moves." },
  { target: "#spending", title: "Where your money goes",
    body: "Your categories and their weight in the index. The biggest categories drive most of your exposure to rising prices." },
  { target: "#projections", title: "The next 12 months",
    body: "Projected living costs under three inflation scenarios. They are conditional estimates, not predictions." },
  { target: "#import", title: "Switch to real numbers",
    body: "Your figures start at zero. Import a bank statement and everything on this page is computed from your actual spending, categorised automatically." },
  { target: "#assistant", title: "Ask in plain language",
    body: "The assistant answers with figures computed from your data, and shows where each number comes from." },
]

async function startPage() {
  if (AUTH && API) {
    currency = answers?.currency || "USD"
    $("#currency").textContent = currency
    if (answers?.reserves > 0) $("#reserves").value = Math.round(answers.reserves)
    renderEmpty()
    await setSignedIn(userEmail)
    return
  }
  renderPreview("Available when bank imports open")
  if (!AUTH) {
    banner("Preview with an illustrative household basket. Accounts open soon.")
    return
  }
  await setSignedIn(userEmail)
}

$("#redo-setup").addEventListener("click", () => { resetOnboarding(); location.reload() })

async function boot() {
  // 1. Account first: sign in or create an account (Privy email code or MetaMask).
  if (AUTH) {
    const account = (await currentUser(CFG.privyAppId)) || (await runAuthGate(CFG.privyAppId))
    userEmail = account.label
    // Questionnaire and tour are tracked per account, so every new account gets both.
    scopeOnboarding(account.id)
    scopeTour(account.id)
    answers = loadAnswers()
    if (account.isNew) resetOnboarding()
    if (account.isNew) answers = null
  }
  // 2. Questionnaire on the first visit.
  if (!answers?.completed) {
    answers = await runOnboarding()
    saveAnswers(answers)
  }
  // 3. Dashboard, then the guided tour once.
  await startPage()
  if (!tourDone()) {
    window.scrollTo(0, 0)
    await new Promise(r => setTimeout(r, 450))
    await runTour(TOUR)
  }
}

boot()
