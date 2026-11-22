// Main orchestrator for Ahmad Fozail Amiri's Volcanic Obsidian Interactive Resume.
// Integrates 6 Flash-Rive WebGL2 artboards + interactive background portrait wave,
// left-edge arcade Pac-Man section navigator w/ Web Audio chomp sound, and 3D Fibonacci Globe.
import {
  CREDENTIAL_MILESTONES, DIAL_MILESTONES, ERAS,
  PIPELINE_PRESETS, SKILL_CATEGORIES, SKILL_DOMAINS, TECH_OVERRIDES,
} from './data.js'
import { getMountedBoards, loadResumeRiv, mountBoard, onTelemetry } from './lib/rive.js'
import { initDeliveryTerminal } from './fx/delivery-terminal.js'
import { initPacmanScroll } from './fx/pacman-scroll.js'
import { initContactBeacon } from './fx/contact-beacon.js'
import { initStackLinks } from './fx/stack-links.js'

const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => [...document.querySelectorAll(sel)]

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const DOMAIN_COLORS = {
  1: '#3b8ef3',
  2: '#e8a238',
  3: '#e56b38',
  4: '#e5484d',
  5: '#2dc492',
  6: '#68adff',
}

const MILESTONE_GLYPHS = [
  `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="8,1.5 14,5 14,11 8,14.5 2,11 2,5"/><circle cx="8" cy="8" r="1.8" fill="currentColor" stroke="none"/></svg>`,
  `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="5.5" cy="8" r="3.4"/><circle cx="10.5" cy="8" r="3.4"/></svg>`,
  `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="8,2 14,5 8,8 2,5"/><polyline points="2,8 8,11 14,8"/><polyline points="2,11 8,14 14,11"/></svg>`,
  `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="5.5,2 10.5,2 14,5.5 14,10.5 10.5,14 5.5,14 2,10.5 2,5.5"/><polygon points="8,5.5 10.5,8 8,10.5 5.5,8"/></svg>`,
  `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="3.2" r="1.7"/><circle cx="3.8" cy="11.5" r="1.7"/><circle cx="12.2" cy="11.5" r="1.7"/><path d="M7.2 4.7 L4.6 9.8 M8.8 4.7 L11.4 9.8 M5.6 11.5 L10.4 11.5"/></svg>`,
  `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="8,1.5 14,5 14,11 8,14.5 2,11 2,5"/><polygon points="8,4.6 11,6.4 11,9.6 8,11.4 5,9.6 5,6.4"/><path d="M8 1.5 V4.6 M14 11 L11 9.6 M2 11 L5 9.6"/></svg>`,
]

const state = {
  era: 0,
  serviceIdx: 4, // Default inspect primary workload microservice (index 4)
  traffic: 1,
  chaos: 0,
  pipelinePreset: 0,
  dialValue: 0.96,
  activeMilestoneIdx: DIAL_MILESTONES.length - 1,
  domain: 0,
  selectedTech: null,
  activeCredIdx: 0,
  xrayOpen: false,
}

const boards = {}
let contractData = null
let deliveryTerminal = null
let stackLinks = null

// Toast & Clipboard -----------------------------------------------------------
let toastTimer = null
const toast = (msg) => {
  const el = $('#toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200)
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy]')
  if (!btn) return
  const text = btn.getAttribute('data-copy')
  navigator.clipboard?.writeText(text).then(() => toast(`Copied ${text}`)).catch(() => toast(text))
})

// 1. Era Tabs (Fade Profile Cards + Brand Logos) & Microservice Inspector ---

const ERA_BRANDS = {
  // EzForensics.com (Azure forensics shield + inspection lens)
  0: `<span class="era-brand-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2.5L4.5 5.6v5.7c0 4.9 3.2 8.9 7.5 10.2 4.3-1.3 7.5-5.3 7.5-10.2V5.6L12 2.5Z" fill="rgba(59, 142, 243, 0.16)" stroke="#3b8ef3" stroke-width="1.6" stroke-linejoin="round"/><circle cx="11.2" cy="11.2" r="3.1" stroke="#f2ede4" stroke-width="1.6"/><path d="M13.5 13.5l2.5 2.5" stroke="#f2ede4" stroke-width="1.6" stroke-linecap="round"/></svg></span><span class="era-tab-org">EzForensics.com</span>`,
  // Official movie.af logo
  1: `<img class="era-logo-img era-logo-movie" src="assets/logos/movie-af.png" alt="movie.af" decoding="async">`,
  // Official ExpoPrint logo
  2: `<img class="era-logo-img era-logo-expoprint" src="assets/logos/expoprint.svg" alt="expoprint.io" decoding="async">`,
  // Herat Univ. NOC (Emerald campus topology core emblem)
  3: `<span class="era-brand-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="rgba(45, 196, 146, 0.10)" stroke="rgba(45, 196, 146, 0.35)" stroke-width="1.2"/><path d="M12 12V4.8M12 12L5.8 16.2M12 12l6.2 4.2" stroke="#2dc492" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="12" r="2.4" fill="#2dc492"/><circle cx="12" cy="4.8" r="1.6" fill="#f2ede4"/><circle cx="5.8" cy="16.2" r="1.6" fill="#f2ede4"/><circle cx="18.2" cy="16.2" r="1.6" fill="#f2ede4"/></svg></span><span class="era-tab-org">Herat Univ. NOC</span>`,
}

