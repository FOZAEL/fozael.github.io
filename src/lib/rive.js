// Rive WebGL2 mount helper with shared RiveFile parsing, viewport/visibility gating,
// live contract verification, and X-Ray telemetry hooks.
// Parses rive/resume.riv once and shares the decoded RiveFile across all 6 artboards,
// automatically pausing offscreen boards so idle GPU/CPU usage drops near zero.

let filePromise = null
const registry = new Map()
const telemetryListeners = new Set()

const R = () => window.rive

export const onTelemetry = (fn) => {
  telemetryListeners.add(fn)
  return () => telemetryListeners.delete(fn)
}

const emitTelemetry = (entry) => {
  for (const fn of telemetryListeners) {
    try { fn(entry) } catch {}
  }
}

export const getMountedBoards = () => registry

export const loadResumeRiv = (base = 'rive/') => {
  if (!filePromise) {
    filePromise = (async () => {
      const rt = R()
      if (!rt) throw new Error('Rive WebGL2 runtime failed to load')
      if (rt.Rive) rt.Rive.suppressDeprecationWarnings = ['state-machines-param', 'rive-events', 'state-machine-inputs']
      rt.RuntimeLoader.setWasmUrl(new URL('runtime/rive.wasm', location.href).href)
      if (rt.RuntimeLoader.setWasmFallbackUrl) rt.RuntimeLoader.setWasmFallbackUrl(null)
      const [buffer, contract] = await Promise.all([
        fetch(base + 'resume.riv').then((r) => {
          if (!r.ok) throw new Error(`resume.riv HTTP ${r.status}`)
          return r.arrayBuffer()
        }),
        fetch(base + 'contract.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      ])
      let riveFile = null
      if (rt.RiveFile) {
        try {
          const rf = new rt.RiveFile({ buffer, enableRiveAssetCDN: false })
          await rf.init()
          riveFile = rf
        } catch {
          riveFile = null
        }
      }
      return { buffer, riveFile, contract }
    })()
  }
  return filePromise
}

export const mountBoard = async (canvas, artboard, opts = {}) => {
  const { buffer, riveFile, contract } = await loadResumeRiv()
  const rt = R()
  const spec = contract.artboards?.[artboard] || { vm: {}, inputs: {}, events: [] }
  const handlers = new Map()
  const liveValues = {}

  const instance = await new Promise((resolve, reject) => {
    let r
    const timer = setTimeout(() => reject(new Error(`Rive artboard ${artboard} timed out`)), 10000)
    try {
      r = new rt.Rive({
        canvas,
        ...(riveFile ? { riveFile } : { buffer: buffer.slice(0) }),
        artboard,
        stateMachine: opts.stateMachine || 'Main',
        autoplay: opts.autoplay !== false,
        autoBind: true,
        useOffscreenRenderer: true,
        enableRiveAssetCDN: false,
        shouldDisableRiveListeners: opts.disableListeners === true,
        layout: new rt.Layout({
          fit: rt.Fit[opts.fit || 'Contain'],
          alignment: rt.Alignment[opts.alignment || 'Center'],
        }),
        onLoad: () => {
          clearTimeout(timer)
          r.resizeDrawingSurfaceToCanvas()
          resolve(r)
        },
        onLoadError: (e) => {
          clearTimeout(timer)
          reject(new Error(`Artboard ${artboard}: ${e?.data || e}`))
        },
      })
    } catch (err) {
      clearTimeout(timer)
      reject(err)
    }
  })

  instance.on(rt.EventType.RiveEvent, (event) => {
    const data = event.data || {}
    emitTelemetry({ kind: 'event', artboard, name: data.name || 'event', detail: data.properties || {} })
    const fns = handlers.get(data.name)
    if (fns) for (const fn of fns) fn(data)
    const any = handlers.get('*')
    if (any) for (const fn of any) fn(data)
  })

  const checkInView = () => {
    const r = canvas.getBoundingClientRect()
    return r.bottom >= -180 && r.top <= window.innerHeight + 180
  }

  let inView = checkInView()
  let manualPaused = opts.autoplay === false
  let isPlaying = opts.autoplay !== false
  let wakeTimer = null
  let cleanedUp = false

  const syncPlayback = () => {
    if (cleanedUp) return
    const shouldPlay = !manualPaused && !document.hidden && (inView || wakeTimer !== null)
    if (shouldPlay && !isPlaying) {
      isPlaying = true
      try { instance.play() } catch {}
    } else if (!shouldPlay && isPlaying) {
      isPlaying = false
      try { instance.pause() } catch {}
    }
  }

  const wakeBriefly = (ms = 380) => {
    if (cleanedUp || manualPaused || document.hidden) return
    clearTimeout(wakeTimer)
    wakeTimer = setTimeout(() => {
      wakeTimer = null
      syncPlayback()
    }, ms)
    syncPlayback()
  }

  // Allow initial pose frame to draw cleanly, then pause automatically if offscreen
  requestAnimationFrame(() => {
    inView = checkInView()
    syncPlayback()
  })

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === canvas) {
          inView = entry.isIntersecting
          syncPlayback()
        }
      }
    },
    { rootMargin: '180px 0px' },
  )
  io.observe(canvas)
  document.addEventListener('visibilitychange', syncPlayback)

  const vm = instance.viewModelInstance || null
  const inputs = () => instance.stateMachineInputs(opts.stateMachine || 'Main') || []
  const input = (name) => inputs().find((i) => i.name === name)

  const vmProp = (name, type) => {
    if (!vm) return null
    try {
      switch (type) {
        case 'number': return vm.number(name)
        case 'string': return vm.string(name)
        case 'boolean': case 'bool': return vm.boolean(name)
        case 'color': return vm.color(name)
        case 'trigger': return vm.trigger(name)
        default: return vm.number(name) || vm.string(name) || vm.boolean(name)
      }
    } catch { return null }
  }

  // Seed live value snapshot from VM defaults
  for (const [k, t] of Object.entries(spec.vm || {})) {
    const p = vmProp(k, t)
    if (p) liveValues[k] = p.value
  }

  const handle = {
    artboard,
    rive: instance,
    vm,
    spec,
    liveValues,
    isPlaying: () => isPlaying,
    inView: () => inView,
    set(name, value, silent = false) {
      const type = spec.vm?.[name]
      if (type || (!spec.inputs?.[name] && vm)) {
        const p = vmProp(name, type)
        if (p) {
          p.value = value
          liveValues[name] = value
          if (!isPlaying && !manualPaused) wakeBriefly(380)
          if (!silent) emitTelemetry({ kind: 'vm', artboard, name, value })
          return true
        }
      }
      const i = input(name)
      if (i) {
        i.value = value
        liveValues[name] = value
        if (!isPlaying && !manualPaused) wakeBriefly(380)
        if (!silent) emitTelemetry({ kind: 'input', artboard, name, value })
        return true
      }
      return false
    },
    get(name) {
      const p = vmProp(name, spec.vm?.[name])
      if (p) return p.value
      const i = input(name)
      return i ? i.value : liveValues[name]
    },
    fire(name) {
      const i = input(name)
      if (i && i.fire) {
        i.fire()
        if (!isPlaying && !manualPaused) wakeBriefly(380)
        emitTelemetry({ kind: 'trigger', artboard, name })
        return true
      }
      const p = vmProp(name, 'trigger')
      if (p) {
        p.trigger()
        if (!isPlaying && !manualPaused) wakeBriefly(380)
        emitTelemetry({ kind: 'trigger', artboard, name })
        return true
      }
      return false
    },
    on(name, fn) {
      if (!handlers.has(name)) handlers.set(name, new Set())
      handlers.get(name).add(fn)
      return () => handlers.get(name).delete(fn)
    },
    pause() {
      manualPaused = true
      clearTimeout(wakeTimer)
      wakeTimer = null
      syncPlayback()
    },
    play() {
      manualPaused = false
      syncPlayback()
    },
    resize() { try { instance.resizeDrawingSurfaceToCanvas() } catch {} },
    cleanup() {
      cleanedUp = true
      clearTimeout(wakeTimer)
      wakeTimer = null
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', syncPlayback)
      registry.delete(artboard)
      try { instance.cleanup() } catch {}
    },
  }

  const ro = new ResizeObserver(() => handle.resize())
  ro.observe(canvas)
  registry.set(artboard, handle)
  return handle
}
