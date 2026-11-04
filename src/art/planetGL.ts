// Realistic planet rendered by a small WebGL fragment shader: fBm terrain,
// oceans with specular glint, drifting clouds, a soft terminator and an
// atmosphere rim. One draw call per frame on a small canvas.
import { RNG } from '../lib/rng'

export type PlanetKind = 'terran' | 'desert' | 'ice' | 'gas' | 'lava'

export interface PlanetLook {
  kind: PlanetKind
  seed: [number, number, number]
  c1: [number, number, number]
  c2: [number, number, number]
  c3: [number, number, number]
  atmo: [number, number, number]
  tilt: number
}

const KIND_ID: Record<PlanetKind, number> = { terran: 0, desert: 1, ice: 2, gas: 3, lava: 4 }

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const LOOKS: Record<PlanetKind, string[][]> = {
  terran: [
    ['#0b2a5b', '#2f6b3a', '#b9a27a', '#7fb2ff'],
    ['#0e3a63', '#4c7a3c', '#c9b48a', '#8cc0ff'],
  ],
  desert: [
    ['#7a3f1d', '#c27a42', '#e8c792', '#ffc69a'],
    ['#5e2f1c', '#a8603a', '#ddb087', '#ffb38a'],
  ],
  ice: [
    ['#4d6f8f', '#a9c6db', '#f2f7fb', '#cfe6ff'],
    ['#3b5c7a', '#8fb3cf', '#e8f1f8', '#bcdcff'],
  ],
  gas: [
    ['#8a5a36', '#d9b38a', '#f1e3c8', '#f6d6a8'],
    ['#3d5e8a', '#8fb0d6', '#dbe7f3', '#a9cbff'],
    ['#7b4a6a', '#c98fa6', '#f0d6dc', '#ffc4d8'],
  ],
  lava: [['#160c0a', '#3a1d14', '#ff6a2a', '#ff8b4a']],
}