const renderEraTabs = () => {
  const wrap = $('#era-tabs')
  wrap.innerHTML = ERAS.map((era) => `
    <button class="era-tab" role="tab" type="button" data-era="${era.id}" data-accent="${era.accent}" aria-selected="${era.id === state.era}" aria-label="${era.org} — ${era.role} (${era.period} · ${era.mode})">
      <span class="era-tab-brand">${ERA_BRANDS[era.id]}</span>
      <span class="era-tab-meta">
        <span class="era-tab-role">${era.role}</span>
        <span class="era-tab-period">${era.period} · ${era.mode}</span>
      </span>
    </button>
  `).join('')

  wrap.querySelectorAll('.era-tab').forEach((btn) => {
    btn.addEventListener('click', () => selectEra(Number(btn.dataset.era)))
  })
}

const renderServiceInspector = () => {
  const era = ERAS[state.era]
  const svc = era.services[state.serviceIdx] || era.services[4]
  $('#service-inspector').innerHTML = `
    <span class="si-name">${svc.name}</span>
    <span class="si-zone">${svc.zone}</span>
    <span class="si-desc">${svc.desc}</span>
  `
}

const renderEraDetail = () => {
  $('#era-tabs').querySelectorAll('.era-tab').forEach((btn) => {
    btn.setAttribute('aria-selected', String(Number(btn.dataset.era) === state.era))
  })
  renderServiceInspector()
}

// 2. Branching DAG Presets, Direct-Switch Milestones & Bento ------------------

const triggerPipelineDeploy = () => deliveryTerminal?.runDemo() ?? false

const PRESET_ICONS = [
  // Azure Pipelines (cobalt cloud)
  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><polygon points="8,2 14,12.5 9.5,12.5 6.8,7.4 4.5,12.5 2,12.5" stroke="#3b8ef3" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  // GitHub Actions (amber branch)
  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="4.5" cy="4" r="1.6" stroke="#e8a238" stroke-width="1.3"/><circle cx="11.5" cy="5.5" r="1.6" stroke="#e8a238" stroke-width="1.3"/><circle cx="4.5" cy="12" r="1.6" stroke="#e8a238" stroke-width="1.3"/><path d="M4.5 5.6v4.8M4.5 9c0-2 7-1 7-1.9" stroke="#e8a238" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  // Ansible (copper matrix node)
  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="#e56b38" stroke-width="1.3"/><path d="M8 4.4 L10.7 11 L6.6 8.3" stroke="#e56b38" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
]

const renderPipelinePresets = () => {
  const wrap = $('#pipeline-presets')
  wrap.innerHTML = PIPELINE_PRESETS.map((p) => `
    <button class="wt-tab" role="tab" type="button" data-preset="${p.idx}" aria-selected="${p.idx === state.pipelinePreset}">
      <span class="wt-tab-icon">${PRESET_ICONS[p.idx] || ''}</span>
      <span class="wt-tab-text">${p.label}</span>
    </button>
  `).join('')

  wrap.querySelectorAll('.wt-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.preset)
      state.pipelinePreset = idx
      const p = PIPELINE_PRESETS[idx]
      wrap.querySelectorAll('.wt-tab').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.preset) === idx)))
      if (boards.PipelineConveyor) {
        boards.PipelineConveyor.set('preset', idx, true)
        boards.PipelineConveyor.set('stackLabel', p.stack)
        boards.PipelineConveyor.set('statusLabel', p.status)
        p.stages.forEach((name, i) => boards.PipelineConveyor.set(`s${i + 1}`, name, true))
      }
      deliveryTerminal?.setPreset(idx, { autoRun: true })
    })
  })
}

