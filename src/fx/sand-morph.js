// Scroll-driven Sand Morph Engine (Hero Clear Portrait -> Single Cloud Silhouette Stop):
// - Starts at scroll=0 as a crystal-clear studio portrait inside #portrait-medallion (uSandAlpha = 0).
// - Reuses already-loaded #portrait-clear image, caches layout geometry off-frame, and stops rAF
//   completely whenever settled idle at Hero (sandAlpha = 0) or scrolled past #architecture.

const PARTICLE_COUNT = 7200

const VS_SRC = `#version 300 es
in vec2 aT0;     // portrait normalized (-0.5..+0.5)
in vec2 aT1;     // cloud + racks shape normalized (-0.5..+0.5)
in vec4 aMeta;   // lum, gold, seed, scatterAngle
in vec2 aExtra;  // scatterRadius, sizeBase

uniform float uFrac;
uniform float uSandAlpha;
uniform float uTime;
uniform float uDpr;
uniform vec2 uViewport;
uniform vec4 uBounds0;
uniform vec4 uBounds1;
uniform float uReduced;

out float vLum;
out float vGold;
out float vSeed;
out float vShapeMix;
out float vScatter;
out float vSandAlpha;

void main() {
  float seed = aMeta.z;
  float frac = clamp(uFrac, 0.0, 1.0);
  float tRaw = clamp((frac - seed * 0.24) / 0.76, 0.0, 1.0);
  float t = smoothstep(0.0, 1.0, tRaw);

  vec2 p0 = uBounds0.xy + (aT0 + 0.5) * uBounds0.zw;
  vec2 p1 = uBounds1.xy + (aT1 + 0.5) * uBounds1.zw;
  vec2 pos = mix(p0, p1, t);

  // Wind-blown sand dispersion mid-transition
  float wave = sin(3.14159265 * t) * (1.0 - uReduced);
  float ang = aMeta.w + wave * (1.8 + seed * 1.4);
  float sRad = aExtra.x * wave;
  float windDrift = (180.0 + seed * 120.0) * wave * (sin(seed * 27.3 + uTime * 0.8) * 0.35 + 0.65);
  pos += vec2(cos(ang) * sRad + windDrift, sin(ang) * sRad * 0.85 - wave * 34.0);

  float shapeMix = smoothstep(0.08, 0.85, frac);

  // Subtle autonomous mineral grain tremble when settled (zero mouse-hover wake)
  if (uReduced < 0.5) {
    float settle = 1.0 - wave;
    float b1 = sin(uTime * 0.74 + seed * 83.1 + pos.y * 0.031);
    float b2 = cos(uTime * 0.55 + seed * 47.7 + pos.x * 0.027);
    float b3 = sin(uTime * 1.22 - seed * 119.3 + pos.x * 0.019);

    float portraitDx = sin(uTime * 1.15 + seed * 48.0) * 1.45;
    float portraitDy = cos(uTime * 0.95 + seed * 36.0) * 1.45;

    float outerDrift = mix(0.75, 1.85, smoothstep(0.55, 1.0, fract(seed * 7.13)));
    float nX = (b1 * 0.55 + b3 * 0.45) * (1.9 + seed * 2.0) * outerDrift;
    float nY = (b2 * 0.60 - b3 * 0.40) * (1.6 + seed * 1.7) * outerDrift;

    float windBand = sin(uTime * 0.36 - pos.y * 0.022 + pos.x * 0.014);
    float ripple = smoothstep(0.32, 0.96, windBand) * (0.45 + fract(seed * 19.7) * 1.2);

    pos.x += mix(portraitDx, nX + ripple * 2.4, shapeMix) * settle;
    pos.y += mix(portraitDy, nY - ripple * 0.55, shapeMix) * settle;
  }

  vec2 ndc = (pos / uViewport) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);

  float grainSize = mix(1.0, 2.55, pow(fract(seed * 13.7), 1.45));
  float basePt = mix(aExtra.y, grainSize, shapeMix);
  gl_PointSize = clamp((basePt + wave * 1.15) * uDpr, 1.0, 6.0);

  vLum = aMeta.x;
  vGold = aMeta.y;
  vSeed = seed;
  vShapeMix = shapeMix;
  vScatter = wave;
  vSandAlpha = uSandAlpha;
}
`

