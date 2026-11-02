/**
 * One shared tooltip for labels that collapse to an icon (`StatLabel`): the floating layer's
 * recipe (opaque `--solid-2`, `--shadow-2`, 12px, a 120ms fade), fixed to the viewport so a
 * scrolling table cannot clip it. Above its target, below when there is no room, kept on screen.
 * It takes the theme of a `.iv-light` / `.iv-dark` piece it is opened from.
 */
let tip: HTMLDivElement | null = null
let owner: Element | null = null
let timer = 0

function bubble() {
  if (!tip) {
    tip = document.createElement('div')
    tip.className = 'iv-tip'
    tip.setAttribute('role', 'tooltip')
    document.body.append(tip)
  }
  return tip
}

/** A tap elsewhere or a scroll closes a tooltip opened by a tap. */
const away = (e: Event) => {
  if (!owner || (e.target instanceof Node && owner.contains(e.target))) return
  hideTip()
}
function listen(on: boolean) {
  const f = on ? document.addEventListener : document.removeEventListener
  f.call(document, 'pointerdown', away, true)
  f.call(document, 'scroll', away, true)
}

/** Shows `text` over `target`; `linger` closes it by itself after that many ms (a tap). */
export function showTip(target: Element, text: string, linger = 0) {
  const el = bubble()
  el.textContent = text
  el.classList.toggle('iv-light', !!target.closest('.iv-light'))
  el.classList.toggle('iv-dark', !!target.closest('.iv-dark'))
  const r = target.getBoundingClientRect()
  const w = el.offsetWidth
  const h = el.offsetHeight
  const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8)
  const y = r.top - h - 6 >= 8 ? r.top - h - 6 : r.bottom + 6
  el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
  el.classList.add('on')
  if (!owner) listen(true)
  owner = target
  clearTimeout(timer)
  if (linger) timer = window.setTimeout(hideTip, linger)
}

/** Hides the tooltip; with a `target`, only when it is that target's. */
export function hideTip(target?: Element) {
  if (!owner || (target && target !== owner)) return
  clearTimeout(timer)
  tip?.classList.remove('on')
  owner = null
  listen(false)
}

/** Whether the tooltip is open on `target`. */
export const tipOn = (target: Element) => owner === target