// Shared Morphing Sculpture + Vertical Spine Accordion Engine --------------
const closestIndex = (items, v) => {
  let best = 0
  let bestD = Infinity
  items.forEach((m, i) => {
    const d = Math.abs(m.value - v)
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

const makeSculptureController = ({ items, listSel, zoneSel, getBoard, valKey, idxKey }) => {
  let raf = 0

  const setActiveUI = (idx) => {
    state[idxKey] = Math.max(0, Math.min(items.length - 1, idx))
    const m = items[state[idxKey]]
    const board = getBoard()
    if (board) {
      board.set('readout', m.readout, true)
      board.set('unit', m.unit, true)
      board.set('caption', m.caption, true)
    }
    $$(`${listSel} .milestone-node`).forEach((row) => {
      row.classList.toggle('active', Number(row.dataset.ms) === state[idxKey])
    })
  }

  const setValueOnly = (v) => {
    state[valKey] = Math.max(0, Math.min(1, v))
    getBoard()?.set('value', state[valKey], true)
  }

  const animateTo = (target) => {
    cancelAnimationFrame(raf)
    const start = state[valKey]
    const t0 = performance.now()
    const dur = reducedMotion ? 0 : 420
    const tick = (now) => {
      const u = dur === 0 ? 1 : Math.min(1, (now - t0) / dur)
      const ease = 1 - Math.pow(1 - u, 3)
      setValueOnly(start + (target - start) * ease)
      if (u < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  const select = (idx) => {
    const nextIdx = Math.max(0, Math.min(items.length - 1, idx))
    setActiveUI(nextIdx)
    animateTo(items[nextIdx].value)
  }

  const setupDrag = () => {
    const zone = $(zoneSel)
    if (!zone) return
    let dragging = false
    const angleFromEvent = (e) => {
      const rect = zone.getBoundingClientRect()
      let deg = (Math.atan2(e.clientX - (rect.left + rect.width / 2), -(e.clientY - (rect.top + rect.height / 2))) * 180) / Math.PI
      deg = Math.max(-135, Math.min(135, deg))
      return (deg + 135) / 270
    }
    const scrub = (v) => {
      setValueOnly(v)
      setActiveUI(closestIndex(items, state[valKey]))
    }
    zone.addEventListener('pointerdown', (e) => {
      dragging = true
      zone.classList.add('dragging')
      zone.setPointerCapture(e.pointerId)
      cancelAnimationFrame(raf)
      getBoard()?.set('grabbed', 1, true)
      scrub(angleFromEvent(e))
    })
    zone.addEventListener('pointermove', (e) => { if (dragging) scrub(angleFromEvent(e)) })
    const stop = () => {
      dragging = false
      zone.classList.remove('dragging')
      getBoard()?.set('grabbed', 0, true)
    }
    zone.addEventListener('pointerup', stop)
    zone.addEventListener('pointercancel', stop)
  }

  const wireListClicks = () => {
    $$(`${listSel} .milestone-node`).forEach((row) => {
      row.addEventListener('click', () => select(Number(row.dataset.ms)))
    })
  }

  return { setActiveUI, setValueOnly, select, setupDrag, wireListClicks }
}

const trajCtrl = makeSculptureController({
  items: DIAL_MILESTONES,
  listSel: '#milestone-list',
  zoneSel: '#dial-drag-zone',
  getBoard: () => boards.MetricDial,
  valKey: 'dialValue',
  idxKey: 'activeMilestoneIdx',
})

const renderMilestoneBody = (m) => `
  <div class="mn-top">
    <span class="mn-year">${m.periodShort}</span>
    <span class="mn-domain">${m.readout}</span>
    <span class="mn-unit">${m.unit}</span>
  </div>
  <div class="mn-body">
    <div class="mn-role">${m.title}</div>
    <div class="mn-detail">${m.detail}</div>
    ${m.badges ? `
      <div class="cred-badge-row">
        ${m.badges.map((b) => `
          <span class="cred-pill">
            <img src="assets/icons/${b.icon}" alt="" width="14" height="14" loading="lazy" decoding="async">
            <span>${b.title}</span>
            <span class="cm-dot ${b.status === 'Certified' ? 'certified' : ''}" title="${b.status}"></span>
          </span>
        `).join('')}
      </div>
    ` : ''}
    ${m.items ? `
      <div class="cred-sub-list">
        ${m.items.map((sub) => `
          <div class="cred-sub-item">
            <span class="csi-period">${sub.period}</span>
            <div>
              <div class="csi-title">${sub.title}</div>
              <div class="csi-org">${sub.org}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>
`

const renderMilestones = () => {
  const list = $('#milestone-list')
  if (!list) return
  list.innerHTML = DIAL_MILESTONES.map((m, i) => `
    <li class="milestone-node" data-ms="${i}">
      <span class="mn-glyph" aria-hidden="true">${MILESTONE_GLYPHS[i] || MILESTONE_GLYPHS[0]}</span>
      <div class="mn-content">${renderMilestoneBody(m)}</div>
    </li>
  `).join('')

  trajCtrl.wireListClicks()
  trajCtrl.setActiveUI(state.activeMilestoneIdx)
}

// Background & Credentials 3D Isometric Strata + Credential Ledger ------------
const selectCredStage = (idx) => {
  state.activeCredIdx = Math.max(0, Math.min(CREDENTIAL_MILESTONES.length - 1, idx))
  const m = CREDENTIAL_MILESTONES[state.activeCredIdx]
  if (boards.CredentialStage) {
    boards.CredentialStage.set('active', state.activeCredIdx, true)
    boards.CredentialStage.set('readout', m.readout, true)
    boards.CredentialStage.set('unit', m.unit, true)
    boards.CredentialStage.set('caption', m.caption, true)
  }
  $$('#cred-milestone-list .cred-row').forEach((row) => {
    row.classList.toggle('active', Number(row.dataset.cred) === state.activeCredIdx)
  })
}

const getStrataPoses = (activeIdx) => CREDENTIAL_MILESTONES.map((_, k) => ({
  tx: k === activeIdx ? 16 : -4,
  ty: -6 + (k - 2.5) * 28 + (k < activeIdx ? -24 : k > activeIdx ? 24 : 0),
  sc: k === activeIdx ? 1.07 : 0.98,
}))

const hitTestStrataLayer = (e, canvas) => {
  const r = canvas.getBoundingClientRect()
  const ax = ((e.clientX - r.left) / r.width) * 360 - 180
  const ay = ((e.clientY - r.top) / r.height) * 380 - 190
  const poses = getStrataPoses(state.activeCredIdx)

  // Iterate top-to-bottom so upper visible glass plates take priority
  for (let k = 0; k < poses.length; k++) {
    const p = poses[k]
    const dist = Math.abs(ax - p.tx) / (92 * p.sc) + Math.abs(ay - (p.ty + 3)) / (34 * p.sc)
    if (dist <= 1.18) return { hit: k, ax, ay, poses }
  }
  return { hit: -1, ax, ay, poses }
}

const setupCredentialStrata = () => {
  const zone = $('#cred-strata-zone')
  const canvas = $('#canvas-credentials')
  if (!zone || !canvas) return

  zone.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1
    const { hit } = hitTestStrataLayer(e, canvas)
    boards.CredentialStage?.set('pointerX', nx, true)
    boards.CredentialStage?.set('pointerY', ny, true)
    boards.CredentialStage?.set('hover', hit >= 0 ? hit + 1 : 0, true)
  }, { passive: true })

  zone.addEventListener('pointerleave', () => {
    boards.CredentialStage?.set('pointerX', 0, true)
    boards.CredentialStage?.set('pointerY', 0, true)
    boards.CredentialStage?.set('hover', 0, true)
  })

  zone.addEventListener('click', (e) => {
    const { hit, ax, ay, poses } = hitTestStrataLayer(e, canvas)
    if (hit >= 0) {
      selectCredStage(hit)
      return
    }
    if (Math.abs(ax) <= 130 && ay >= -145 && ay <= 135) {
      let best = state.activeCredIdx
      let bestDist = Infinity
      poses.forEach((p, k) => {
        const d = Math.abs(ay - p.ty)
        if (d < bestDist) { bestDist = d; best = k }
      })
      selectCredStage(best)
    }
  })
}

const renderCredentials = () => {
  const list = $('#cred-milestone-list')
  if (!list) return
  list.innerHTML = CREDENTIAL_MILESTONES.map((m, i) => `
    <li class="cred-row" data-cred="${i}" style="--cred-accent:${m.accent}">
      <span class="cred-index" aria-hidden="true"><span>0${i + 1}</span></span>
      <div class="mn-content">${renderMilestoneBody(m)}</div>
    </li>
  `).join('')

  list.querySelectorAll('.cred-row').forEach((row) => {
    const idx = Number(row.dataset.cred)
    row.addEventListener('click', () => selectCredStage(idx))
    row.addEventListener('pointerenter', () => boards.CredentialStage?.set('hover', idx + 1, true))
    row.addEventListener('pointerleave', () => boards.CredentialStage?.set('hover', 0, true))
  })
  selectCredStage(state.activeCredIdx)
}

const makeTicker = (label) => {
  if (TECH_OVERRIDES[label]?.code) return TECH_OVERRIDES[label].code
  const paren = label.match(/\(([A-Z0-9+-]{2,5})\)/)
  if (paren) return paren[1]
  const clean = label.replace(/^(Azure|AWS|CompTIA|Linux|Cisco|Windows Server)\s+/i, '').trim()
  return clean.slice(0, 4).toUpperCase()
}

// Technical Stack Node-Link Astrolabe + Floating Multi-Panel Graph -----------
const renderStackPanels = () => {
  const stage = $('#stack-stage')
  const panels = $('#stack-panels')
  if (!stage || !panels) return

  if (state.domain === 0) {
    stage.classList.remove('is-open')
    stage.style.removeProperty('--stack-accent')
    panels.setAttribute('aria-hidden', 'true')
    panels.innerHTML = ''
    stackLinks?.update({ domain: 0, panelCount: 0 })
    return
  }

  const prevOpen = stage.classList.contains('is-open')
  const d = SKILL_DOMAINS[state.domain]
  const accent = DOMAIN_COLORS[state.domain] || '#e56b38'
  const cats = SKILL_CATEGORIES.filter((c) => c.domain === state.domain)
  const tech = state.selectedTech

  stage.style.setProperty('--stack-accent', accent)
  stage.classList.add('is-open')
  panels.setAttribute('aria-hidden', 'false')

  panels.innerHTML = `
    <div class="sp-banner">
      <div class="sp-title-wrap">
        <span class="sp-dot" aria-hidden="true"></span>
        <h3 class="sp-title">${d.name}</h3>
        <span class="sp-count">${cats.length} ${cats.length === 1 ? 'topic' : 'topics'}</span>
      </div>
      <button class="sp-close" type="button" aria-label="Close sector details">&times;</button>
    </div>

    <div class="sp-panel-list" data-count="${cats.length}">
      ${cats.map((cat, idx) => {
        const panelTech = tech && tech.category === cat.title ? tech : null
        const panelEra = panelTech?.eraRef ?? cat.eraRef ?? d.eraRef
        const panelEraShort = ERAS[panelEra].shortOrg
        return `
          <article class="sp-panel" data-panel-idx="${idx}" style="--panel-i:${idx}">
            <span class="sp-port sp-port-in" aria-hidden="true"></span>
            ${idx > 0 ? '<span class="sp-port sp-port-top" aria-hidden="true"></span>' : ''}
            ${idx < cats.length - 1 ? '<span class="sp-port sp-port-out" aria-hidden="true"></span>' : ''}

            <div class="sp-panel-head">
              <div class="sp-cat-label">
                <span class="sp-node-tag" aria-hidden="true"></span>
                <span class="sp-cat-title">${cat.title}</span>
              </div>
              <button class="tf-jump" type="button" data-jump-era="${panelEra}" title="Inspect in ${panelEraShort}">${panelEraShort} &rarr;</button>
            </div>

            <div class="skill-chip-list">
              ${cat.items.map((item) => `
                <button class="skill-chip" type="button" data-tech="${item}" data-cat-title="${cat.title}" data-cat-era="${cat.eraRef}" aria-pressed="${Boolean(tech && tech.name === item)}">${item}</button>
              `).join('')}
            </div>

            ${panelTech ? `
              <div class="sp-detail">
                <div class="sp-detail-head">
                  <strong>${panelTech.name}</strong>
                  <button class="tf-reset" type="button">Reset</button>
                </div>
                <p>${panelTech.note}</p>
              </div>
            ` : ''}
          </article>
        `
      }).join('')}
    </div>
  `

  panels.querySelector('.sp-close')?.addEventListener('click', (e) => {
    e.stopPropagation()
    selectDomain(0, null)
  })
  panels.querySelector('.tf-reset')?.addEventListener('click', (e) => {
    e.stopPropagation()
    selectDomain(state.domain, null)
  })
  panels.querySelectorAll('[data-jump-era]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const targetEra = Number(e.currentTarget.dataset.jumpEra)
      selectEra(targetEra)
      document.getElementById('architecture')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    })
  })
  panels.querySelectorAll('.skill-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation()
      const name = chip.dataset.tech
      const catTitle = chip.dataset.catTitle
      const catEra = Number(chip.dataset.catEra)
      const ov = TECH_OVERRIDES[name]
      if (state.selectedTech?.name === name) {
        selectDomain(state.domain, null)
      } else {
        selectDomain(state.domain, {
          name,
          category: catTitle,
          code: makeTicker(name),
          eraRef: ov?.eraRef ?? catEra,
          note: ov?.note ?? `Core capability inside ${catTitle} — deployed in production architectures at ${ERAS[ov?.eraRef ?? catEra].shortOrg}.`,
        })
      }
    })
  })
  panels.querySelectorAll('.sp-panel').forEach((panel) => {
    const idx = Number(panel.dataset.panelIdx)
    panel.addEventListener('mouseenter', () => stackLinks?.highlightPanel(idx))
    panel.addEventListener('mouseleave', () => stackLinks?.highlightPanel(null))
  })

  stackLinks?.update({ domain: state.domain, accent, panelCount: cats.length })
  stackLinks?.animateDuringTransition(prevOpen ? 360 : 600)
}

