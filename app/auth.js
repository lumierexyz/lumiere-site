// Sign-in gate (Privy email code). Shown before the questionnaire to anyone without a session.
// Layout follows a simple auth page: logo, heading, email field, primary action, divider, notes.

const PRIVY_BUNDLE = "/app/sdk/privy-core-0.79.3.js"
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
let privy = null

export async function getPrivy(appId) {
  if (privy) return privy
  const { Privy, LocalStorage } = await import(PRIVY_BUNDLE)
  privy = new Privy({ appId, storage: new LocalStorage() })
  await privy.initialize()
  return privy
}

export const emailOf = u => (u?.linked_accounts || []).find(a => a.type === "email")?.address || null
const hasStoredSession = () => Object.keys(localStorage).some(k => k.startsWith("privy:"))

/** Email of the signed-in user, or null. Avoids loading the SDK for first-time visitors. */
export async function currentEmail(appId) {
  if (!hasStoredSession()) return null
  try {
    const p = await getPrivy(appId)
    if (!(await p.getAccessToken())) return null
    const { user } = await p.user.get()
    return emailOf(user) || "Signed in"
  } catch {
    return null
  }
}

export async function signOut(appId) {
  const p = await getPrivy(appId)
  await p.auth.logout().catch(() => null)
}

const LOGO = `<svg viewBox="0 0 308 308" aria-hidden="true"><path d="M2 2L95 2L213 183L2 125Z"/><path d="M217 2L307 2L307 125L217 180Z"/><path d="M2 185L205 185L52 292L2 245Z"/><path d="M95 305L210 192L183 305Z"/><path d="M217 187L307 187L307 245L247 307L217 307Z"/></svg>`

const COPY = {
  signin: { title: "Welcome back", sub: "Sign in to your Lumiere account with your email." },
  signup: { title: "Create your account", sub: "Start measuring stability against your own costs." },
}

export function runAuthGate(appId, { initialMode = "signup" } = {}) {
  return new Promise(resolve => {
    let mode = initialMode
    let email = ""
    const root = document.createElement("div")
    root.className = "auth"
    root.innerHTML = `
      <section class="auth-col">
        <a class="auth-logo" href="/" aria-label="Lumiere home">${LOGO}<span>Lumiere</span></a>
        <div class="auth-main">
          <div class="auth-switch" role="tablist" aria-label="Account">
            <button type="button" role="tab" data-mode="signin">Sign in</button>
            <button type="button" role="tab" data-mode="signup">Create account</button>
            <i class="auth-switch-ind" aria-hidden="true"></i>
          </div>
          <div class="auth-head"><h1></h1><p></p></div>
          <form class="auth-form" novalidate>
            <div class="auth-pane" data-pane="email">
              <label class="auth-input">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
                <input type="email" name="email" placeholder="your.email@example.com" autocomplete="email" inputmode="email" required>
              </label>
              <button class="auth-btn" type="submit" data-send>Continue with email</button>
            </div>
            <div class="auth-pane" data-pane="code" hidden>
              <p class="auth-sent">Enter the 6-digit code sent to <strong data-email></strong></p>
              <input class="auth-code" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
              <button class="auth-btn" type="submit" data-verify>Verify and continue</button>
              <div class="auth-links"><button type="button" data-back>Use another email</button><button type="button" data-resend>Resend code</button></div>
            </div>
            <p class="auth-status" role="status"></p>
          </form>
          <div class="auth-divider"><span>Secured by Privy</span></div>
          <ul class="auth-notes">
            <li>No password. A one-time code is sent to your inbox.</li>
            <li>Creating an account does not connect any bank or wallet.</li>
          </ul>
        </div>
      </section>
      <aside class="auth-visual" aria-hidden="true">
        <video src="/assets/media/lumiere-hero.mp4" poster="/assets/media/lumiere-hero-poster.jpg" autoplay muted loop playsinline></video>
        <blockquote>Stability should be personal.<span>Measure your purchasing power against the costs you actually face.</span></blockquote>
      </aside>`
    document.body.append(root)
    document.body.classList.add("auth-open")
    requestAnimationFrame(() => root.classList.add("in"))
    getPrivy(appId).catch(() => setStatus("Sign-in is temporarily unavailable. Please refresh the page.", true))

    const $ = s => root.querySelector(s)
    const form = $(".auth-form")
    const emailInput = $('input[name="email"]')
    const codeInput = $('input[name="code"]')

    function setStatus(text, error = false) {
      const el = $(".auth-status")
      el.textContent = text || ""
      el.classList.toggle("error", error)
    }

    function setMode(m) {
      mode = m
      root.querySelectorAll(".auth-switch button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)))
      root.querySelector(".auth-switch").dataset.active = m
      const head = $(".auth-head")
      head.classList.remove("swap")
      void head.offsetWidth
      head.classList.add("swap")
      head.querySelector("h1").textContent = COPY[m].title
      head.querySelector("p").textContent = COPY[m].sub
      setStatus("")
    }

    function pane(name) {
      root.querySelectorAll(".auth-pane").forEach(p => (p.hidden = p.dataset.pane !== name))
      setTimeout(() => (name === "email" ? emailInput : codeInput).focus(), reduced ? 0 : 60)
    }

    async function sendCode() {
      email = emailInput.value.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus("Enter a valid email address.", true)
      const btn = $("[data-send]")
      btn.disabled = true
      setStatus("Sending your code…")
      try {
        await (await getPrivy(appId)).auth.email.sendCode(email)
        $("[data-email]").textContent = email
        codeInput.value = ""
        setStatus("")
        pane("code")
      } catch (err) {
        setStatus(err?.message || "Could not send the code. Please try again.", true)
      } finally {
        btn.disabled = false
      }
    }

    async function verify() {
      const code = codeInput.value.replace(/\D/g, "")
      if (code.length !== 6) return setStatus("Enter the 6-digit code.", true)
      const btn = $("[data-verify]")
      btn.disabled = true
      setStatus("Verifying…")
      try {
        const p = await getPrivy(appId)
        const res = await p.auth.email.loginWithCode(email, code, mode === "signin" ? "no-signup" : "login-or-sign-up")
        setStatus("")
        root.classList.add("out")
        document.body.classList.remove("auth-open")
        setTimeout(() => { root.remove(); resolve(emailOf(res?.user || res) || email) }, reduced ? 0 : 650)
      } catch (err) {
        const msg = String(err?.message || "")
        if (mode === "signin" && /not (found|exist)|no.*account|sign ?up/i.test(msg)) {
          setStatus("No account exists for this email yet. Switch to “Create account” to make one.", true)
        } else {
          setStatus(msg || "That code did not work. Please try again.", true)
        }
      } finally {
        btn.disabled = false
      }
    }

    root.querySelectorAll(".auth-switch button").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)))
    form.addEventListener("submit", e => {
      e.preventDefault()
      $('[data-pane="code"]').hidden ? sendCode() : verify()
    })
    codeInput.addEventListener("input", () => {
      codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6)
      if (codeInput.value.length === 6) verify()
    })
    $("[data-back]").addEventListener("click", () => { setStatus(""); pane("email") })
    $("[data-resend]").addEventListener("click", sendCode)

    setMode(mode)
    pane("email")
  })
}
