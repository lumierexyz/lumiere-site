// Guided tour: highlights one card at a time and blurs everything else.
// The blur is applied to the other elements themselves (not a backdrop with a cut-out), so the
// highlighted card keeps its rounded corners and there are no seams.

let STORE = "lumiere.tour.v1"
export function scopeTour(userId) { if (userId) STORE = `lumiere.tour.v1:${userId}` }
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches

export const tourDone = () => localStorage.getItem(STORE) === "done"

export function runTour(steps) {
  return new Promise(resolve => {
    const blurables = [...document.querySelectorAll("[data-tour-blur]")]
    const veil = document.createElement("div")
    veil.className = "tour-veil"
    const pop = document.createElement("div")
    pop.className = "tour-pop"
    pop.setAttribute("role", "dialog")
    pop.setAttribute("aria-live", "polite")
    document.body.append(veil, pop)
    document.body.classList.add("touring")
    requestAnimationFrame(() => veil.classList.add("in"))

    let i = 0
    let active = null

    function place(target) {
      const r = target.getBoundingClientRect()
      const pw = pop.offsetWidth, ph = pop.offsetHeight, m = 16
      if (innerWidth < 700) {
        pop.classList.add("sheet")
        pop.style.left = pop.style.top = ""
        return
      }
      pop.classList.remove("sheet")
      const clampY = y => Math.min(Math.max(m, y), innerHeight - ph - m)
      const clampX = x => Math.min(Math.max(m, x), innerWidth - pw - m)
      let top, left
      if (r.bottom + m + ph <= innerHeight - m) {          // below
        top = r.bottom + m; left = clampX(r.left + Math.min(32, r.width / 4))
      } else if (r.top - m - ph >= m) {                    // above
        top = r.top - m - ph; left = clampX(r.left + Math.min(32, r.width / 4))
      } else if (r.left - m - pw >= m) {                   // left of the card
        left = r.left - m - pw; top = clampY(r.top + 24)
      } else if (r.right + m + pw <= innerWidth - m) {     // right of the card
        left = r.right + m; top = clampY(r.top + 24)
      } else {                                             // tall full-width card: inside, bottom-left corner
        left = clampX(r.left + 24); top = clampY(Math.min(r.bottom, innerHeight) - ph - 24)
      }
      pop.style.left = `${left}px`
      pop.style.top = `${top}px`
    }

    function show(n) {
      i = n
      const step = steps[i]
      const target = document.querySelector(step.target)
      blurables.forEach(el => el.classList.toggle("tour-active", el === target))
      active = target
      pop.classList.remove("show")
      pop.innerHTML = `
        <p class="tour-step">${i + 1} of ${steps.length}</p>
        <h3>${step.title}</h3>
        <p>${step.body}</p>
        <div class="tour-actions">
          <button class="tour-skip" data-skip>${i === steps.length - 1 ? "" : "Skip tour"}</button>
          <span class="tour-dots">${steps.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</span>
          ${i > 0 ? `<button class="pill" data-back>Back</button>` : ""}
          <button class="pill dark" data-next>${i === steps.length - 1 ? "Start" : "Next"}</button>
        </div>`
      pop.querySelector("[data-next]").onclick = () => (i === steps.length - 1 ? end() : show(i + 1))
      pop.querySelector("[data-back]")?.addEventListener("click", () => show(i - 1))
      pop.querySelector("[data-skip]").onclick = end
      const r = target.getBoundingClientRect()
      const mobile = innerWidth < 700
      const offscreen = mobile ? Math.abs(r.top - 88) > 4 : r.top < 90 || r.bottom > innerHeight - 40
      if (offscreen) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth",
        block: mobile || r.height > innerHeight * 0.6 ? "start" : "center" })
      setTimeout(() => {
        place(target)
        pop.classList.add("show")
        pop.querySelector("[data-next]").focus({ preventScroll: true })
      }, offscreen && !reduced ? 520 : 60)
    }

    function onKey(e) {
      if (e.key === "Escape") end()
      if (e.key === "ArrowRight") i < steps.length - 1 ? show(i + 1) : end()
      if (e.key === "ArrowLeft" && i > 0) show(i - 1)
    }
    const onResize = () => active && place(active)

    function end() {
      localStorage.setItem(STORE, "done")
      document.removeEventListener("keydown", onKey)
      removeEventListener("resize", onResize)
      removeEventListener("scroll", onResize)
      pop.classList.remove("show")
      veil.classList.remove("in")
      blurables.forEach(el => el.classList.remove("tour-active"))
      document.body.classList.remove("touring")
      setTimeout(() => { veil.remove(); pop.remove(); resolve() }, reduced ? 0 : 500)
    }

    document.addEventListener("keydown", onKey)
    addEventListener("resize", onResize)
    addEventListener("scroll", onResize, { passive: true })
    show(0)
  })
}