// 3. Synchronizers ------------------------------------------------------------

const selectEra = (idx) => {
  state.era = Math.max(0, Math.min(ERAS.length - 1, idx))
  state.serviceIdx = 4
  renderEraDetail()
  if (boards.TopologyStage) {
    boards.TopologyStage.set('era', state.era)
    boards.TopologyStage.fire('scan')
  }
}

const toggleFailover = (force) => {
  state.chaos = typeof force === 'number' ? force : (state.chaos > 0.5 ? 0 : 1)
  const btn = $('#btn-failover')
  btn.setAttribute('aria-pressed', String(state.chaos > 0.5))
  btn.textContent = state.chaos > 0.5 ? 'Restore Node' : 'Simulate Failover'
  if (boards.TopologyStage) {
    boards.TopologyStage.set('chaos', state.chaos)
  }
}

const selectDomain = (idx, techInfo = null) => {
  state.domain = Math.max(0, Math.min(6, idx))
  state.selectedTech = techInfo
  renderStackPanels()
  const d = SKILL_DOMAINS[state.domain]
  if (boards.SkillsOrbital) {
    boards.SkillsOrbital.set('domain', state.domain)
    boards.SkillsOrbital.set('hubCode', techInfo?.code || d.hubCode)
  }
}

// Live Herat Clock in Contact Beacon Meta -------------------------------------
const setupBeaconClock = () => {
  const el = $('#beacon-clock')
  if (!el) return
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kabul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const update = (force = false) => {
    if (!force && document.hidden) return
    try { el.textContent = `${fmt.format(new Date())} · UTC+4:30` } catch { el.textContent = 'UTC+4:30' }
  }
  update(true)
  setInterval(() => update(false), 30000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(true) })
}

