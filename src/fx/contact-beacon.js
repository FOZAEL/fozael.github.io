// High-DPI 2D Dotted Fibonacci Geodesic Orbital Globe + Gyroscopic Rings + Signal Arcs.
// Optimized for runtime speed: precomputes static 3D geometry at init, caches gradients and bounding rect,
// batches Canvas 2D draw calls (~25/frame vs ~750/frame), and pauses rAF when scrolled offscreen or hidden.

const DEG = Math.PI / 180
const ARC_SEGS = 30
const RING_SEGS = 56
const ORBIT_SEGS = 64

const latLonToXYZ = (latDeg, lonDeg) => {
  const lat = latDeg * DEG
  const lon = lonDeg * DEG
  const cl = Math.cos(lat)
  return [cl * Math.sin(lon), -Math.sin(lat), cl * Math.cos(lon)]
}

const projectPoint = (p, cyaw, syaw, cp, sp, cx, cy, R) => {
  const x1 = p[0] * cyaw + p[2] * syaw
  const z1 = -p[0] * syaw + p[2] * cyaw
  const y2 = p[1] * cp - z1 * sp
  const z2 = p[1] * sp + z1 * cp
  return { x: cx + x1 * R, y: cy + y2 * R, z: z2 }
}

const buildArcArray = (a, b, liftMax) => {
  const pts = new Float32Array((ARC_SEGS + 1) * 3)
  const dot = Math.max(-0.999, Math.min(0.999, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const om = Math.acos(dot)
  const sinOm = Math.sin(om) || 1e-4
  for (let s = 0; s <= ARC_SEGS; s++) {
    const t = s / ARC_SEGS
    const wa = Math.sin((1 - t) * om) / sinOm
    const wb = Math.sin(t * om) / sinOm
    const x = a[0] * wa + b[0] * wb
    const y = a[1] * wa + b[1] * wb
    const z = a[2] * wa + b[2] * wb
    const len = Math.hypot(x, y, z) || 1
    const h = 1 + Math.sin(Math.PI * t) * liftMax
    pts[s * 3] = (x / len) * h
    pts[s * 3 + 1] = (y / len) * h
    pts[s * 3 + 2] = (z / len) * h
  }
  return pts
}

const buildFibonacciSphere = (count) => {
  const pts = new Float32Array(count * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    pts[i * 3] = Math.cos(theta) * r
    pts[i * 3 + 1] = y
    pts[i * 3 + 2] = Math.sin(theta) * r
  }
  return pts
}

const buildMeridians = () => {
  const loops = []
  for (let m = 0; m < 2; m++) {
    const arr = new Float32Array(RING_SEGS * 3)
    for (let i = 0; i < RING_SEGS; i++) {
      const a = (i / RING_SEGS) * Math.PI * 2
      const ca = Math.cos(a), sa = Math.sin(a)
      arr[i * 3] = ca
      arr[i * 3 + 1] = m === 0 ? 0 : sa
      arr[i * 3 + 2] = m === 0 ? sa : 0
    }
    loops.push(arr)
  }
  return loops
}

const buildOrbitLoop = (radius, tiltX) => {
  const arr = new Float32Array(ORBIT_SEGS * 3)
  const st = Math.sin(tiltX), ct = Math.cos(tiltX)
  for (let i = 0; i < ORBIT_SEGS; i++) {
    const u = (i / ORBIT_SEGS) * Math.PI * 2
    const cu = Math.cos(u) * radius
    const su = Math.sin(u) * radius
    arr[i * 3] = cu
    arr[i * 3 + 1] = su * st
    arr[i * 3 + 2] = su * ct
  }
  return arr
}

export const initContactBeacon = (canvas) => {
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const FIB_COUNT = 320
  let dpr = Math.min(window.devicePixelRatio || 1, 2)
  let width = 400
  let height = 360
  let cx = 200
  let cy = 180
  let R = 122
  let haloGrad = null
  let canvasRect = canvas.getBoundingClientRect()

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    canvasRect = r
    width = Math.max(220, r.width || 400)
    height = Math.max(200, r.height || 360)
    cx = width * 0.5
    cy = height * 0.5
    R = Math.min(width, height) * 0.34
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)

    haloGrad = ctx.createRadialGradient(cx, cy, R * 0.18, cx, cy, R * 1.48)
    haloGrad.addColorStop(0, 'rgba(59, 142, 243, 0.06)')
    haloGrad.addColorStop(0.58, 'rgba(229, 107, 56, 0.032)')
    haloGrad.addColorStop(1, 'rgba(9, 10, 13, 0)')
  }
  resize()

  const AUTO_SPIN_SPEED = 0.15
  const DRAG_SENS = 0.0085
  const PITCH_LIMIT = 1.25
  const CLICK_TRAVEL_MAX = 5
  const CLICK_IMPULSE = 3.0
  const DAMP_RATE = 3.4
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  let yaw = -0.88
  let pitch = 0.26
  let velYaw = 0
  let velPitch = 0
  let dragging = false
  let activePointerId = null
  let lastPtrX = 0
  let lastPtrY = 0
  let dragTravel = 0
  let lastMoveTime = 0
  let lastFrameTime = performance.now()

  const syncDataset = () => {
    canvas.dataset.yaw = yaw.toFixed(2)
    canvas.dataset.pitch = pitch.toFixed(2)
  }
  syncDataset()

  let render = () => {}

  const onPointerMove = (e) => {
    if (!dragging || (activePointerId !== null && e.pointerId !== activePointerId)) return
    const dx = e.clientX - lastPtrX
    const dy = e.clientY - lastPtrY
    lastPtrX = e.clientX
    lastPtrY = e.clientY
    dragTravel += Math.hypot(dx, dy)

    const dYaw = dx * DRAG_SENS
    const dPitch = -dy * DRAG_SENS
    yaw += dYaw
    pitch = clamp(pitch + dPitch, -PITCH_LIMIT, PITCH_LIMIT)

    const moveNow = performance.now()
    const moveDt = clamp((moveNow - lastMoveTime) * 0.001, 0.008, 0.05)
    lastMoveTime = moveNow
    velYaw = clamp(velYaw * 0.45 + (dYaw / moveDt) * 0.55, -10, 10)
    velPitch = clamp(velPitch * 0.45 + (dPitch / moveDt) * 0.55, -8, 8)
    syncDataset()

    if (reduced) render(moveNow)
  }

  let onPointerUp
  let onPointerCancel

  const detachDragListeners = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }

  const endDrag = (e, isCancel) => {
    if (!dragging || (activePointerId !== null && e && e.pointerId !== activePointerId)) return
    dragging = false
    canvas.classList.remove('dragging')
    detachDragListeners()
    if (activePointerId !== null) {
      try {
        if (canvas.hasPointerCapture(activePointerId)) canvas.releasePointerCapture(activePointerId)
      } catch {}
      activePointerId = null
    }

    if (!isCancel && e) {
      if (dragTravel < CLICK_TRAVEL_MAX) {
        const relX = ((e.clientX - canvasRect.left) / (canvasRect.width || 1)) * 2 - 1
        const dir = relX >= 0.12 ? -1 : 1
        if (reduced) {
          yaw += dir * 0.6
          syncDataset()
          render(performance.now())
          return
        }
        velYaw = dir * CLICK_IMPULSE
        velPitch = 0
      } else if (performance.now() - lastMoveTime > 90) {
        velYaw = 0
        velPitch = 0
      }
    }
    syncDataset()
  }

  onPointerUp = (e) => endDrag(e, false)
  onPointerCancel = (e) => endDrag(e, true)

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    canvasRect = canvas.getBoundingClientRect()
    dragging = true
    activePointerId = e.pointerId
    lastPtrX = e.clientX
    lastPtrY = e.clientY
    dragTravel = 0
    lastMoveTime = performance.now()
    velYaw = 0
    velPitch = 0
    canvas.classList.add('dragging')
    try { canvas.setPointerCapture(e.pointerId) } catch {}
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  canvas.addEventListener('pointerdown', onPointerDown)

  // Precomputed 3D static geometry & projection scratch arrays
  const fibNodes = buildFibonacciSphere(FIB_COUNT)
  const fibX = new Float32Array(FIB_COUNT)
  const fibY = new Float32Array(FIB_COUNT)
  const fibR = new Float32Array(FIB_COUNT)
  const fibBucket = new Uint8Array(FIB_COUNT)
  const meridians = buildMeridians()
  const herat = latLonToXYZ(34.35, 62.20)

  const remotes = [
    { tag: 'US', pt: latLonToXYZ(39.04, -77.48), color: [59, 142, 243], speed: 0.25, offset: 0.0, arcPts: null },
    { tag: 'US-W', pt: latLonToXYZ(37.77, -122.41), color: [104, 173, 255], speed: 0.20, offset: 0.52, arcPts: null },
    { tag: 'EU', pt: latLonToXYZ(50.11, 8.68), color: [45, 196, 146], speed: 0.23, offset: 0.28, arcPts: null },
    { tag: 'SG', pt: latLonToXYZ(1.35, 103.82), color: [232, 162, 56], speed: 0.28, offset: 0.74, arcPts: null },
  ]
  const lifts = [0.26, 0.30, 0.20, 0.22]
  remotes.forEach((rem, idx) => { rem.arcPts = buildArcArray(herat, rem.pt, lifts[idx]) })

  const orbitSpecs = [
    { radius: 1.24, tiltX: 0.38, speed: 0.24, color: [229, 107, 56], satOffset: 0.15, loop: buildOrbitLoop(1.24, 0.38) },
    { radius: 1.33, tiltX: -0.46, speed: -0.18, color: [59, 142, 243], satOffset: 0.62, loop: buildOrbitLoop(1.33, -0.46) },
    { radius: 1.15, tiltX: 0.92, speed: 0.14, color: [242, 237, 228], satOffset: 0.40, loop: buildOrbitLoop(1.15, 0.92) },
  ]

  const projIdx = (arr, idx, cyaw, syaw, cp, sp) => {
    const px = arr[idx], py = arr[idx + 1], pz = arr[idx + 2]
    const x1 = px * cyaw + pz * syaw
    const z1 = -px * syaw + pz * cyaw
    const y2 = py * cp - z1 * sp
    const z2 = py * sp + z1 * cp
    return [cx + x1 * R, cy + y2 * R, z2]
  }

  const start = performance.now()
  let raf = 0
  let cleaned = false
  const rectInit = canvasRect
  let inView = rectInit.bottom >= -140 && rectInit.top <= window.innerHeight + 140

  render = (now) => {
    raf = 0
    const dt = clamp((now - lastFrameTime) * 0.001, 0, 0.05)
    lastFrameTime = now
    const t = reduced ? 0 : (now - start) * 0.001

    if (!dragging) {
      if (!reduced) yaw += (AUTO_SPIN_SPEED + velYaw) * dt
      else if (velYaw !== 0) yaw += velYaw * dt

      if (velPitch !== 0) pitch = clamp(pitch + velPitch * dt, -PITCH_LIMIT, PITCH_LIMIT)

      if (velYaw !== 0 || velPitch !== 0) {
        const damp = Math.exp(-DAMP_RATE * dt)
        velYaw *= damp
        velPitch *= damp
        if (Math.abs(velYaw) < 0.002) velYaw = 0
        if (Math.abs(velPitch) < 0.002) velPitch = 0
        syncDataset()
      }
    }

    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    if (haloGrad) {
      ctx.fillStyle = haloGrad
      ctx.fillRect(0, 0, width, height)
    }

    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(242, 237, 228, 0.12)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Equator & Prime Meridian batched into 2 stroke calls (front vs back)
    ctx.lineWidth = 0.8
    const merFront = new Path2D()
    const merBack = new Path2D()
    for (const loop of meridians) {
      for (let i = 0; i < RING_SEGS; i++) {
        const j = (i + 1) % RING_SEGS
        const p0 = projIdx(loop, i * 3, cyaw, syaw, cp, sp)
        const p1 = projIdx(loop, j * 3, cyaw, syaw, cp, sp)
        const target = (p0[2] + p1[2]) > 0 ? merFront : merBack
        target.moveTo(p0[0], p0[1])
        target.lineTo(p1[0], p1[1])
      }
    }
    ctx.strokeStyle = 'rgba(242, 237, 228, 0.025)'
    ctx.stroke(merBack)
    ctx.strokeStyle = 'rgba(242, 237, 228, 0.11)'
    ctx.stroke(merFront)

    // 320 Fibonacci sphere lattice nodes batched into 4 depth buckets + 1 copper accent bucket
    for (let i = 0; i < FIB_COUNT; i++) {
      const i3 = i * 3
      const px = fibNodes[i3], py = fibNodes[i3 + 1], pz = fibNodes[i3 + 2]
      const x1 = px * cyaw + pz * syaw
      const z1 = -px * syaw + pz * cyaw
      const y2 = py * cp - z1 * sp
      const z2 = py * sp + z1 * cp
      const depth = (z2 + 1) * 0.5
      fibX[i] = cx + x1 * R
      fibY[i] = cy + y2 * R
      fibR[i] = 0.82 + depth * 0.86
      if (i % 19 === 0 && depth > 0.55) fibBucket[i] = 4
      else if (depth < 0.28) fibBucket[i] = 0
      else if (depth < 0.54) fibBucket[i] = 1
      else if (depth < 0.78) fibBucket[i] = 2
      else fibBucket[i] = 3
    }
    const bucketStyles = [
      'rgba(242, 237, 228, 0.11)',
      'rgba(242, 237, 228, 0.25)',
      'rgba(242, 237, 228, 0.45)',
      'rgba(242, 237, 228, 0.67)',
      'rgba(229, 107, 56, 0.62)',
    ]
    for (let b = 0; b < 5; b++) {
      ctx.beginPath()
      for (let i = 0; i < FIB_COUNT; i++) {
        if (fibBucket[i] !== b) continue
        const x = fibX[i], y = fibY[i], r = fibR[i]
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      ctx.fillStyle = bucketStyles[b]
      ctx.fill()
    }

    // 3 Precessing Gyroscopic Orbital Tracks (batched front/back paths) & Satellite Pips
    ctx.lineWidth = 0.95
    for (const orb of orbitSpecs) {
      const [cr, cg, cb] = orb.color
      const oy = yaw * 0.45 + t * orb.speed * 0.5
      const ocy = Math.cos(oy), osy = Math.sin(oy)
      const orbFront = new Path2D()
      const orbBack = new Path2D()
      for (let i = 0; i < ORBIT_SEGS; i++) {
        const j = (i + 1) % ORBIT_SEGS
        const p0 = projIdx(orb.loop, i * 3, ocy, osy, cp, sp)
        const p1 = projIdx(orb.loop, j * 3, ocy, osy, cp, sp)
        const target = (p0[2] + p1[2]) > 0 ? orbFront : orbBack
        target.moveTo(p0[0], p0[1])
        target.lineTo(p1[0], p1[1])
      }
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.05)`
      ctx.stroke(orbBack)
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.24)`
      ctx.stroke(orbFront)

      const satU = (t * orb.speed + orb.satOffset) * Math.PI * 2
      const sat3 = [Math.cos(satU) * orb.radius, Math.sin(satU) * orb.radius * Math.sin(orb.tiltX), Math.sin(satU) * orb.radius * Math.cos(orb.tiltX)]
      const satP = projectPoint(sat3, ocy, osy, cp, sp, cx, cy, R)
      if (satP.z > -0.3) {
        ctx.beginPath()
        ctx.arc(satP.x, satP.y, 2.3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.9)`
        ctx.fill()
      }
    }

    // 4 Elevated Great-Circle Constellation Arcs (precomputed curves + batched front/back)
    ctx.font = '500 8.5px "JetBrains Mono", monospace'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 1.2
    for (const rem of remotes) {
      const [cr, cg, cb] = rem.color
      const pts = rem.arcPts
      const arcFront = new Path2D()
      const arcBack = new Path2D()
      let prev = projIdx(pts, 0, cyaw, syaw, cp, sp)
      for (let s = 1; s <= ARC_SEGS; s++) {
        const cur = projIdx(pts, s * 3, cyaw, syaw, cp, sp)
        const target = (prev[2] + cur[2]) * 0.5 > -0.05 ? arcFront : arcBack
        target.moveTo(prev[0], prev[1])
        target.lineTo(cur[0], cur[1])
        prev = cur
      }
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.10)`
      ctx.stroke(arcBack)
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.48)`
      ctx.stroke(arcFront)

      const endP = projectPoint(rem.pt, cyaw, syaw, cp, sp, cx, cy, R)
      if (endP.z > 0.05) {
        ctx.beginPath()
        ctx.arc(endP.x, endP.y, 2.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.92)`
        ctx.fill()

        ctx.fillStyle = `rgba(242, 237, 228, ${(Math.min(1, endP.z * 1.4) * 0.72).toFixed(2)})`
        ctx.fillText(rem.tag, endP.x + 6, endP.y)
      }

      const uHead = (t * rem.speed + rem.offset) % 1
      for (let tail = 3; tail >= 0; tail--) {
        const ut = Math.max(0, uHead - tail * 0.025)
        const fs = ut * ARC_SEGS
        const s0 = Math.min(ARC_SEGS - 1, fs | 0)
        const frac = fs - s0
        const i0 = s0 * 3
        const i1 = i0 + 3
        const ax = pts[i0] + (pts[i1] - pts[i0]) * frac
        const ay = pts[i0 + 1] + (pts[i1 + 1] - pts[i0 + 1]) * frac
        const az = pts[i0 + 2] + (pts[i1 + 2] - pts[i0 + 2]) * frac
        const pkt = projectPoint([ax, ay, az], cyaw, syaw, cp, sp, cx, cy, R)
        if (pkt.z > -0.15) {
          const rad = tail === 0 ? 3.0 : Math.max(1.0, 2.6 - tail * 0.55)
          const alpha = tail === 0 ? 0.95 : 0.65 - tail * 0.16
          ctx.beginPath()
          ctx.arc(pkt.x, pkt.y, rad, 0, Math.PI * 2)
          ctx.fillStyle = tail === 0 ? `rgba(242, 237, 228, ${alpha})` : `rgba(${cr}, ${cg}, ${cb}, ${alpha.toFixed(2)})`
          ctx.fill()
        }
      }
    }

    // Herat origin node + dual staggered sonar pulse
    const hProj = projectPoint(herat, cyaw, syaw, cp, sp, cx, cy, R)
    if (hProj.z > -0.25) {
      for (let p = 0; p < 2; p++) {
        const phase = (t * 0.55 + p * 0.5) % 1
        ctx.beginPath()
        ctx.arc(hProj.x, hProj.y, 4 + phase * 16, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(229, 107, 56, ${(0.52 * (1 - phase)).toFixed(3)})`
        ctx.lineWidth = 1.15
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(hProj.x, hProj.y, 3.8, 0, Math.PI * 2)
      ctx.fillStyle = '#e56b38'
      ctx.fill()

      if (hProj.z > 0.1) {
        ctx.fillStyle = 'rgba(244, 133, 86, 0.9)'
        ctx.fillText('AF', hProj.x + 7, hProj.y)
      }
    }

    if (!cleaned && !reduced && !document.hidden && inView) {
      raf = requestAnimationFrame(render)
    }
  }

  const syncRun = () => {
    if (cleaned || reduced) return
    const shouldRun = !document.hidden && inView
    if (shouldRun && !raf) {
      lastFrameTime = performance.now()
      raf = requestAnimationFrame(render)
    } else if (!shouldRun && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  const ro = new ResizeObserver(() => {
    resize()
    if (!raf) render(performance.now())
  })
  ro.observe(canvas)

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === canvas) {
          inView = entry.isIntersecting
          syncRun()
        }
      }
    },
    { rootMargin: '140px 0px' },
  )
  io.observe(canvas)
  document.addEventListener('visibilitychange', syncRun)

  // Always draw 1 initial frame immediately, then gate ongoing rAF by inView
  render(performance.now())
  syncRun()

  return () => {
    cleaned = true
    cancelAnimationFrame(raf)
    raf = 0
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', syncRun)
    canvas.removeEventListener('pointerdown', onPointerDown)
    detachDragListeners()
    canvas.classList.remove('dragging')
  }
}
