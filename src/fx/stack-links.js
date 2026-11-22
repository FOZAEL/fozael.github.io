// Live SVG node-link graph connecting the Capability Astrolabe sectors
// to one or more floating detail panels (splitter + inter-panel bridges).

const SVG_NS = 'http://www.w3.org/2000/svg'

// Sector geometry matches rive/scripts/skills_field.luau (720x660 artboard)
const ARTBOARD_W = 720
const ARTBOARD_H = 660
const CENTER_X = 360
const CENTER_Y = 330
const RING_RADIUS = 260

const SECTOR_ANGLE = {
  1: -Math.PI / 2,        // Azure (12 o'clock)
  2: -Math.PI / 6,        // AWS (2 o'clock)
  3: Math.PI / 6,         // K8s (4 o'clock)
  4: Math.PI / 2,         // Security (6 o'clock)
  5: (5 * Math.PI) / 6,   // Observability (8 o'clock)
  6: (-5 * Math.PI) / 6,  // Code & Design (10 o'clock)
}

const el = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v))
  }
  return node
}

const pt = (x, y) => ({ x: +x.toFixed(1), y: +y.toFixed(1) })

const polarPt = (cx, cy, r, rad) => pt(cx + r * Math.cos(rad), cy + r * Math.sin(rad))

/**
 * Append cubic Bezier segments approximating a circular arc from a0 to a1.
 * Avoids SVG elliptical arc flags so <animateMotion> follows uniformly.
 */