// Smooth rAF Pointer Tracking + Hit-Testing + Popover Dismiss -----------------
const setupPointerTracking = () => {
  if (!reducedMotion) {
    let px = 0, py = 0, raf = 0
    const flush = () => {
      raf = 0
      const sf = boards.SignalField
      if (!sf || (sf.inView && !sf.inView())) return
      sf.set('pointerX', px, true)
      sf.set('pointerY', py, true)
    }
    window.addEventListener('pointermove', (e) => {
      px = (e.clientX / window.innerWidth) * 2 - 1
      py = (e.clientY / window.innerHeight) * 2 - 1
      if (!raf) raf = requestAnimationFrame(flush)
    }, { passive: true })
  }

  const bindLocalPointer = (canvasId, boardName) => {
    const c = $(canvasId)
    if (!c) return
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1
      boards[boardName]?.set('pointerX', nx, true)
      boards[boardName]?.set('pointerY', ny, true)
    }, { passive: true })
    c.addEventListener('pointerleave', () => {
      boards[boardName]?.set('pointerX', 0, true)
      boards[boardName]?.set('pointerY', 0, true)
    })
  }
  bindLocalPointer('#canvas-topology', 'TopologyStage')
  bindLocalPointer('#canvas-pipeline', 'PipelineConveyor')
  bindLocalPointer('#canvas-skills', 'SkillsOrbital')

  $('#canvas-topology').addEventListener('click', (e) => {
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    const ax = ((e.clientX - r.left) / r.width) * 1080 - 540
    const ay = ((e.clientY - r.top) / r.height) * 520 - 260
    const era = ERAS[state.era]
    let best = -1, bestDist = 92
    era.services.forEach((s, i) => {
      const d = Math.hypot(ax - s.x, ay - s.y)
      if (d < bestDist) { bestDist = d; best = i }
    })
    if (best >= 0) {
      state.serviceIdx = best
      renderServiceInspector()
      boards.TopologyStage?.fire('scan')
    }
  })

  // Close Technical Stack minimal floating box on outside click
  document.addEventListener('click', (e) => {
    if (state.domain === 0) return
    const stage = $('#stack-stage')
    if (stage && !stage.contains(e.target)) {
      selectDomain(0, null)
    }
  })
}