const FS_SRC = `#version 300 es
precision highp float;

in float vLum;
in float vGold;
in float vSeed;
in float vShapeMix;
in float vScatter;
in float vSandAlpha;

out vec4 fragColor;

void main() {
  if (vSandAlpha < 0.005) discard;
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float alphaMask = 1.0 - smoothstep(0.28, 0.5, r);

  vec3 bone = vec3(0.95, 0.93, 0.89);
  vec3 silver = vec3(0.66, 0.69, 0.75);
  vec3 goldRim = vec3(0.94, 0.65, 0.24);

  vec3 portraitCol = mix(silver, bone, clamp(vLum * 1.15, 0.0, 1.0));
  portraitCol = mix(portraitCol, goldRim, clamp(vGold * 1.25, 0.0, 1.0));

  vec3 boneIvory = vec3(0.922, 0.898, 0.851);
  vec3 slateAsh = vec3(0.486, 0.514, 0.573);
  vec3 copper = vec3(0.898, 0.420, 0.220);

  float hCol = fract(vSeed * 37.91);
  float hAlpha = fract(vSeed * 91.73 + vLum * 1.37);
  float copperGlint = step(0.82, fract(vSeed * 53.17));

  vec3 mineral = mix(slateAsh, boneIvory, smoothstep(0.10, 0.92, hCol * 0.72 + vLum * 0.28));
  vec3 shapeCol = mix(mineral, copper, copperGlint * 0.88);
  vec3 finalCol = mix(portraitCol, shapeCol, vShapeMix);

  float shapeAlpha = mix(0.16, 0.76, pow(hAlpha, 1.15));
  float baseAlpha = mix(0.35 + vLum * 0.55 + vGold * 0.22, shapeAlpha, vShapeMix);
  float alpha = clamp(baseAlpha * (1.0 - vScatter * 0.18), 0.12, 0.95) * alphaMask * vSandAlpha;

  fragColor = vec4(finalCol * alpha, alpha);
}
`

const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

const gauss = () => {
  const u1 = Math.max(1e-6, Math.random())
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2)
}

const samplePortrait = async (url) => {
  let img = document.getElementById('portrait-clear')
  const reuse = img && img.complete && img.naturalWidth > 0 && (img.getAttribute('src') === url || img.currentSrc?.endsWith(url))
  if (!reuse) {
    img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
  }

  const size = 200
  const off = document.createElement('canvas')
  off.width = size
  off.height = size
  const ctx = off.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data

  const candidates = []
  let maxW = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a < 20) continue
      const nx = x / size - 0.5
      const ny = y / size - 0.5
      const rad = Math.hypot(nx, ny)
      if (rad > 0.495) continue
      const edgeFade = Math.min(1, Math.max(0, (0.495 - rad) / 0.035))
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      const gold = Math.min(1, Math.max(0, (r - b) / 85))
      const w = (Math.pow(Math.max(0, lum - 0.05), 0.78) + gold * 0.72) * edgeFade
      if (w > 0.04) {
        if (w > maxW) maxW = w
        candidates.push({ nx, ny, lum, gold, w })
      }
    }
  }

  const pts = []
  while (pts.length < PARTICLE_COUNT && candidates.length) {
    const c = candidates[Math.floor(Math.random() * candidates.length)]
    if (Math.random() * maxW < c.w) {
      pts.push({
        x: c.nx + (Math.random() - 0.5) * 0.004,
        y: c.ny + (Math.random() - 0.5) * 0.004,
        lum: c.lum,
        gold: c.gold,
      })
    }
  }
  return pts
}

