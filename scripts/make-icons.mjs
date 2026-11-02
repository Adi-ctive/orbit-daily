// Writes pixel-art planet icons to public/icons. Pure Node, no image libraries.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16)
const BG = [11, 8, 32]
const TONES = [
  [24, 18, 66],
  [44, 30, 112],
  [72, 52, 168],
  [95, 110, 210],
  [95, 216, 232],
  [214, 244, 248],
]
const RIM = [245, 180, 74]

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y)
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Draw at a 32 px grid, then scale by an integer factor.
function planet(grid, radiusFrac) {
  const cx = grid / 2 - 0.5
  const cy = grid / 2 - 0.5
  const R = grid * radiusFrac
  const L = [-0.55, -0.6, 0.58]
  return (gx, gy) => {
    const dx = (gx - cx) / R
    const dy = (gy - cy) / R
    const d2 = dx * dx + dy * dy
    if (d2 > 1) {
      // Ring.
      const rx = dx / 1.7
      const ry = (dy - dx * 0.25) / 0.38
      const rr = rx * rx + ry * ry
      if (rr > 0.72 && rr < 1 && !(dy < 0 && d2 < 1.05)) return RIM
      // Stars.
      if ((gx * 7 + gy * 13) % 37 === 0) return [200, 190, 240]
      return BG
    }
    const dz = Math.sqrt(1 - d2)
    let light = dx * L[0] + dy * L[1] + dz * L[2]
    // Gas bands.
    light += Math.sin(dy * 9 + dx * 1.5) * 0.12
    light = Math.max(0, Math.min(1, (light + 0.35) / 1.25))
    const t = BAYER[(gy % 4) * 4 + (gx % 4)]
    const idx = Math.min(TONES.length - 1, Math.floor(light * (TONES.length - 1) + t))
    if (d2 > 0.86 && dx > 0.2 && dy > 0) return RIM
    return TONES[idx]
  }
}

function icon(size, grid, radiusFrac) {
  const f = planet(grid, radiusFrac)
  const s = size / grid
  return png(size, (x, y) => f(Math.floor(x / s), Math.floor(y / s)))
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', icon(192, 32, 0.3))
writeFileSync('public/icons/icon-512.png', icon(512, 32, 0.3))
writeFileSync('public/icons/maskable-512.png', icon(512, 32, 0.22))
console.log('icons written')