// Flash-Rive X-Ray Inspector Drawer (Hotkey: X) -------------------------------
const setXRay = (open) => {
  state.xrayOpen = open
  $('#xray-drawer').classList.toggle('open', open)
  $('#xray-drawer').setAttribute('aria-hidden', String(!open))
}

const populateXRay = () => {
  if (!contractData) return
  const b = contractData.build
  const kb = (b.bytes / 1024).toFixed(1)
  const mountedNames = ['SignalField', 'TopologyStage', 'PipelineConveyor', 'SkillsOrbital', 'MetricDial', 'CredentialStage']
  const activeEntries = mountedNames
    .filter((name) => contractData.artboards[name])
    .map((name) => [name, contractData.artboards[name]])
  const luauCount = activeEntries.filter(([, info]) => info.meta?.script).length

  $('#xray-summary').innerHTML = `
    <div class="xray-stat"><span>Binary Size</span><strong>${kb} KB</strong></div>
    <div class="xray-stat"><span>Active Boards</span><strong>${activeEntries.length} Live</strong></div>
    <div class="xray-stat"><span>Luau + SVGs</span><strong>${luauCount} Luau · 60 SVG</strong></div>
  `

  $('#xray-boards').innerHTML = activeEntries.map(([name, info]) => {
    const feats = info.meta?.features || []
    const controls = []
    if (name === 'TopologyStage') {
      controls.push(`<button class="xray-btn" data-xact="era-next">Next Era</button>`)
      controls.push(`<button class="xray-btn" data-xact="failover">Toggle Failover</button>`)
      controls.push(`<button class="xray-btn" data-xact="scan">Fire scan()</button>`)
    }
    if (name === 'PipelineConveyor') controls.push(`<button class="xray-btn" data-xact="deploy">Trigger Release</button>`)
    if (name === 'SkillsOrbital') controls.push(`<button class="xray-btn" data-xact="domain-next">Cycle Domain</button>`)
    if (name === 'MetricDial') controls.push(`<button class="xray-btn" data-xact="dial-sweep">Sweep Morph</button>`)
    if (name === 'CredentialStage') controls.push(`<button class="xray-btn" data-xact="cred-next">Cycle Pillar</button>`)

    return `
      <div class="xray-card">
        <div class="xray-card-head">
          <span class="xray-card-name">${name}</span>
          <span class="xray-card-dim">${info.width}&times;${info.height} · ${Object.keys(info.vm || {}).length} VM · ${Object.keys(info.inputs || {}).length} SM</span>
        </div>
        <div class="xray-feats">${feats.map((f) => `<span class="xray-feat">${f}</span>`).join('')}</div>
        ${controls.length ? `<div class="xray-controls">${controls.join('')}</div>` : ''}
      </div>
    `
  }).join('')

  $('#xray-boards').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-xact]')
    if (!btn) return
    const act = btn.dataset.xact
    if (act === 'era-next') selectEra((state.era + 1) % ERAS.length)
    if (act === 'failover') toggleFailover()
    if (act === 'scan') boards.TopologyStage?.fire('scan')
    if (act === 'deploy') triggerPipelineDeploy()
    if (act === 'domain-next') selectDomain((state.domain + 1) % 7, null)
    if (act === 'dial-sweep') {
      const nextIdx = state.activeMilestoneIdx === 0 ? DIAL_MILESTONES.length - 1 : 0
      trajCtrl.select(nextIdx)
    }
    if (act === 'cred-next') {
      selectCredStage((state.activeCredIdx + 1) % CREDENTIAL_MILESTONES.length)
    }
  })

  const logList = $('#xray-log')
  onTelemetry((entry) => {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const li = document.createElement('li')
    const cls = entry.kind === 'event' ? 't-event' : entry.kind === 'trigger' ? 't-trigger' : 't-vm'
    const extra = entry.value !== undefined
      ? ` = ${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}`
      : entry.detail && Object.keys(entry.detail).length ? ` ${JSON.stringify(entry.detail)}` : ''
    li.innerHTML = `<span>${t}</span> <span class="${cls}">[${entry.kind.toUpperCase()}]</span> ${entry.artboard}.${entry.name}${extra}`
    logList.prepend(li)
    while (logList.children.length > 40) logList.lastChild.remove()
  })
}