const appendArcSegments = (cx, cy, r, a0, a1) => {
  const total = a1 - a0
  if (Math.abs(total) < 0.01) return ''
  const steps = Math.max(1, Math.ceil(Math.abs(total) / (Math.PI / 4)))
  const dt = total / steps
  const alpha = (4 / 3) * Math.tan(dt / 4)
  let segs = ''
  for (let i = 0; i < steps; i++) {
    const t0 = a0 + i * dt
    const t1 = t0 + dt
    const p0 = polarPt(cx, cy, r, t0)
    const p3 = polarPt(cx, cy, r, t1)
    const c1 = pt(p0.x - alpha * r * Math.sin(t0), p0.y + alpha * r * Math.cos(t0))
    const c2 = pt(p3.x + alpha * r * Math.sin(t1), p3.y - alpha * r * Math.cos(t1))
    segs += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`
  }
  return segs
}

/**
 * Compute trunk SVG path from a sector anchor on the outer astrolabe ring
 * around any interior icons along an outer perimeter arc into targetPt.
 */
const buildTrunkPath = (cx, cy, rRing, domain, targetPt) => {
  const theta = SECTOR_ANGLE[domain] ?? -Math.PI / 6
  const scale = rRing / RING_RADIUS
  const rOut = rRing + Math.max(18, Math.round(24 * scale))
  const start = polarPt(cx, cy, rRing, theta)

  // Right-facing sectors exit radially; top/bottom/left sweep along rOut perimeter
  const exitTheta = domain === 1 || domain === 6
    ? -0.22 * Math.PI
    : domain === 4 || domain === 5
      ? 0.22 * Math.PI
      : theta

  let d = `M ${start.x} ${start.y}`
  const pOut = polarPt(cx, cy, rOut, theta)
  d += ` L ${pOut.x} ${pOut.y}`

  if (Math.abs(exitTheta - theta) > 0.01) {
    d += appendArcSegments(cx, cy, rOut, theta, exitTheta)
  }

  const exitPt = polarPt(cx, cy, rOut, exitTheta)
  const signDir = domain === 1 || domain === 6 ? 1 : -1
  // Tangent at perimeter exit: clockwise on top (-sin, cos), CCW on bottom (sin, -cos)
  const tx = exitTheta === theta ? Math.cos(exitTheta) : -Math.sin(exitTheta) * signDir
  const ty = exitTheta === theta ? Math.sin(exitTheta) : Math.cos(exitTheta) * signDir

  const dx = Math.max(24, targetPt.x - exitPt.x)
  const pull1 = Math.min(54, dx * 0.45)
  const pull2 = Math.min(72, dx * 0.48)
  const c1 = pt(exitPt.x + tx * pull1, exitPt.y + ty * pull1)
  const c2 = pt(targetPt.x - pull2, targetPt.y)
  d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${targetPt.x} ${targetPt.y}`

  return { d, start, exitPt }
}

const buildBranchPath = (a, b) => {
  const dx = Math.max(28, b.x - a.x)
  const c1 = pt(a.x + dx * 0.56, a.y)
  const c2 = pt(b.x - dx * 0.46, b.y)
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`
}

const buildInterPanelPath = (outPt, topPt) => {
  const dy = Math.max(14, topPt.y - outPt.y)
  const swing = Math.max(18, dy * 0.65)
  const c1 = pt(outPt.x + 8, outPt.y + swing)
  const c2 = pt(topPt.x - 8, topPt.y - swing)
  return `M ${outPt.x} ${outPt.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${topPt.x} ${topPt.y}`
}

const addEdgeLayers = (parent, d, kindClass, { panelIndices = [], reducedMotion = false, pulseDur = '2.4s', pulseBegin = '0s', pulseR = 2.6 } = {}) => {
  const group = el('g', { class: `sl-edge ${kindClass}` })
  if (panelIndices.length) group.dataset.panels = panelIndices.join(',')

  group.appendChild(el('path', { class: 'sl-glow', d }))
  group.appendChild(el('path', { class: 'sl-rail', d }))
  group.appendChild(el('path', { class: `sl-flow ${kindClass}-flow`, d }))

  if (!reducedMotion) {
    const bead = el('circle', { class: 'sl-pulse', r: pulseR })
    const motion = el('animateMotion', {
      dur: pulseDur,
      begin: pulseBegin,
      repeatCount: 'indefinite',
      path: d,
    })
    bead.appendChild(motion)
    group.appendChild(bead)
  }
  parent.appendChild(group)
}

/**
 * Manage live SVG connector overlay for #stack-stage.
 */
export const initStackLinks = ({ stageEl, canvasEl, panelsEl, svgEl }) => {
  if (!stageEl || !canvasEl || !panelsEl || !svgEl) {
    return { update() {}, highlightPanel() {}, animateDuringTransition() {}, cleanup() {} }
  }

  let current = { domain: 0, accent: '#e56b38', panelCount: 0 }
  let rafId = 0
  const reduceMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')

  const relCenter = (node, stageRect) => {
    const r = node.getBoundingClientRect()
    return pt(r.left - stageRect.left + r.width / 2, r.top - stageRect.top + r.height / 2)
  }

  const render = () => {
    if (!current.domain || !current.panelCount) {
      svgEl.innerHTML = ''
      return
    }

    const panelNodes = Array.from(panelsEl.querySelectorAll('.sp-panel'))
    if (!panelNodes.length) {
      svgEl.innerHTML = ''
      return
    }

    const stageRect = stageEl.getBoundingClientRect()
    const canvasRect = canvasEl.getBoundingClientRect()
    if (stageRect.width < 10 || canvasRect.width < 10) return

    svgEl.setAttribute('viewBox', `0 0 ${stageRect.width.toFixed(1)} ${stageRect.height.toFixed(1)}`)
    svgEl.style.setProperty('--sl-accent', current.accent)

    const scale = canvasRect.width / ARTBOARD_W
    const cx = canvasRect.left - stageRect.left + CENTER_X * scale
    const cy = canvasRect.top - stageRect.top + (CENTER_Y / ARTBOARD_H) * canvasRect.height
    const rRing = RING_RADIUS * scale

    const inPorts = panelNodes.map((panel) => {
      const sock = panel.querySelector('.sp-port-in')
      if (sock) return relCenter(sock, stageRect)
      const r = panel.getBoundingClientRect()
      return pt(r.left - stageRect.left, r.top - stageRect.top + r.height / 2)
    })

    const outPorts = panelNodes.map((panel) => {
      const sock = panel.querySelector('.sp-port-out')
      if (sock) return relCenter(sock, stageRect)
      const r = panel.getBoundingClientRect()
      return pt(r.left - stageRect.left + r.width - 28, r.bottom - stageRect.top)
    })

    const topPorts = panelNodes.map((panel) => {
      const sock = panel.querySelector('.sp-port-top')
      if (sock) return relCenter(sock, stageRect)
      const r = panel.getBoundingClientRect()
      return pt(r.left - stageRect.left + r.width - 28, r.top - stageRect.top)
    })

    const reducedMotion = Boolean(reduceMotionQuery?.matches)
    const frag = document.createDocumentFragment()
    const canvasRight = canvasRect.right - stageRect.left
    const panelsLeft = panelsEl.getBoundingClientRect().left - stageRect.left
    const isStacked = stageRect.width < 820 || panelsLeft < canvasRight - 40

    if (panelNodes.length === 1) {
      const trunk = buildTrunkPath(cx, cy, rRing, current.domain, inPorts[0])
      addEdgeLayers(frag, trunk.d, 'sl-trunk', {
        panelIndices: [0],
        reducedMotion,
        pulseDur: '2.6s',
        pulseR: 3,
      })
      addSocketNodes(frag, trunk.start, inPorts[0])
    } else {
      const avgY = inPorts.reduce((sum, p) => sum + p.y, 0) / inPorts.length
      const splitter = isStacked
        ? pt(Math.max(14, inPorts[0].x - 22), Math.max(canvasRect.bottom - stageRect.top + 16, inPorts[0].y - 34))
        : pt(Math.max(cx + rRing + 24, (canvasRight + Math.min(...inPorts.map((p) => p.x))) / 2 - 4), avgY)

      const trunk = buildTrunkPath(cx, cy, rRing, current.domain, splitter)
      addEdgeLayers(frag, trunk.d, 'sl-trunk', {
        panelIndices: panelNodes.map((_, i) => i),
        reducedMotion,
        pulseDur: '2.3s',
        pulseR: 3,
      })

      inPorts.forEach((port, idx) => {
        const dBranch = buildBranchPath(splitter, port)
        addEdgeLayers(frag, dBranch, 'sl-branch', {
          panelIndices: [idx],
          reducedMotion,
          pulseDur: '1.9s',
          pulseBegin: `${(idx * 0.28).toFixed(2)}s`,
          pulseR: 2.5,
        })
      })

      for (let i = 0; i < panelNodes.length - 1; i++) {
        const dInter = buildInterPanelPath(outPorts[i], topPorts[i + 1])
        addEdgeLayers(frag, dInter, 'sl-inter', {
          panelIndices: [i, i + 1],
          reducedMotion,
          pulseDur: '1.7s',
          pulseBegin: `${(0.15 + i * 0.25).toFixed(2)}s`,
          pulseR: 2.3,
        })
        frag.appendChild(el('circle', { class: 'sl-socket', cx: outPorts[i].x, cy: outPorts[i].y, r: 3.2 }))
        frag.appendChild(el('circle', { class: 'sl-socket', cx: topPorts[i + 1].x, cy: topPorts[i + 1].y, r: 3.2 }))
      }

      addSocketNodes(frag, trunk.start, ...inPorts)
      frag.appendChild(el('rect', {
        class: 'sl-splitter-ring',
        x: splitter.x - 7,
        y: splitter.y - 7,
        width: 14,
        height: 14,
        rx: 3,
        transform: `rotate(45 ${splitter.x} ${splitter.y})`,
      }))
      frag.appendChild(el('rect', {
        class: 'sl-splitter-core',
        x: splitter.x - 3.2,
        y: splitter.y - 3.2,
        width: 6.4,
        height: 6.4,
        rx: 1.5,
        transform: `rotate(45 ${splitter.x} ${splitter.y})`,
      }))
    }

    svgEl.replaceChildren(frag)
  }

  function addSocketNodes(frag, originPt, ...targetPts) {
    frag.appendChild(el('circle', { class: 'sl-origin-halo', cx: originPt.x, cy: originPt.y, r: 9 }))
    frag.appendChild(el('circle', { class: 'sl-origin-core', cx: originPt.x, cy: originPt.y, r: 4.2 }))
    for (const tp of targetPts) {
      frag.appendChild(el('circle', { class: 'sl-socket', cx: tp.x, cy: tp.y, r: 3.4 }))
    }
  }

  const highlightPanel = (idx = null) => {
    const edges = svgEl.querySelectorAll('.sl-edge')
    edges.forEach((edge) => {
      if (idx === null || idx === undefined) {
        edge.classList.remove('is-active', 'is-dim')
        return
      }
      const list = (edge.dataset.panels || '').split(',').filter(Boolean)
      const hit = list.includes(String(idx))
      edge.classList.toggle('is-active', hit)
      edge.classList.toggle('is-dim', !hit)
    })
  }

  const animateDuringTransition = (durationMs = 580) => {
    if (rafId) cancelAnimationFrame(rafId)
    const t0 = performance.now()
    const step = (now) => {
      render()
      if (now - t0 < durationMs && current.domain !== 0) {
        rafId = requestAnimationFrame(step)
      } else {
        rafId = 0
        render()
      }
    }
    rafId = requestAnimationFrame(step)
  }

  const ro = new ResizeObserver(() => render())
  ro.observe(stageEl)
  ro.observe(canvasEl)

  return {
    update({ domain, accent, panelCount }) {
      current = {
        domain: domain || 0,
        accent: accent || '#e56b38',
        panelCount: panelCount || 0,
      }
      render()
    },
    highlightPanel,
    animateDuringTransition,
    cleanup() {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
      ro.disconnect()
      svgEl.innerHTML = ''
    },
  }
}