const sampleCloudShape = () => {
  const W = 260
  const H = 156
  const off = document.createElement('canvas')
  off.width = W
  off.height = H
  const ctx = off.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, W, H)

  // Cloud Canopy & 3 Separated Server Rack Blades
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 7.5

  ctx.beginPath()
  ctx.arc(88, 46, 22, Math.PI * 0.78, Math.PI * 1.92)
  ctx.arc(130, 33, 29, Math.PI * 1.08, Math.PI * 1.98)
  ctx.arc(174, 47, 21, Math.PI * 1.25, Math.PI * 0.35)
  ctx.arc(182, 56, 15, 0, Math.PI * 0.52)
  ctx.lineTo(74, 71)
  ctx.arc(74, 56, 15, Math.PI * 0.5, Math.PI * 1.25)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  const rackXs = [58, 114, 170]
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4
  for (const rx of rackXs) {
    ctx.beginPath()
    ctx.moveTo(rx + 16, 73)
    ctx.lineTo(rx + 16, 94)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath()
    ctx.roundRect(rx, 94, 32, 46, 5)
    ctx.fill()

    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000000'
    ctx.fillRect(rx + 6, 103, 20, 5)
    ctx.fillRect(rx + 6, 115, 20, 5)
    ctx.fillRect(rx + 6, 127, 12, 5)
    ctx.restore()
  }

  const pixels = ctx.getImageData(0, 0, W, H).data
  const candidates = []
  let maxW = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = pixels[(y * W + x) * 4 + 3] / 255
      if (a > 0.12) {
        if (a > maxW) maxW = a
        candidates.push({ x, y, w: a })
      }
    }
  }

  const out = new Float32Array(PARTICLE_COUNT * 2)
  if (!candidates.length) return out

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let pick = candidates[(Math.random() * candidates.length) | 0]
    for (let attempt = 0; attempt < 6; attempt++) {
      if (Math.random() * maxW <= pick.w) break
      pick = candidates[(Math.random() * candidates.length) | 0]
    }

    const bx = pick.x / W - 0.5
    const by = pick.y / H - 0.5
    const tier = Math.random()
    let nx = bx
    let ny = by

    if (tier < 0.62) {
      nx += gauss() * 0.007
      ny += gauss() * 0.009
    } else if (tier < 0.86) {
      nx += gauss() * 0.028 + Math.abs(gauss()) * 0.012
      ny += gauss() * 0.033
    } else {
      nx += gauss() * 0.065 + Math.random() * 0.045
      ny += gauss() * 0.075 - Math.random() * 0.015
    }

    out[i * 2] = Math.max(-0.68, Math.min(0.68, nx))
    out[i * 2 + 1] = Math.max(-0.68, Math.min(0.68, ny))
  }
  return out
}

const writeRectArr = (el, out) => {
  if (!el) {
    out[0] = 0; out[1] = 0; out[2] = 1; out[3] = 1
    return
  }
  const r = el.getBoundingClientRect()
  out[0] = r.left
  out[1] = r.top
  out[2] = Math.max(1, r.width)
  out[3] = Math.max(1, r.height)
}