// Hero Portrait Click -> SignalField Background Square-Grid Wave -------------
const setupHeroPortraitWave = () => {
  const portrait = $('#portrait-medallion')
  const canvas = $('#canvas-field')
  if (!portrait || !canvas) return

  let waveSeq = 0
  let pulseTimer = 0
  const triggerWave = () => {
    if (!reducedMotion && boards.SignalField) {
      const pr = portrait.getBoundingClientRect()
      const cr = canvas.getBoundingClientRect()
      const cw = cr.width || 1400
      const ch = cr.height || 700
      // Project portrait center into SignalField's 1400x700 Cover-fitted coordinate space
      const s = Math.max(cw / 1400, ch / 700)
      const offX = (cw - 1400 * s) / 2
      const offY = (ch - 700 * s) / 2
      const localX = (pr.left + pr.width / 2 - cr.left - offX) / s - 700
      const localY = (pr.top + pr.height / 2 - cr.top - offY) / s - 350

      waveSeq += 1
      boards.SignalField.set('waveX', localX, true)
      boards.SignalField.set('waveY', localY, true)
      boards.SignalField.set('waveSeq', waveSeq, false)
    }

    portrait.classList.remove('is-pulsing')
    void portrait.offsetWidth
    portrait.classList.add('is-pulsing')
    clearTimeout(pulseTimer)
    pulseTimer = setTimeout(() => portrait.classList.remove('is-pulsing'), 520)
  }

  portrait.addEventListener('click', triggerWave)
  portrait.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      triggerWave()
    }
  })
}

