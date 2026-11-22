// Jorge Riera (jorgerieraflores.com) inspired Hero handwritten margin note,
// sequential character write reveal, curved SVG pointer arrow (pathLength=1), and 3-ray copper flash burst.

export const initHandwriteNotes = () => {
  const notes = [...document.querySelectorAll('.hw-note')]
  if (!notes.length) return null

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  notes.forEach((note) => {
    const textEl = note.querySelector('.hw-text')
    const raw = (textEl?.dataset.text || textEl?.textContent || '').trim()
    if (!textEl || !raw) return

    const stepMs = 36
    let charIdx = 0
    textEl.innerHTML = [...raw].map((ch) => {
      if (ch === ' ') return '<span class="hw-space">&nbsp;</span>'
      const delay = (charIdx++ * stepMs).toFixed(0)
      return `<span class="hw-char" style="--d:${delay}ms">${ch}</span>`
    }).join('')

    const arrowDelay = Math.max(260, charIdx * stepMs + 60)
    const flashDelay = arrowDelay + 340
    note.style.setProperty('--arrow-delay', `${arrowDelay}ms`)
    note.style.setProperty('--flash-delay', `${flashDelay}ms`)

    if (reduced) note.classList.add('is-written')
  })

  if (!reduced) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelector('#overview .hw-note')?.classList.add('is-written')
      }, 280)
    })
  }

  return null
}
