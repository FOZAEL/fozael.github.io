// Carter Ogunsola (carterogunsola.com/studio) inspired sparse stochastic pinpoint dot wake.
// Renders discrete ~1.8px dots on a 4px lattice thresholded by interleaved gradient noise (~75% obsidian negative space)
// and smoothly fades out when hovering clickable controls, cards, and interactive stages.

const VS_SRC = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FS_SRC = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uDpr;
uniform float uGain;
uniform vec4 uTrail[28];   // x, y (CSS px), age (sec), active (0|1)

out vec4 fragColor;

float ign(vec2 cell) {
  return fract(52.9829189 * fract(dot(cell, vec2(0.06711056, 0.00583715))));
}

void main() {
  if (uGain < 0.004) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 cell = floor(p * 0.25);
  vec2 sub = mod(p, 4.0);
  if (sub.x > 1.8 || sub.y > 1.8) {
    fragColor = vec4(0.0);
    return;
  }

  float noise = ign(cell);

  float trailField = 0.0;
  for (int i = 0; i < 28; i++) {
    vec4 t = uTrail[i];
    if (t.w < 0.5) continue;
    float life = 1.0 - clamp(t.z / 1.05, 0.0, 1.0);
    float rad = mix(36.0, 74.0, life);
    float d = length(p - t.xy);
    if (d < rad * 1.4) {
      float fall = exp(-(d * d) / (2.0 * rad * rad * 0.26));
      trailField = max(trailField, life * life * fall);
    }
  }

  float density = min(0.36, trailField * 0.42);

  if (density <= noise || density < 0.025) {
    fragColor = vec4(0.0);
    return;
  }

  vec3 silver = vec3(0.82, 0.84, 0.87);
  vec3 bright = vec3(0.89, 0.91, 0.94);
  vec3 tint = mix(silver, bright, smoothstep(0.10, 0.36, density));
  float alpha = clamp(0.24 + density * 0.56, 0.0, 0.62) * uGain;
  fragColor = vec4(tint * alpha, alpha);
}
`

const MAX_TRAIL = 28
const INTERACTIVE_SEL = [
  'a',
  'button',
  '[role="tab"]',
  '[role="button"]',
  '.era-tab',
  '.milestone-node',
  '.stack-popover',
  '.bento-tile',
  '.dispatch-item',
  '.chamber-controls',
  '.pipeline-bar',
  '#canvas-topology',
  '#canvas-pipeline',
  '#canvas-dial',
  '#canvas-skills',
  '#canvas-credentials',
  '#canvas-spine',
  '#canvas-contact-beacon',
].join(', ')

export const initDitherField = (canvas) => {
  if (!canvas) return null
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null

  const trail = Array.from({ length: MAX_TRAIL }, () => ({ x: 0, y: 0, age: 99, active: 0 }))
  let trailHead = 0
  let lastX = null
  let lastY = null
  let overInteractive = false
  let hoverGain = 1.0

  const pushTrail = (x, y) => {
    trail[trailHead].x = x
    trail[trailHead].y = y
    trail[trailHead].age = 0
    trail[trailHead].active = 1
    trailHead = (trailHead + 1) % MAX_TRAIL
  }

  const onMove = (e) => {
    const targetEl = e.target instanceof Element ? e.target : null
    if (targetEl?.closest(INTERACTIVE_SEL)) {
      overInteractive = true
      lastX = null
      lastY = null
      return
    }
    overInteractive = false

    if (lastX !== null) {
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY)
      if (dist > 14) {
        const steps = Math.min(4, Math.floor(dist / 12))
        for (let s = 1; s < steps; s++) {
          const u = s / steps
          pushTrail(lastX + (e.clientX - lastX) * u, lastY + (e.clientY - lastY) * u)
        }
      }
    }
    pushTrail(e.clientX, e.clientY)
    lastX = e.clientX
    lastY = e.clientY
  }

  const onLeave = () => {
    overInteractive = false
    lastX = null
    lastY = null
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave)

  let gl = null
  try {
    gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' })
  } catch { gl = null }

  let dpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr))
    canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr))
  }
  resize()
  window.addEventListener('resize', resize, { passive: true })

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
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
      const locPos = gl.getAttribLocation(prog, 'aPos')
      gl.enableVertexAttribArray(locPos)
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0)

      const uRes = gl.getUniformLocation(prog, 'uRes')
      const uDpr = gl.getUniformLocation(prog, 'uDpr')
      const uGain = gl.getUniformLocation(prog, 'uGain')
      const uTrail = gl.getUniformLocation(prog, 'uTrail')
      const trailArr = new Float32Array(MAX_TRAIL * 4)

      let prev = performance.now()
      let raf = 0
      const frame = (now) => {
        const dt = Math.min(0.05, (now - prev) * 0.001)
        prev = now

        const targetGain = overInteractive ? 0.0 : 1.0
        const rate = overInteractive ? 11.0 : 6.0
        hoverGain += (targetGain - hoverGain) * Math.min(1, dt * rate)

        let anyActive = false
        for (let i = 0; i < MAX_TRAIL; i++) {
          const t = trail[i]
          if (t.active) {
            t.age += dt
            if (t.age > 1.05) t.active = 0
            else anyActive = true
          }
          const k = i * 4
          trailArr[k] = t.x
          trailArr[k + 1] = t.y
          trailArr[k + 2] = t.age
          trailArr[k + 3] = t.active
        }

        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        if (anyActive && hoverGain > 0.004) {
          gl.useProgram(prog)
          gl.bindVertexArray(vao)
          gl.uniform2f(uRes, canvas.width, canvas.height)
          gl.uniform1f(uDpr, dpr)
          gl.uniform1f(uGain, hoverGain)
          gl.uniform4fv(uTrail, trailArr)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
        }
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerleave', onLeave)
        window.removeEventListener('resize', resize)
      }
    }
  }

  // Fallback 2D spaced pinpoint stipple renderer
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const ign2d = (cx, cy) => {
    const f = (cx * 0.06711056 + cy * 0.00583715) % 1
    return (52.9829189 * (f < 0 ? f + 1 : f)) % 1
  }
  let prev = performance.now()
  let raf = 0
  const frame2d = (now) => {
    const dt = Math.min(0.05, (now - prev) * 0.001)
    prev = now
    const targetGain = overInteractive ? 0.0 : 1.0
    const rate = overInteractive ? 11.0 : 6.0
    hoverGain += (targetGain - hoverGain) * Math.min(1, dt * rate)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    if (hoverGain > 0.004) {
      for (let i = 0; i < MAX_TRAIL; i++) {
        const t = trail[i]
        if (!t.active) continue
        t.age += dt
        if (t.age > 1.05) { t.active = 0; continue }
        const life = 1 - t.age / 1.05
        const rad = 36 + life * 38
        ctx.fillStyle = `rgba(216, 222, 230, ${((0.22 + life * 0.28) * hoverGain).toFixed(3)})`
        for (let gx = Math.floor((t.x - rad) / 4) * 4; gx <= t.x + rad; gx += 4) {
          for (let gy = Math.floor((t.y - rad) / 4) * 4; gy <= t.y + rad; gy += 4) {
            const d = Math.hypot(gx - t.x, gy - t.y)
            const f = Math.min(0.36, life * life * Math.exp(-(d * d) / (2 * rad * rad * 0.26)) * 0.42)
            if (f > ign2d(gx >> 2, gy >> 2) && f > 0.025) ctx.fillRect(gx, gy, 1.8, 1.8)
          }
        }
      }
    }
    raf = requestAnimationFrame(frame2d)
  }
  raf = requestAnimationFrame(frame2d)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('resize', resize)
  }
}