// Boot ------------------------------------------------------------------------
const boot = async () => {
  const rivPromise = loadResumeRiv()

  renderEraTabs()
  renderEraDetail()
  renderPipelinePresets()
  deliveryTerminal = initDeliveryTerminal({
    presets: PIPELINE_PRESETS,
    getBoard: () => boards.PipelineConveyor,
    toast,
    onRunningChange: (running) => {
      const resetBtn = $('#btn-term-reset')
      if (resetBtn) resetBtn.disabled = running
    },
  })
  deliveryTerminal.setPreset(state.pipelinePreset)
  renderMilestones()
  renderCredentials()
  trajCtrl.setupDrag()
  setupCredentialStrata()
  setupBeaconClock()

  initPacmanScroll()
  setupHeroPortraitWave()
  initContactBeacon($('#canvas-contact-beacon'))
  stackLinks = initStackLinks({
    stageEl: $('#stack-stage'),
    canvasEl: $('#canvas-skills'),
    panelsEl: $('#stack-panels'),
    svgEl: $('#stack-links-svg'),
  })

  $$('[data-speed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = Number(btn.dataset.speed)
      state.traffic = v
      $$('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === v)))
      boards.TopologyStage?.set('traffic', v)
    })
  })
  $('#btn-failover').addEventListener('click', () => toggleFailover())
  $('#btn-scan').addEventListener('click', () => boards.TopologyStage?.fire('scan'))
  $('#btn-xray-close').addEventListener('click', () => setXRay(false))
  $('#btn-xray-clear').addEventListener('click', () => { $('#xray-log').innerHTML = '' })

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return
    const k = e.key.toLowerCase()
    if (k === 'x') setXRay(!state.xrayOpen)
    if (k === 'f') toggleFailover()
    if (k === 'd') triggerPipelineDeploy()
    if (['1', '2', '3', '4'].includes(k)) selectEra(Number(k) - 1)
    if (k === 'escape') {
      if (state.xrayOpen) setXRay(false)
      else if (state.domain !== 0) selectDomain(0, null)
    }
  })

  try {
    const loaded = await rivPromise
    contractData = loaded.contract
    populateXRay()

    const mountOne = async ([name, sel, opts]) => {
      const canvas = $(sel)
      if (!canvas) return
      const handle = await mountBoard(canvas, name, opts)
      boards[name] = handle
      canvas.classList.add('rive-ready')
      if (reducedMotion && name === 'SignalField') handle.pause()
    }

    // Mount above-the-fold Hero SignalField first for instant Hero live render, then remaining 5 concurrently
    await mountOne(['SignalField', '#canvas-field', { fit: 'Cover', disableListeners: true }])

    await Promise.all([
      ['TopologyStage', '#canvas-topology', { fit: 'Contain' }],
      ['PipelineConveyor', '#canvas-pipeline', { fit: 'Contain' }],
      ['SkillsOrbital', '#canvas-skills', { fit: 'Contain' }],
      ['MetricDial', '#canvas-dial', { fit: 'Contain' }],
      ['CredentialStage', '#canvas-credentials', { fit: 'Contain' }],
    ].map(mountOne))

    boards.PipelineConveyor?.on('pipeline_run', () => {
      if (triggerPipelineDeploy()) toast('Simulated release started')
    })

    boards.SkillsOrbital?.on('*', (data) => {
      const dom = data.properties?.domain
      if (typeof dom === 'number') {
        selectDomain(dom, null)
      }
    })

    selectEra(0)
    boards.TopologyStage?.set('traffic', state.traffic, true)
    trajCtrl.setValueOnly(state.dialValue)
    trajCtrl.setActiveUI(state.activeMilestoneIdx)
    selectCredStage(state.activeCredIdx)
    selectDomain(0, null)
    setupPointerTracking()

    window.__FLASH_RIVE__ = { boards: getMountedBoards(), contract: contractData }
  } catch (err) {
    console.error(err)
    toast(`Rive runtime error: ${err.message}`)
  }
}

boot()
