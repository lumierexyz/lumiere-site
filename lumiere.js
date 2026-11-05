// Lumiere — ajustements après hydratation : ancres de navigation, piliers, bandeau des catégories,
// second bouton du héro et en-tête de la section About. Tout est ré-appliqué si React re-rend un nœud.
(() => {
  const SECTIONS = {
    hero: () => document.getElementById("hero"),
    technology: () => document.querySelector('[data-framer-name="Builder codes"]'),
    vision: () => document.getElementById("principles"),
    research: () => document.getElementById("security"),
    about: () => document.querySelector('[data-framer-name="FAQ section"]'),
  }

  const LINKS = new Map([
    ["Technology", "#technology"],
    ["Vision", "#vision"],
    ["Research", "#research"],
    ["About", "#about"],
    ["Explore", "/app/"],
    ["Explore Lumiere", "/app/"],
    ["Our Vision", "#vision"],
    ["Our Research", "#research"],
  ])

  const PILLARS = [
    ["Personalized Intelligence", "Financial insights built around individual spending patterns."],
    ["Purchasing Power", "A framework focused on real-world affordability."],
    ["Forward-Looking", "Understanding how future expenses may evolve."],
    ["Adaptive Strategies", "Exploring personalized approaches to financial risk."],
  ]

  const ICON = {
    house: '<path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z"/>',
    basket: '<path d="M4 10h16l-1.6 9H5.6zM8 10l3-5M16 10l-3-5"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    car: '<path d="M5 16V12l2-5h10l2 5v4M5 16h14M5 16v2.5M19 16v2.5M7.5 13.2h.01M16.5 13.2h.01"/>',
    cross: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>',
    cart: '<path d="M3.5 5h2.2l2 10.5h10.6L20.5 8H7M9.5 19.5h.01M17 19.5h.01"/>',
  }
  const CATEGORIES = [
    ["Housing", "Rent, mortgage, upkeep", "house"],
    ["Food", "Groceries and dining", "basket"],
    ["Energy", "Electricity, heating, fuel", "bolt"],
    ["Transportation", "Transit, vehicles, travel", "car"],
    ["Healthcare", "Care, insurance, medicine", "cross"],
    ["Everyday Expenses", "Household and personal", "cart"],
  ]

  const ABOUT_TITLE = "Building Financial Intelligence for the Next Generation."
  const ABOUT_BODY =
    "Lumiere is an early-stage project exploring how artificial intelligence and financial infrastructure can redefine the way individuals understand and manage long-term purchasing power."

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value
  }

  function target(hash) {
    const key = hash.replace(/^#/, "")
    const el = SECTIONS[key]?.()
    return el || document.getElementById(key)
  }

  function assignIds() {
    for (const [key, find] of Object.entries(SECTIONS)) {
      const el = find()
      if (el && !el.id) el.id = key
    }
  }

  function linkTo(a, hash) {
    if (!(a instanceof HTMLAnchorElement)) return
    if (a.getAttribute("href") !== hash) a.setAttribute("href", hash)
    a.dataset.lumiereHref = hash
    a.removeAttribute("target")
    a.removeAttribute("rel")
  }

  function fixLinks() {
    document.querySelectorAll("a").forEach(a => {
      const label = a.textContent.trim()
      if (label === "Build") {
        ;(a.closest('[class*="-container"]') || a).classList.add("lumiere-hide")
        linkTo(a, "#research")
        return
      }
      const raw = a.getAttribute("href")
      if (raw && !raw.startsWith("#") && !LINKS.has(label)) linkTo(a, a.closest("#security, #principles") ? "#research" : "#hero")
      if (LINKS.has(label)) return linkTo(a, LINKS.get(label))
      if (a.matches(".framer-xiyZZ")) return linkTo(a, "#hero")
      if (a.matches(".framer-TK4jO")) linkTo(a, "#technology")
      if (a.matches(".framer-KuDsK")) linkTo(a, "#research")
      if (a.matches(".framer-KuDsK, .framer-TK4jO")) {
        a.classList.add("lumiere-static")
        a.setAttribute("tabindex", "-1")
      }
    })
  }

  function fixPillars() {
    const box = document.querySelector('[data-framer-name="Hero metrics"]')
    if (!box) return
    box.querySelectorAll('[data-framer-name="Number"] .framer-text').forEach((el, i) => setText(el, PILLARS[i % 4][0]))
    box.querySelectorAll('[data-framer-name="Label"] .framer-text').forEach((el, i) => setText(el, PILLARS[i % 4][1]))
  }

  function categoryCard(cat, duplicate) {
    const [name, sub, icon] = cat
    const card = document.createElement("div")
    card.className = "market-ticker-card lumiere-category"
    if (duplicate) card.setAttribute("aria-hidden", "true")
    card.innerHTML =
      `<span class="market-ticker-icon lumiere-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${ICON[icon]}</svg></span>` +
      `<span class="market-ticker-copy"><span class="market-ticker-name">${name}</span><span class="market-ticker-price">${sub}</span></span>`
    return card
  }

  function fixTicker() {
    document.querySelectorAll(".framer-108gnsz").forEach(strip => {
      let ticker = strip.querySelector(":scope > .market-ticker")
      if (ticker?.dataset.lumiere === "1") return
      if (!ticker) {
        ticker = document.createElement("div")
        ticker.className = "market-ticker"
        strip.append(ticker)
      }
      ticker.dataset.lumiere = "1"
      ticker.setAttribute("role", "region")
      ticker.setAttribute("aria-label", "Expense categories Lumiere models")
      const track = document.createElement("div")
      track.className = "market-ticker-track"
      for (const dup of [false, true]) {
        const group = document.createElement("div")
        group.className = "market-ticker-group"
        if (dup) group.setAttribute("aria-hidden", "true")
        // deux passages par groupe pour couvrir les écrans larges
        for (const c of [...CATEGORIES, ...CATEGORIES]) group.append(categoryCard(c, dup))
        track.append(group)
      }
      ticker.replaceChildren(track)
      strip.classList.add("dynamic-market-ticker-ready")
    })
  }

  function fixHeroSecondary() {
    const hero = document.getElementById("hero")
    if (!hero) return
    const primary = [...hero.querySelectorAll("a.framer-KH95w")].find(a => a.textContent.trim() === "Explore Lumiere")
    if (!primary) return
    const wrap = primary.closest('[class*="-container"]') || primary
    if (wrap.nextElementSibling?.classList.contains("lumiere-secondary")) return
    hero.querySelectorAll(".lumiere-secondary").forEach(n => n.remove())
    const clone = wrap.cloneNode(true)
    clone.classList.add("lumiere-secondary")
    clone.removeAttribute("data-framer-appear-id")
    clone.style.opacity = "1"
    clone.style.transform = "none"
    clone.style.willChange = "auto"
    const a = clone.matches("a") ? clone : clone.querySelector("a")
    setText(a.querySelector("h6"), "Our Vision")
    a.querySelector('[data-framer-name="Up right"]')?.remove()
    linkTo(a, "#vision")
    wrap.parentElement.classList.add("lumiere-cta-row")
    wrap.after(clone)
  }

  function fixAbout() {
    const list = document.querySelector('[data-framer-name="FAQ question list"]')
    if (!list) return
    if (list.previousElementSibling?.classList.contains("lumiere-about")) return
    document.querySelectorAll(".lumiere-about").forEach(n => n.remove())
    const block = document.createElement("div")
    block.className = "lumiere-about"
    block.innerHTML =
      `<h2 class="framer-text framer-styles-preset-1e20l34">${ABOUT_TITLE}</h2>` +
      `<p class="framer-text framer-styles-preset-1ibppjb">${ABOUT_BODY}</p>`
    list.before(block)
  }

  function fixFooter() {
    document.querySelectorAll("h6.framer-text").forEach(h => {
      if (h.textContent.trim() !== "Financial intelligence for a changing world.") return
      for (let e = h; e && e.tagName !== "FOOTER" && !e.matches(".framer-1evoswd"); e = e.parentElement) {
        e.classList.add("lumiere-wrap")
      }
    })
  }

  // Fond de l'aperçu d'app : même dégradé animé que sous le titre
  function fixPreviewBackground() {
    const wrap = document.querySelector('#lumiere-preview > [data-framer-background-image-wrapper]')
    if (!wrap || wrap.querySelector("video.lumiere-bg")) return
    const v = document.createElement("video")
    v.className = "lumiere-bg"
    v.src = "/assets/media/lumiere-hero.mp4"
    v.poster = "/assets/media/lumiere-hero-poster.jpg"
    v.muted = true
    v.loop = true
    v.autoplay = true
    v.playsInline = true
    v.setAttribute("aria-hidden", "true")
    wrap.append(v)
    v.play().catch(() => {})
  }

  // Pied de page : dégradé animé en fond + logo PNG blanc
  function fixFooter2() {
    const foot = document.querySelector(".framer-5kur7")
    if (!foot) return
    foot.classList.add("lumiere-footer")
    if (!foot.querySelector(":scope > video.lumiere-bg")) {
      const v = document.createElement("video")
      v.className = "lumiere-bg"
      v.src = "/assets/media/lumiere-hero.mp4"
      v.poster = "/assets/media/lumiere-hero-poster.jpg"
      v.muted = v.loop = v.autoplay = v.playsInline = true
      v.setAttribute("aria-hidden", "true")
      foot.prepend(v)
      v.play().catch(() => {})
    }
    foot.querySelectorAll('img[src*="a0j6ey3g5tCiaXgIElavjeyF6Sw"]').forEach(img => {
      img.removeAttribute("srcset")
      img.src = "/assets/lumiere-logo-white.png"
      img.alt = "Lumiere"
      img.closest(".framer-vvTG2")?.classList.add("lumiere-footer-logo")
    })
  }

  function apply() {
    fixFooter2()
    fixPreviewBackground()
    fixFooter()
    assignIds()
    fixLinks()
    fixPillars()
    fixTicker()
    fixHeroSecondary()
    fixAbout()
  }

  let lastNav = 0
  function navigate(a) {
    const now = Date.now()
    if (now - lastNav < 600) return
    lastNav = now
    const hash = a.dataset.lumiereHref
    if (!hash.startsWith("#")) {
      window.location.href = hash
      return
    }
    // laisser le menu mobile se refermer avant de mesurer la position
    setTimeout(() => {
      const el = target(hash)
      if (!el) return
      const top = hash === "#hero" ? 0 : el.getBoundingClientRect().top + window.scrollY - 88
      window.scrollTo({ top, behavior: "smooth" })
      history.replaceState(null, "", hash)
    }, 60)
  }
  document.addEventListener(
    "click",
    event => {
      const a = event.target instanceof Element ? event.target.closest("a[data-lumiere-href]") : null
      if (!a) return
      event.preventDefault()
      event.stopImmediatePropagation()
      navigate(a)
    },
    true,
  )
  document.addEventListener(
    "pointerup",
    event => {
      if (event.pointerType === "mouse") return
      const a = event.target instanceof Element ? event.target.closest("a[data-lumiere-href]") : null
      if (a) navigate(a)
    },
    true,
  )

  let queued = false
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      observer.disconnect()
      apply()
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
    })
  })

  function start() {
    apply()
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
    if (location.hash && target(location.hash)) {
      setTimeout(() => {
        const el = target(location.hash)
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88 })
      }, 400)
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start)
  else start()
})()
