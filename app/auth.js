// Sign-in gate (Privy email code, or a MetaMask signature: Sign-In With Ethereum). Shown before the questionnaire to anyone without a session.
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
const walletOf = u => (u?.linked_accounts || []).find(a => a.type === "wallet" && a.wallet_client_type !== "privy")?.address || null
const short = a => `${a.slice(0, 6)}…${a.slice(-4)}`
/** What to show for an account: its email, else its wallet address. */
const describe = u => ({ id: u?.id || null, label: emailOf(u) || (walletOf(u) ? short(walletOf(u)) : "Signed in") })
const hasStoredSession = () => Object.keys(localStorage).some(k => k.startsWith("privy:"))

/** The signed-in account ({ id, label }), or null. Avoids loading the SDK for first-time visitors. */
export async function currentUser(appId) {
  if (!hasStoredSession()) return null
  try {
    const p = await getPrivy(appId)
    if (!(await p.getAccessToken())) return null
    const { user } = await p.user.get()
    return describe(user)
  } catch {
    return null
  }
}

/** MetaMask (or the injected provider when MetaMask is the only one). */
function metamask() {
  const eth = window.ethereum
  if (!eth) return null
  const list = Array.isArray(eth.providers) && eth.providers.length ? eth.providers : [eth]
  return list.find(x => x.isMetaMask) || null
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
          <div class="auth-divider"><span>or</span></div>
          <button class="auth-wallet" type="button" data-wallet>
            <svg viewBox="0 0 35 33" aria-hidden="true"><path fill="#E2761B" d="M32.96 1 19.47 10.97 21.97 5.1z"/><path fill="#E4761B" d="m2.03 1 13.37 10.07-2.37-5.98zM28.1 23.53l-3.59 5.5 7.68 2.11 2.2-7.49zM.65 23.65l2.19 7.49 7.67-2.11-3.58-5.5z"/><path fill="#E4761B" d="m10.08 14.26-2.14 3.23 7.62.34-.26-8.2zm14.84 0-5.3-4.72-.18 8.29 7.62-.34zM10.51 29.03l4.59-2.24-3.96-3.09zm9.38-2.24 4.6 2.24-.64-5.33z"/><path fill="#D7C1B3" d="m24.49 29.03-4.6-2.24.37 3-.04 1.27zm-13.98 0 4.27 2.03-.03-1.27.34-3z"/><path fill="#233447" d="m14.85 21.7-3.82-1.12 2.7-1.24zm5.3 0 1.12-2.36 2.71 1.24z"/><path fill="#CD6116" d="m10.51 29.03.66-5.5-4.24.12zm13.33-5.5.65 5.5 3.6-5.38zm3.22-6.04-7.62.34.71 3.87 1.12-2.36 2.71 1.24zm-16.03 3.09 2.71-1.24 1.11 2.36.72-3.87-7.62-.34z"/><path fill="#E4751F" d="m7.94 17.49 3.2 6.24-.11-3.1zm16.05 3.14-.13 3.1 3.2-6.24zm-8.43-2.8-.72 3.87.9 4.62.2-6.08zm4.06 0-.37 2.4.17 6.09.9-4.62z"/><path fill="#F6851B" d="m20.33 21.7-.9 4.62.64.45 3.96-3.09.13-3.1zm-9.3-1.12.11 3.1 3.96 3.09.65-.45-.9-4.62z"/><path fill="#C0AD9E" d="m20.37 31.06.04-1.27-.34-.3h-5.14l-.32.3.03 1.27-4.27-2.03 1.5 1.22 3.03 2.1h5.2l3.04-2.1 1.48-1.22z"/><path fill="#161616" d="m19.89 26.79-.65-.45h-3.78l-.65.45-.34 3 .32-.3h5.14l.34.3z"/><path fill="#763D16" d="m33.53 11.68 1.15-5.52L32.96 1l-13.07 9.7 5.03 4.26 7.1 2.08 1.58-1.84-.68-.5 1.09-1-.84-.64 1.09-.83zM.32 6.16l1.15 5.52-.73.54 1.1.83-.83.64 1.09 1-.69.5 1.57 1.84 7.1-2.08 5.03-4.26L2.03 1z"/><path fill="#F6851B" d="m32.02 17.04-7.1-2.08 2.14 3.23-3.2 6.24 4.24-.06h6.27zM10.08 14.96l-7.1 2.08-2.36 7.33h6.26l4.23.06-3.2-6.24zm9.47 3.59.45-7.85 2.07-5.6h-9.2l2.04 5.6.47 7.85.17 2.47.01 6.07h3.78l.02-6.07z"/></svg>
            <span>Continue with MetaMask</span>
          </button>
          <div class="auth-divider"><span>Secured by Privy</span></div>
          <ul class="auth-notes">
            <li>No password. A one-time code is sent to your inbox.</li>
            <li>Signing with a wallet proves you own it. It sends no transaction and costs no fees.</li>
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

    function finish(res, fallbackLabel) {
      setStatus("")
      root.classList.add("out")
      document.body.classList.remove("auth-open")
      const user = res?.user || res
      const out = { ...describe(user), isNew: Boolean(res?.is_new_user) }
      if (out.label === "Signed in" && fallbackLabel) out.label = fallbackLabel
      setTimeout(() => { root.remove(); resolve(out) }, reduced ? 0 : 650)
    }

    async function walletLogin() {
      const eth = metamask()
      if (!eth) {
        setStatus("MetaMask was not found in this browser. Install it from metamask.io, then reload this page.", true)
        return
      }
      const btn = $("[data-wallet]")
      btn.disabled = true
      setStatus("Confirm the connection in MetaMask…")
      try {
        const [address] = await eth.request({ method: "eth_requestAccounts" })
        const chainId = parseInt(await eth.request({ method: "eth_chainId" }), 16)
        const wallet = { address, chainId: `eip155:${chainId}`, walletClientType: "metamask", connectorType: "injected" }
        const p = await getPrivy(appId)
        const { message } = await p.auth.siwe.init(wallet, location.host, location.origin)
        setStatus("Sign the message in MetaMask. It costs nothing.")
        const signature = await eth.request({ method: "personal_sign", params: [message, address] })
        setStatus("Verifying…")
        const res = await p.auth.siwe.loginWithSiwe(signature, wallet, message, mode === "signin" ? "no-signup" : "login-or-sign-up")
        finish(res, short(address))
      } catch (err) {
        const msg = String(err?.message || "")
        if (err?.code === 4001 || /reject|denied/i.test(msg)) setStatus("The request was cancelled in MetaMask.", true)
        else if (mode === "signin" && /not (found|exist)|no.*account|sign ?up/i.test(msg))
          setStatus("No account is linked to this wallet yet. Switch to “Create account” to make one.", true)
        else setStatus(msg || "Wallet sign-in failed. Please try again.", true)
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
        finish(res, email)
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
    $("[data-wallet]").addEventListener("click", walletLogin)

    setMode(mode)
    pane("email")
  })
}
