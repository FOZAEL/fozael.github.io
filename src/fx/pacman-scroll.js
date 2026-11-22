// Left-Edge Interactive Arcade Pac-Man Section Navigator:
// - Displays clickable section names directly right of major Pac-Man dots (Overview..Contact)
// - Keeps damped Y tracking, scroll-driven chomp cycle, pellet eating & pixel crumb bursts
// - Synthesizes retro two-tone "waka-waka" sound via Web Audio API when hovering Pac-Man,
//   any station label/dot, or any pellet along the Pac-Man line

const STATIONS = [
  { slot: 0, id: 'overview', label: 'Overview' },
  { slot: 2, id: 'architecture', label: 'Architecture' },
  { slot: 4, id: 'delivery', label: 'Delivery' },
  { slot: 6, id: 'trajectory', label: 'Trajectory' },
  { slot: 8, id: 'stack', label: 'Stack' },
  { slot: 10, id: 'background', label: 'Background' },
  { slot: 12, id: 'contact', label: 'Contact' },
]

const STATION_BY_SLOT = Object.fromEntries(STATIONS.map((s) => [s.slot, s]))

const PAC_FRAMES = [
  `<svg viewBox="0 0 16 16" width="28" height="28" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#090a0d" d="M5 0h6v1h2v1h1v2h1v8h-1v2h-1v1h-2v1H5v-1H3v-1H2v-2H1V4h1V2h1V1h2z"/>
    <path fill="#f6c53a" d="M5 1h6v1h2v1h1v2h1v6h-1v2h-1v1h-2v1H5v-1H3v-1H2v-2H1V5h1V3h1V2h2z"/>
    <rect x="8" y="3" width="2" height="2" fill="#090a0d"/>
    <rect x="9" y="7" width="5" height="2" fill="#090a0d"/>
  </svg>`,
  `<svg viewBox="0 0 16 16" width="28" height="28" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#090a0d" d="M5 0h6v1h2v1h1v2h1v3h-3v2h3v3h-1v2h-1v1h-2v1H5v-1H3v-1H2v-2H1v-2H0V5h1V3h1V2h1V1h2z"/>
    <path fill="#f6c53a" d="M5 1h6v1h2v1h1v2h-4v1H8v1H6v2h2v1h2v1h4v2h-1v1h-2v1H5v-1H3v-1H2v-2H1V5h1V3h1V2h2z"/>
    <rect x="8" y="3" width="2" height="2" fill="#090a0d"/>
  </svg>`,
  `<svg viewBox="0 0 16 16" width="28" height="28" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#090a0d" d="M5 0h6v1h2v1h1v2h-2v1H9v2H7v2h2v2h3v1h2v2h-1v1h-2v1H5v-1H3v-1H2v-2H1v-2H0V5h1V3h1V2h1V1h2z"/>
    <path fill="#f6c53a" d="M5 1h6v1h2v1h-3v1H8v2H6v4h2v2h2v1h3v1h-2v1H5v-1H3v-1H2v-2H1V5h1V3h1V2h2z"/>
    <rect x="7" y="3" width="2" height="2" fill="#090a0d"/>
  </svg>`,
]

const FOOD_DIAMOND_SVG = `<svg viewBox="0 0 10 10" width="11" height="11" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="#090a0d" d="M3 0h4v1h2v2h1v4H9v2H7v1H3V9H1V7H0V3h1V1h2z"/>
  <path fill="#f6c53a" d="M3 1h4v1h1v1h1v4H8v1H7v1H3V8H2V7H1V3h1V2h1z"/>
</svg>`

const FOOD_CRUMB_SVG = `<svg viewBox="0 0 8 8" width="7" height="7" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="1" y="1" width="6" height="6" fill="#090a0d"/>
  <rect x="2" y="2" width="4" height="4" fill="#f6c53a"/>
</svg>`

const BURST_SVG = `<svg class="pm-burst" viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="1" y="2" width="2" height="2" fill="#f6c53a"/>
  <rect x="13" y="2" width="2" height="2" fill="#f6c53a"/>
  <rect x="1" y="12" width="2" height="2" fill="#f6c53a"/>
  <rect x="13" y="12" width="2" height="2" fill="#f6c53a"/>
</svg>`

