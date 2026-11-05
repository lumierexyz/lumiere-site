// First-visit questionnaire. One question per screen; answers stay in this browser (localStorage)
// and, once accounts exist, are sent to the profile endpoint.

const STORE = "lumiere.onboarding.v1"

const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "BE", name: "Belgium", currency: "EUR" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "XX", name: "Somewhere else", currency: "USD" },
]

const DEFAULTS = { USD: [1800, 450, 250, 150, 600, 20000], EUR: [1100, 400, 200, 140, 500, 15000],
                   GBP: [1300, 350, 200, 160, 500, 12000], CHF: [2000, 600, 250, 120, 700, 25000] }

export function loadAnswers() {
  try { return JSON.parse(localStorage.getItem(STORE) || "null") } catch { return null }
}
export function saveAnswers(a) { localStorage.setItem(STORE, JSON.stringify(a)) }
export function resetOnboarding() { localStorage.removeItem(STORE); localStorage.removeItem("lumiere.tour.v1") }

const STEPS = [
  { id: "welcome", kind: "intro" },
  { id: "country", kind: "choice", title: "Where do you live?",
    help: "We use official price statistics for your country.",
    options: COUNTRIES.map(c => ({ value: c.code, label: c.name })) },
  { id: "currency", kind: "choice", title: "Which currency do you spend in?",
    help: "Amounts are never converted without an official exchange rate.",
    options: ["USD", "EUR", "GBP", "CHF"].map(c => ({ value: c, label: c })) },
  { id: "home", kind: "choice", title: "How do you pay for your home?",
    help: "Housing is usually the largest part of a budget, and it moves differently from other prices.",
    options: [{ value: "rent", label: "I rent" }, { value: "mortgage", label: "Mortgage" },
              { value: "own", label: "Owned outright" }, { value: "family", label: "Living with family" }] },
  { id: "spending", kind: "amounts", title: "Roughly, what do you spend each month?",
    help: "Estimates are fine. Importing a bank statement later replaces them with real figures.",
    fields: [["housing", "Housing"], ["groceries", "Groceries"], ["transportation", "Transport"],
             ["energy", "Energy & utilities"], ["other", "Everything else"]] },
  { id: "reserves", kind: "amount", title: "How much could you draw on if you needed to?",
    help: "Savings you could use for living costs. This stays an estimate; we never connect to your accounts." },
  { id: "concerns", kind: "multi", title: "Which rising costs worry you most?",
    help: "Choose any. We will point you to these first.",
    options: [{ value: "housing", label: "Rent and housing" }, { value: "energy", label: "Energy bills" },
              { value: "groceries", label: "Food prices" }, { value: "healthcare", label: "Healthcare" },
              { value: "transportation", label: "Getting around" }] },
  { id: "done", kind: "outro" },
]

const sym = c => ({ USD: "$", EUR: "€", GBP: "£", CHF: "CHF" })[c] || c
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches

export function runOnboarding() {
  return new Promise(resolve => {
    const answers = { country: "US", currency: "USD", home: "rent", spending: {}, reserves: null, concerns: [] }
    let index = 0
    const root = document.createElement("div")
    root.className = "ob"
    root.innerHTML = `
      <video class="ob-bg" src="/assets/media/lumiere-hero.mp4" poster="/assets/media/lumiere-hero-poster.jpg" autoplay muted loop playsinline aria-hidden="true"></video>
      <div class="ob-top">
        <span class="ob-brand"><svg viewBox="0 0 308 308" aria-hidden="true"><path d="M2 2L95 2L213 183L2 125Z"/><path d="M217 2L307 2L307 125L217 180Z"/><path d="M2 185L205 185L52 292L2 245Z"/><path d="M95 305L210 192L183 305Z"/><path d="M217 187L307 187L307 245L247 307L217 307Z"/></svg>Lumiere</span>
        <div class="ob-progress" aria-hidden="true"><i></i></div>
        <span class="ob-count"></span>
      </div>
      <div class="ob-stage" role="dialog" aria-modal="true" aria-live="polite"></div>`
    document.body.append(root)
    document.body.classList.add("ob-open")
    requestAnimationFrame(() => root.classList.add("in"))
    const stage = root.querySelector(".ob-stage")

    const questions = STEPS.filter(s => s.kind !== "intro" && s.kind !== "outro").length

    function defaults() {
      const d = DEFAULTS[answers.currency] || DEFAULTS.USD
      const keys = ["housing", "groceries", "transportation", "energy", "other"]
      keys.forEach((k, i) => { if (answers.spending[k] == null) answers.spending[k] = answers.home === "own" && k === "housing" ? Math.round(d[0] * 0.25) : d[i] })
      if (answers.reserves == null) answers.reserves = d[5]
    }

    function screen(step) {
      const qn = STEPS.slice(0, STEPS.indexOf(step)).filter(s => s.kind !== "intro").length + 1
      root.classList.toggle("dark", step.kind === "intro" || step.kind === "outro")
      root.querySelector(".ob-count").textContent = step.kind === "intro" || step.kind === "outro" ? "" : `${qn} / ${questions}`
      root.querySelector(".ob-progress i").style.width = `${(Math.min(qn - 1, questions) / questions) * 100}%`

      if (step.kind === "intro") return `
        <div class="ob-card center">
          <p class="ob-eyebrow">Personal Expense Index</p>
          <h1 class="ob-title xl">Let's measure stability<br>against your own costs.</h1>
          <p class="ob-help">Six quick questions. About a minute.</p>
          <div class="ob-actions center"><button class="ob-btn light" data-next>Get started</button></div>
        </div>`
      if (step.kind === "outro") return `
        <div class="ob-card center">
          <svg class="ob-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
          <h1 class="ob-title xl">Your index is ready.</h1>
          <p class="ob-help">We built a first view from your answers. Create a free account with your email to keep it.</p>
          <div class="ob-actions center stack">
            <button class="ob-btn light" data-account>Create my account</button>
            <button class="ob-btn ghost-light" data-next>Continue without an account</button>
          </div>
        </div>`

      let body = ""
      if (step.kind === "choice" || step.kind === "multi") {
        const sel = step.kind === "multi" ? answers[step.id] : [answers[step.id]]
        body = `<div class="ob-options ${step.options.length > 6 ? "grid" : ""}">` + step.options.map((o, i) => `
          <button type="button" class="ob-option${sel.includes(o.value) ? " on" : ""}" data-value="${o.value}" style="--i:${i}">
            <span>${o.label}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7"/></svg>
          </button>`).join("") + `</div>`
      } else if (step.kind === "amounts") {
        defaults()
        body = `<div class="ob-fields">` + step.fields.map(([k, label], i) => `
          <label class="ob-field" style="--i:${i}"><span>${label}</span>
            <span class="ob-input"><em>${sym(answers.currency)}</em><input type="number" min="0" step="10" inputmode="decimal" data-key="${k}" value="${answers.spending[k]}"></span>
          </label>`).join("") + `<p class="ob-total">Total <strong data-total></strong> per month</p></div>`
      } else if (step.kind === "amount") {
        defaults()
        body = `<label class="ob-big" style="--i:0"><em>${sym(answers.currency)}</em>
          <input type="number" min="0" step="500" inputmode="decimal" data-key="reserves" value="${answers.reserves}"></label>`
      }
      return `
        <div class="ob-card">
          <h1 class="ob-title">${step.title}</h1>
          <p class="ob-help">${step.help}</p>
          ${body}
          <div class="ob-actions">
            <button class="ob-btn ghost" data-back>Back</button>
            <button class="ob-btn" data-next>${step.kind === "multi" && !answers.concerns.length ? "Skip" : "Continue"}</button>
          </div>
        </div>`
    }

    function bind(step, scope) {
      scope.querySelectorAll(".ob-option").forEach(b => b.addEventListener("click", () => {
        const v = b.dataset.value
        if (step.kind === "multi") {
          const set = new Set(answers[step.id])
          set.has(v) ? set.delete(v) : set.add(v)
          answers[step.id] = [...set]
          b.classList.toggle("on")
          scope.querySelector("[data-next]").textContent = answers[step.id].length ? "Continue" : "Skip"
          return
        }
        if (answers[step.id] !== v && ["country", "currency", "home"].includes(step.id)) {
          answers.spending = {} // re-derive suggested amounts for the new currency / housing situation
          answers.reserves = null
        }
        answers[step.id] = v
        if (step.id === "country") answers.currency = COUNTRIES.find(c => c.code === v).currency
        scope.querySelectorAll(".ob-option").forEach(o => o.classList.toggle("on", o === b))
        setTimeout(() => go(1), reduced ? 0 : 260)
      }))
      const total = scope.querySelector("[data-total]")
      const update = () => {
        scope.querySelectorAll("input[data-key]").forEach(inp => {
          const n = Math.max(0, Number(inp.value) || 0)
          if (inp.dataset.key === "reserves") answers.reserves = n
          else answers.spending[inp.dataset.key] = n
        })
        if (total) total.textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: answers.currency, maximumFractionDigits: 0 })
          .format(Object.values(answers.spending).reduce((a, b) => a + b, 0))
      }
      scope.querySelectorAll("input[data-key]").forEach(i => i.addEventListener("input", update))
      update()
      scope.querySelector("[data-next]")?.addEventListener("click", () => go(1))
      scope.querySelector("[data-account]")?.addEventListener("click", () => { answers.wantsAccount = true; go(1) })
      scope.querySelector("[data-back]")?.addEventListener("click", () => go(-1))
      const first = scope.querySelector("input, .ob-option.on, .ob-option, [data-account], [data-next]")
      setTimeout(() => first?.focus({ preventScroll: true }), reduced ? 0 : 450)
    }

    function render(direction) {
      const step = STEPS[index]
      const next = document.createElement("div")
      next.className = `ob-screen enter ${direction < 0 ? "from-top" : ""}`
      next.innerHTML = screen(step)
      const old = stage.querySelector(".ob-screen:not(.leave)")
      if (old) {
        old.classList.add("leave", direction < 0 ? "to-bottom" : "to-top")
        setTimeout(() => old.remove(), reduced ? 0 : 420)
      }
      stage.append(next)
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("enter")))
      bind(step, next)
    }

    let busy = false
    function go(delta) {
      if (busy) return
      if (index + delta < 0) return
      if (index + delta >= STEPS.length) return finish()
      busy = true
      index += delta
      render(delta)
      setTimeout(() => { busy = false }, reduced ? 0 : 380)
    }

    function finish() {
      document.removeEventListener("keydown", onKey)
      answers.completed = true
      answers.completedAt = new Date().toISOString()
      root.classList.add("out")
      document.body.classList.remove("ob-open")
      setTimeout(() => { root.remove(); resolve(answers) }, reduced ? 0 : 700)
    }

    function onKey(e) {
      if (e.key === "Enter" && !e.target.matches("button")) { e.preventDefault(); go(1) }
    }
    document.addEventListener("keydown", onKey)
    render(1)
  })
}