export const initSandMorph = async (canvas, portraitUrl) => {
  if (!canvas) return null
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const medallionEl = document.getElementById('portrait-medallion')
  const cloudAnchor = document.querySelector('.sand-anchor[data-sand-target="1"]')
  const archSection = document.getElementById('architecture')

  const [portraitPts, cloudPts] = await Promise.all([
    samplePortrait(portraitUrl),
    Promise.resolve().then(() => sampleCloudShape()),
  ])

  let dpr = Math.min(window.devicePixelRatio || 1, 2)
  let vpW = window.innerWidth
  let vpH = window.innerHeight
  const b0 = new Float32Array(4)
  const b1 = new Float32Array(4)
  let archOffsetTop = archSection ? archSection.offsetTop : 0
  let cloudOffscreen = true

  const syncLayout = () => {
    archOffsetTop = archSection ? archSection.offsetTop : 0
    writeRectArr(medallionEl, b0)
    if (cloudAnchor) {
      const r = cloudAnchor.getBoundingClientRect()
      b1[0] = r.left
      b1[1] = r.top
      b1[2] = Math.max(1, r.width)
      b1[3] = Math.max(1, r.height)
      cloudOffscreen = r.top > vpH + 120 || r.bottom < -120
    } else {
      b1[0] = 0; b1[1] = 0; b1[2] = 1; b1[3] = 1
      cloudOffscreen = true
    }
  }

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    vpW = window.innerWidth
    vpH = window.innerHeight
    canvas.width = Math.max(1, Math.floor(vpW * dpr))
    canvas.height = Math.max(1, Math.floor(vpH * dpr))
    syncLayout()
  }
  resize()

  // Clamped strictly in [0, 1]: stops permanently on #architecture Cloud Canopy + Racks
  const computeScrollStage = () => {
    if (!archSection) return 0
    const y = window.scrollY
    const s0 = 18
    const s1 = Math.max(s0 + 120, archOffsetTop - 130)
    return Math.max(0, Math.min(1, (y - s0) / (s1 - s0)))
  }

  let gl = null
  try {
    gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  } catch { gl = null }

  if (gl) {
    const compile = (type, src) => {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VS_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, FS_SRC)
    const prog = vs && fs ? gl.createProgram() : null
    if (prog) {
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
    }

    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl = null
    } else {
      const t0 = new Float32Array(PARTICLE_COUNT * 2)
      const t1 = new Float32Array(PARTICLE_COUNT * 2)
      const meta = new Float32Array(PARTICLE_COUNT * 4)
      const extra = new Float32Array(PARTICLE_COUNT * 2)

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = portraitPts[i % portraitPts.length]
        const i4 = i * 4
        const i2 = i * 2
        t0[i2] = p.x
        t0[i2 + 1] = p.y
        t1[i2] = cloudPts[i2]
        t1[i2 + 1] = cloudPts[i2 + 1]

        meta[i4] = p.lum
        meta[i4 + 1] = p.gold
        meta[i4 + 2] = Math.random()
        meta[i4 + 3] = Math.random() * Math.PI * 2

        extra[i2] = 45 + Math.random() * 145
        extra[i2 + 1] = 1.6 + p.lum * 1.35 + Math.random() * 0.5
      }

      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const bindVec = (name, data, size) => {
        const loc = gl.getAttribLocation(prog, name)
        if (loc < 0) return
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      }
      bindVec('aT0', t0, 2)
      bindVec('aT1', t1, 2)
      bindVec('aMeta', meta, 4)
      bindVec('aExtra', extra, 2)

      const loc = {
        frac: gl.getUniformLocation(prog, 'uFrac'),
        sandAlpha: gl.getUniformLocation(prog, 'uSandAlpha'),
        time: gl.getUniformLocation(prog, 'uTime'),
        dpr: gl.getUniformLocation(prog, 'uDpr'),
        vp: gl.getUniformLocation(prog, 'uViewport'),
        b0: gl.getUniformLocation(prog, 'uBounds0'),
        b1: gl.getUniformLocation(prog, 'uBounds1'),
        reduced: gl.getUniformLocation(prog, 'uReduced'),
      }

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

      let smoothS = computeScrollStage()
      const startTime = performance.now()
      let raf = 0
      let lastClearMix = -1
      let canvasCleared = false

      const draw = (now) => {
        raf = 0
        const targetS = computeScrollStage()
        smoothS = reduced ? Math.round(targetS) : smoothS + (targetS - smoothS) * 0.14
        if (Math.abs(targetS - smoothS) <= 0.0005) smoothS = targetS
        const settled = Math.abs(targetS - smoothS) <= 0.0005

        const clearMix = 1 - smoothstep(0.015, 0.16, smoothS)
        const sandAlpha = smoothstep(0.008, 0.14, smoothS)

        if (medallionEl && Math.abs(clearMix - lastClearMix) > 0.0005) {
          lastClearMix = clearMix
          medallionEl.style.opacity = clearMix.toFixed(3)
          medallionEl.style.transform = `scale(${(1 - (1 - clearMix) * 0.025).toFixed(4)})`
        }

        const settledOffscreen = smoothS > 0.995 && cloudOffscreen
        const activeRender = sandAlpha > 0.005 && !settledOffscreen

        if (activeRender) {
          canvasCleared = false
          gl.viewport(0, 0, canvas.width, canvas.height)
          gl.clearColor(0, 0, 0, 0)
          gl.clear(gl.COLOR_BUFFER_BIT)
          gl.useProgram(prog)
          gl.bindVertexArray(vao)
          gl.uniform1f(loc.frac, smoothS)
          gl.uniform1f(loc.sandAlpha, sandAlpha)
          gl.uniform1f(loc.time, (now - startTime) * 0.001)
          gl.uniform1f(loc.dpr, dpr)
          gl.uniform2f(loc.vp, vpW, vpH)
          gl.uniform4fv(loc.b0, b0)
          gl.uniform4fv(loc.b1, b1)
          gl.uniform1f(loc.reduced, reduced ? 1.0 : 0.0)
          gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT)
        } else if (!canvasCleared) {
          canvasCleared = true
          gl.viewport(0, 0, canvas.width, canvas.height)
          gl.clearColor(0, 0, 0, 0)
          gl.clear(gl.COLOR_BUFFER_BIT)
        }

        if (!document.hidden && !reduced && (!settled || activeRender)) {
          raf = requestAnimationFrame(draw)
        }
      }

      const requestWake = () => {
        syncLayout()
        if (!raf && !document.hidden) raf = requestAnimationFrame(draw)
      }
      const onScroll = () => requestWake()
      const onResize = () => { resize(); if (!raf && !document.hidden) raf = requestAnimationFrame(draw) }
      const onVis = () => { if (!document.hidden) requestWake() }

      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize, { passive: true })
      document.addEventListener('visibilitychange', onVis)
      raf = requestAnimationFrame(draw)

      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        document.removeEventListener('visibilitychange', onVis)
      }
    }
  }

  // Fallback 2D renderer
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const seeds = Float32Array.from({ length: 2400 }, () => Math.random())
  const angles = Float32Array.from({ length: 2400 }, () => Math.random() * Math.PI * 2)
  let smoothS = computeScrollStage()
  let raf = 0
  let lastClearMix = -1
  let canvasCleared = false

  const draw2d = () => {
    raf = 0
    const targetS = computeScrollStage()
    smoothS = reduced ? Math.round(targetS) : smoothS + (targetS - smoothS) * 0.14
    if (Math.abs(targetS - smoothS) <= 0.0005) smoothS = targetS
    const settled = Math.abs(targetS - smoothS) <= 0.0005

    const clearMix = 1 - smoothstep(0.015, 0.16, smoothS)
    const sandAlpha = smoothstep(0.008, 0.14, smoothS)
    if (medallionEl && Math.abs(clearMix - lastClearMix) > 0.0005) {
      lastClearMix = clearMix
      medallionEl.style.opacity = clearMix.toFixed(3)
    }

    const settledOffscreen = smoothS > 0.995 && cloudOffscreen
    const activeRender = sandAlpha > 0.005 && !settledOffscreen

    if (activeRender) {
      canvasCleared = false
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, vpW, vpH)
      const n = 2400
      for (let i = 0; i < n; i++) {
        const pi = (i * 3) % portraitPts.length
        const p = portraitPts[pi]
        const n1x = cloudPts[pi * 2]
        const n1y = cloudPts[pi * 2 + 1]

        const t = Math.min(1, Math.max(0, (smoothS - seeds[i] * 0.24) / 0.76))
        const e = t * t * (3 - 2 * t)
        const wave = reduced ? 0 : Math.sin(Math.PI * e)
        const x = (b0[0] + (p.x + 0.5) * b0[2]) * (1 - e) + (b1[0] + (n1x + 0.5) * b1[2]) * e + Math.cos(angles[i]) * 95 * wave + 160 * wave
        const y = (b0[1] + (p.y + 0.5) * b0[3]) * (1 - e) + (b1[1] + (n1y + 0.5) * b1[3]) * e + Math.sin(angles[i]) * 75 * wave
        const hCol = (seeds[i] * 37.91) % 1
        const isCopper = ((seeds[i] * 53.17) % 1) > 0.82
        const aGrain = (0.2 + ((seeds[i] * 91.73) % 1) * 0.56) * sandAlpha
        ctx.fillStyle = isCopper
          ? `rgba(229, 107, 56, ${aGrain.toFixed(2)})`
          : hCol > 0.42
            ? `rgba(235, 229, 217, ${aGrain.toFixed(2)})`
            : `rgba(124, 131, 146, ${aGrain.toFixed(2)})`
        const sz = 1.1 + ((seeds[i] * 13.7) % 1) * 1.4
        ctx.fillRect(x, y, sz, sz)
      }
    } else if (!canvasCleared) {
      canvasCleared = true
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, vpW, vpH)
    }

    if (!document.hidden && !reduced && !settled) {
      raf = requestAnimationFrame(draw2d)
    }
  }

  const requestWake = () => {
    syncLayout()
    if (!raf && !document.hidden) raf = requestAnimationFrame(draw2d)
  }
  const onScroll = () => requestWake()
  const onResize = () => { resize(); if (!raf && !document.hidden) raf = requestAnimationFrame(draw2d) }
  const onVis = () => { if (!document.hidden) requestWake() }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  document.addEventListener('visibilitychange', onVis)
  raf = requestAnimationFrame(draw2d)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVis)
  }
}