export const initPacmanScroll = () => {
  const nav = document.getElementById('pacman-nav')
  if (!nav) return null

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const totalSlots = 13
  const pitch = 28
  const trackTravel = (totalSlots - 1) * pitch // 336px

  // Lazy retro Web Audio Pac-Man synthesizer (gesture-safe, zero console noise)
  let audioCtx = null
  let wakaStep = 0
  let lastSoundAt = 0

  const detachGestureUnlock = () => {
    window.removeEventListener('pointerdown', onGestureUnlock)
    window.removeEventListener('keydown', onGestureUnlock)
    window.removeEventListener('touchstart', onGestureUnlock)
    window.removeEventListener('click', onGestureUnlock)
  }

  const getAudioCtx = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      if (!audioCtx) audioCtx = new AC()
      return audioCtx
    } catch {
      return null
    }
  }

  const unlockAudio = () => {
    const ctx = getAudioCtx()
    if (!ctx) return null
    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => {
          if (audioCtx && audioCtx.state === 'running') detachGestureUnlock()
        })
        .catch(() => {})
    } else if (ctx.state === 'running') {
      detachGestureUnlock()
    }
    return ctx
  }

  const synthWaka = (ctx) => {
    try {
      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      if (wakaStep % 2 === 0) {
        osc.frequency.setValueAtTime(250, t)
        osc.frequency.exponentialRampToValueAtTime(520, t + 0.055)
        osc.frequency.exponentialRampToValueAtTime(290, t + 0.11)
      } else {
        osc.frequency.setValueAtTime(500, t)
        osc.frequency.exponentialRampToValueAtTime(230, t + 0.055)
        osc.frequency.exponentialRampToValueAtTime(430, t + 0.11)
      }
      wakaStep += 1

      gain.gain.setValueAtTime(0.001, t)
      gain.gain.exponentialRampToValueAtTime(0.075, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.115)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.12)
    } catch {}
  }

  const playWaka = (force = false) => {
    const nowMs = performance.now()
    if (!force && nowMs - lastSoundAt < 110) return
    lastSoundAt = nowMs

    const ctx = getAudioCtx()
    if (!ctx) return
    if (ctx.state === 'running') {
      synthWaka(ctx)
      return
    }
    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => {
          if (ctx.state === 'running') {
            detachGestureUnlock()
            synthWaka(ctx)
          }
        })
        .catch(() => {})
    }
  }

  const onGestureUnlock = () => unlockAudio()
  window.addEventListener('pointerdown', onGestureUnlock, { passive: true })
  window.addEventListener('keydown', onGestureUnlock, { passive: true })
  window.addEventListener('touchstart', onGestureUnlock, { passive: true })
  window.addEventListener('click', onGestureUnlock, { passive: true })

  const rowsHtml = Array.from({ length: totalSlots }, (_, slot) => {
    const st = STATION_BY_SLOT[slot]
    const topPx = slot * pitch
    if (st) {
      return `
        <button type="button" class="pm-row pm-station" data-section="${st.id}" data-slot="${slot}" style="top: ${topPx}px;" aria-label="Jump to ${st.label}">
          <span class="pm-pellet pm-major" data-slot="${slot}">
            ${FOOD_DIAMOND_SVG}
            ${BURST_SVG}
          </span>
          <span class="pm-label">${st.label}</span>
        </button>
      `
    }
    return `
      <div class="pm-row" data-slot="${slot}" style="top: ${topPx}px;" aria-hidden="true">
        <span class="pm-pellet pm-minor" data-slot="${slot}">
          ${FOOD_CRUMB_SVG}
          ${BURST_SVG}
        </span>
      </div>
    `
  }).join('')

  nav.innerHTML = `
    <div class="pm-track">
      ${rowsHtml}
      <div class="pm-actor" data-frame="1" aria-hidden="true">
        <span class="pm-sprite pm-f0">${PAC_FRAMES[0]}</span>
        <span class="pm-sprite pm-f1">${PAC_FRAMES[1]}</span>
        <span class="pm-sprite pm-f2">${PAC_FRAMES[2]}</span>
      </div>
    </div>
  `

  const actor = nav.querySelector('.pm-actor')
  const pellets = [...nav.querySelectorAll('.pm-pellet')]
  const minorPellets = [...nav.querySelectorAll('.pm-pellet.pm-minor')]
  const stations = [...nav.querySelectorAll('.pm-station')]
  const sectionEls = STATIONS.map((s) => document.getElementById(s.id)).filter(Boolean)

  let maxScroll = 1
  let sectionAnchors = []
  let mounted = true

  const measureLayout = () => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    if (!sectionEls.length) {
      sectionAnchors = []
      return
    }
    const anchors = sectionEls.map((el, i) => {
      if (i === 0) return 0
      if (i === sectionEls.length - 1) return maxScroll
      return Math.max(0, Math.min(maxScroll, Math.round(el.getBoundingClientRect().top + window.scrollY)))
    })
    for (let i = anchors.length - 2; i >= 1; i--) {
      anchors[i] = Math.min(anchors[i], Math.max(1, anchors[i + 1] - 40))
    }
    for (let i = 1; i < anchors.length; i++) {
      anchors[i] = Math.max(anchors[i], Math.min(maxScroll, anchors[i - 1] + 20))
    }
    sectionAnchors = anchors
  }
  measureLayout()

  const getStationProgress = (y = window.scrollY) => {
    const count = sectionAnchors.length
    if (count < 2) return 0
    if (y <= sectionAnchors[0]) return 0
    const last = count - 1
    if (y >= sectionAnchors[last]) return last
    for (let i = 0; i < last; i++) {
      const a = sectionAnchors[i]
      const b = sectionAnchors[i + 1]
      if (y <= b) {
        const span = Math.max(1, b - a)
        return i + (y - a) / span
      }
    }
    return last
  }

  const getTargetY = () => {
    const count = sectionAnchors.length
    if (count < 2) return 0
    return (getStationProgress() / (count - 1)) * trackTravel
  }

  let curY = getTargetY()
  let lastY = window.scrollY
  let distAcc = 0
  let seqIdx = 0
  const chompSeq = [0, 1, 2, 1]
  let settleTimer = null
  let pulseTimer = null
  let raf = 0

  actor.style.setProperty('--face', '90deg')
  actor.style.transform = `translateY(${curY.toFixed(1)}px)`

  const pulseChomp = () => {
    if (reduced) return
    seqIdx = (seqIdx + 1) % chompSeq.length
    actor.dataset.frame = String(chompSeq[seqIdx])
    clearTimeout(pulseTimer)
    pulseTimer = setTimeout(() => { actor.dataset.frame = '1' }, 140)
  }

  const syncEaten = (py) => {
    const pacCenter = py + pitch * 0.5
    pellets.forEach((el) => {
      const slot = Number(el.dataset.slot)
      const pelletCenter = slot * pitch + pitch * 0.5
      const wasEaten = el.classList.contains('is-eaten')
      const eaten = pelletCenter < pacCenter - 4
      if (eaten !== wasEaten) {
        el.classList.toggle('is-eaten', eaten)
        if (eaten && !reduced) {
          el.classList.remove('just-ate')
          void el.offsetWidth
          el.classList.add('just-ate')
        }
      }
    })
  }

  const syncActiveStation = () => {
    if (!sectionEls.length) return
    const activeIdx = Math.max(0, Math.min(sectionEls.length - 1, Math.round(getStationProgress())))
    const activeId = sectionEls[activeIdx].id
    stations.forEach((btn) => {
      const match = btn.dataset.section === activeId
      btn.classList.toggle('is-active', match)
      btn.setAttribute('aria-current', match ? 'true' : 'false')
    })
  }

  syncEaten(curY)
  syncActiveStation()

  const tick = () => {
    const target = getTargetY()
    curY = reduced ? target : curY + (target - curY) * 0.22
    if (Math.abs(target - curY) < 0.2) {
      curY = target
      raf = 0
    } else {
      raf = requestAnimationFrame(tick)
    }
    actor.style.transform = `translateY(${curY.toFixed(1)}px)`
    syncEaten(curY)
  }

  const onScroll = () => {
    const dy = window.scrollY - lastY
    lastY = window.scrollY
    if (Math.abs(dy) > 0.5) {
      actor.style.setProperty('--face', dy > 0 ? '90deg' : '-90deg')
      if (!reduced) {
        distAcc += Math.abs(dy)
        if (distAcc >= 18) {
          seqIdx = (seqIdx + 1) % chompSeq.length
          distAcc = 0
          actor.dataset.frame = String(chompSeq[seqIdx])
        }
        clearTimeout(settleTimer)
        settleTimer = setTimeout(() => { actor.dataset.frame = '1' }, 140)
      }
    }
    syncActiveStation()
    if (!raf) raf = requestAnimationFrame(tick)
  }

  // Hover & Click on Station labels + major dots -> play waka-waka sound + chomp pulse
  const stationListeners = stations.map((btn) => {
    const onEnter = () => {
      pulseChomp()
      playWaka(false)
    }
    const onClick = () => {
      unlockAudio()
      pulseChomp()
      playWaka(true)
      measureLayout()
      const id = btn.dataset.section
      const stIdx = sectionEls.findIndex((el) => el.id === id)
      const top = stIdx >= 0 && sectionAnchors[stIdx] !== undefined ? sectionAnchors[stIdx] : 0
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
    }
    btn.addEventListener('pointerenter', onEnter)
    btn.addEventListener('click', onClick)
    return { btn, onEnter, onClick }
  })

  // Hover on Minor Pellets along the Pac-Man line -> play waka-waka sound + chomp pulse
  const minorListeners = minorPellets.map((el) => {
    const onEnter = () => {
      pulseChomp()
      playWaka(false)
    }
    el.addEventListener('pointerenter', onEnter)
    return { el, onEnter }
  })

  // Hover on Pac-Man actor -> playful waka-waka arcade chomp + sound loop while hovered
  let hoverLoop = null
  let hoverChompTimer = null
  let lastHoverAt = 0

  const startPacHover = () => {
    const now = performance.now()
    if (now - lastHoverAt < 320) return
    lastHoverAt = now
    playWaka(true)
    if (!reduced) actor.dataset.frame = '2'
    hoverChompTimer = setTimeout(() => {
      playWaka(true)
      if (!reduced) actor.dataset.frame = '0'
    }, 130)

    clearInterval(hoverLoop)
    hoverLoop = setInterval(() => {
      seqIdx = (seqIdx + 1) % chompSeq.length
      if (!reduced) actor.dataset.frame = String(chompSeq[seqIdx])
      playWaka(false)
    }, 420)
  }

  const stopPacHover = () => {
    clearTimeout(hoverChompTimer)
    clearInterval(hoverLoop)
    hoverLoop = null
    actor.dataset.frame = '1'
  }

  actor.addEventListener('pointerenter', startPacHover)
  actor.addEventListener('pointerleave', stopPacHover)

  let measureRaf = 0
  const scheduleMeasure = () => {
    if (measureRaf) return
    measureRaf = requestAnimationFrame(() => {
      measureRaf = 0
      measureLayout()
      syncActiveStation()
      if (!raf) raf = requestAnimationFrame(tick)
    })
  }

  const ro = new ResizeObserver(scheduleMeasure)
  ro.observe(document.body)

  const onResize = () => {
    measureLayout()
    syncActiveStation()
    if (!raf) raf = requestAnimationFrame(tick)
  }
  const onLoad = () => scheduleMeasure()
  document.fonts?.ready?.then(() => { if (mounted) scheduleMeasure() }).catch(() => {})
  window.addEventListener('load', onLoad, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })

  return () => {
    mounted = false
    cancelAnimationFrame(raf)
    cancelAnimationFrame(measureRaf)
    clearTimeout(settleTimer)
    clearTimeout(pulseTimer)
    clearTimeout(hoverChompTimer)
    clearInterval(hoverLoop)
    ro.disconnect()
    actor.removeEventListener('pointerenter', startPacHover)
    actor.removeEventListener('pointerleave', stopPacHover)
    stationListeners.forEach(({ btn, onEnter, onClick }) => {
      btn.removeEventListener('pointerenter', onEnter)
      btn.removeEventListener('click', onClick)
    })
    minorListeners.forEach(({ el, onEnter }) => {
      el.removeEventListener('pointerenter', onEnter)
    })
    window.removeEventListener('load', onLoad)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    detachGestureUnlock()
  }
}