export function lookFromSeed(seed: string): PlanetLook {
  const r = new RNG(seed + '/planet-look')
  const kind = r.pick<PlanetKind>(['terran', 'terran', 'gas', 'desert', 'ice', 'gas', 'lava'])
  const [a, b, c, d] = r.pick(LOOKS[kind])
  return { kind, seed: [r.range(0, 50), r.range(0, 50), r.range(0, 50)], c1: hex(a), c2: hex(b), c3: hex(c), atmo: hex(d), tilt: r.range(-0.4, 0.4) }
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uSeed; uniform float uKind;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uAtmo; uniform float uTilt; uniform float uDim;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  float R = 0.8;
  float d = length(uv) / R;
  vec3 L = normalize(vec3(-0.65, 0.38, 0.66));
  if (d > 1.0) {
    // Atmosphere glow beyond the limb, brighter on the lit side.
    float lit = clamp(dot(normalize(vec3(uv, 0.0)), L) * 0.7 + 0.45, 0.0, 1.0);
    float a = exp(-(d - 1.0) * 16.0) * 0.55 * lit * (1.0 - uDim * 0.6);
    gl_FragColor = vec4(uAtmo * a, a);
    return;
  }
  float z = sqrt(1.0 - d * d);
  vec3 n = vec3(uv / R, z);
  // Axial tilt, then spin.
  float ct = cos(uTilt); float st = sin(uTilt);
  vec3 q = vec3(n.x * ct - n.y * st, n.x * st + n.y * ct, n.z);
  float a = uTime * 0.06; float ca = cos(a); float sa = sin(a);
  vec3 p = vec3(q.x * ca + q.z * sa, q.y, -q.x * sa + q.z * ca);
  float h = fbm(p * 2.2 + uSeed);
  vec3 col; float spec = 0.0; vec3 glow = vec3(0.0);
  if (uKind < 0.5 || (uKind > 0.5 && uKind < 1.5)) {
    bool desert = uKind > 0.5;
    float sea = desert ? 0.36 : 0.53;
    if (h < sea) { col = mix(uC1 * 0.55, uC1 * 1.25, smoothstep(sea - 0.2, sea, h)); spec = desert ? 0.1 : 1.0; }
    else { col = mix(uC2, uC3, smoothstep(sea + 0.02, sea + 0.25, h + fbm(p * 9.0) * 0.08)); }
    float cap = smoothstep(0.78, 0.9, abs(q.y) + fbm(p * 5.0) * 0.1);
    col = mix(col, vec3(0.93, 0.96, 1.0), cap * (desert ? 0.4 : 1.0));
  } else if (uKind < 2.5) {
    col = mix(uC1, uC3, smoothstep(0.3, 0.7, h));
    col = mix(col, uC2, smoothstep(0.45, 0.6, fbm(p * 6.0)) * 0.5);
    spec = 0.5;
  } else if (uKind < 3.5) {
    float w = fbm(p * vec3(2.0, 5.0, 2.0) + uSeed) * 2.6;
    float b = sin(q.y * 11.0 + w) * 0.5 + 0.5;
    col = mix(uC1, uC2, b);
    col = mix(col, uC3, smoothstep(0.6, 0.85, fbm(p * vec3(3.0, 9.0, 3.0) + uSeed.zxy)));
  } else {
    col = mix(uC1, uC2, h);
    float crack = 1.0 - smoothstep(0.0, 0.035, abs(fbm(p * 3.0 + uSeed) - 0.5));
    glow = uC3 * crack * 1.4;
  }
  // Clouds on rocky worlds with air.
  if (uKind < 0.5 || (uKind > 1.5 && uKind < 2.5)) {
    vec3 cp = vec3(p.x * cos(uTime * 0.015) + p.z * sin(uTime * 0.015), p.y, -p.x * sin(uTime * 0.015) + p.z * cos(uTime * 0.015));
    float c = smoothstep(0.55, 0.78, fbm(cp * 3.0 + uSeed.yzx));
    col = mix(col, vec3(0.97), c * 0.85);
    spec *= 1.0 - c;
  }
  float ndl = dot(n, L);
  float diff = smoothstep(-0.12, 1.0, ndl);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float sp = pow(max(dot(n, H), 0.0), 40.0) * spec * 0.6;
  vec3 lit = col * (diff * 1.05 + 0.025) + sp + glow * (1.0 - diff * 0.6);
  // Atmosphere scattering at the limb.
  float rim = pow(1.0 - z, 2.5);
  lit += uAtmo * rim * 0.55 * smoothstep(-0.3, 0.6, ndl);
  lit *= 1.0 - uDim * 0.45;
  float edge = smoothstep(1.0, 0.985, d);
  gl_FragColor = vec4(lit * edge, edge);
}`

export interface PlanetRenderer {
  draw(t: number): void
  resize(): void
  destroy(): void
}

/** True when WebGL runs on the CPU (no usable GPU). Checked on a throwaway canvas. */
export function softwareGL(): boolean {
  try {
    const probe = document.createElement('canvas').getContext('webgl')
    if (!probe) return true
    const info = probe.getExtension('WEBGL_debug_renderer_info')
    const name = info ? String(probe.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    probe.getExtension('WEBGL_lose_context')?.loseContext()
    return /SwiftShader|llvmpipe|Software|Basic Render/i.test(name)
  } catch {
    return true
  }
}

/**
 * Builds the planet shader. Returns null without a real GPU, where the shader would
 * take seconds to compile on the CPU. Compiles in the background where supported.
 */
export async function createPlanet(canvas: HTMLCanvasElement, look: PlanetLook, dim = 0): Promise<PlanetRenderer | null> {
  // Dev builds can force the shader for screenshots (?forcegl).
  const force = __DEV_PANEL__ && location.search.includes('forcegl')
  if (!force && softwareGL()) return null
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true })
  if (!gl) return null
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  // Wait for the driver to finish compiling without blocking the page.
  const par = gl.getExtension('KHR_parallel_shader_compile')
  if (par) {
    for (let i = 0; i < 300 && !gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR); i++) await new Promise((r) => setTimeout(r, 30))
  }
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = (n: string) => gl.getUniformLocation(prog, n)
  gl.uniform3fv(u('uSeed'), look.seed)
  gl.uniform1f(u('uKind'), KIND_ID[look.kind])
  gl.uniform3fv(u('uC1'), look.c1)
  gl.uniform3fv(u('uC2'), look.c2)
  gl.uniform3fv(u('uC3'), look.c3)
  gl.uniform3fv(u('uAtmo'), look.atmo)
  gl.uniform1f(u('uTilt'), look.tilt)
  gl.uniform1f(u('uDim'), dim)
  const uTime = u('uTime')
  const uRes = u('uRes')
  const resize = () => {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    const r = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(r.width * dpr))
    canvas.height = Math.max(1, Math.round(r.height * dpr))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uRes, canvas.width, canvas.height)
  }
  resize()
  return {
    draw(t) {
      gl.uniform1f(uTime, t)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    resize,
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

/** Canvas 2D fallback without a GPU: a lit sphere with banding, terminator and atmosphere glow. */
export function drawFallbackPlanet(canvas: HTMLCanvasElement, look: PlanetLook): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const r = canvas.getBoundingClientRect()
  canvas.width = Math.round(r.width * dpr)
  canvas.height = Math.round(r.height * dpr)
  const g = canvas.getContext('2d')!
  const w = canvas.width
  const c = w / 2
  const R = w * 0.4
  const col = (v: [number, number, number], k = 1, a = 1) => `rgba(${v.map((x) => Math.round(Math.min(1, x * k) * 255)).join(',')},${a})`
  const glow = g.createRadialGradient(c, c, R * 0.96, c, c, R * 1.18)
  glow.addColorStop(0, col(look.atmo, 1, 0.45))
  glow.addColorStop(1, col(look.atmo, 1, 0))
  g.fillStyle = glow
  g.fillRect(0, 0, w, w)
  g.save()
  g.beginPath()
  g.arc(c, c, R, 0, Math.PI * 2)
  g.clip()
  const base = g.createLinearGradient(c - R, c - R, c + R, c + R)
  base.addColorStop(0, col(look.c3))
  base.addColorStop(0.45, col(look.c2))
  base.addColorStop(1, col(look.c1, 0.6))
  g.fillStyle = base
  g.fillRect(c - R, c - R, R * 2, R * 2)
  for (let i = 0; i < 7; i++) {
    g.fillStyle = col(i % 2 ? look.c1 : look.c3, 1, 0.12)
    g.fillRect(c - R, c - R + (i + 0.3) * ((R * 2) / 7), R * 2, R * 0.12)
  }
  const shade = g.createRadialGradient(c - R * 0.45, c - R * 0.4, R * 0.2, c, c, R * 1.05)
  shade.addColorStop(0, 'rgba(255,255,255,0.18)')
  shade.addColorStop(0.55, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.85)')
  g.fillStyle = shade
  g.fillRect(c - R, c - R, R * 2, R * 2)
  g.restore()
}
