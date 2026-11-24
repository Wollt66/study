export type Rand = () => number

export function mulberry32(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gaussian(rand: Rand): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function pick<T>(rand: Rand, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]
}

export interface NoiseChannelOptions {
  base: number
  rand: Rand
  amp1?: number
  amp2?: number
  period1?: number
  period2?: number
  walkMaxRatio?: number
  walkSigmaRatio?: number
  min?: number
  max?: number
  continuityRatio?: number
}

export class NoiseChannel {
  private readonly base: number
  private readonly rand: Rand
  private readonly amp1: number
  private readonly amp2: number
  private readonly period1: number
  private readonly period2: number
  private readonly walkMax: number
  private readonly walkSigma: number
  private readonly min: number | undefined
  private readonly max: number | undefined
  private readonly continuity: number
  private readonly phase1: number
  private readonly phase2: number
  private walk = 0
  private lastT = 0
  private lastValue: number

  constructor(opts: NoiseChannelOptions) {
    this.base = opts.base
    this.rand = opts.rand
    this.amp1 = opts.amp1 ?? 0.1
    this.amp2 = opts.amp2 ?? 0.05
    this.period1 = opts.period1 ?? 300_000
    this.period2 = opts.period2 ?? 40_000
    this.walkMax = this.base * (opts.walkMaxRatio ?? 0.08)
    this.walkSigma = this.base * (opts.walkSigmaRatio ?? 0.01)
    this.min = opts.min
    this.max = opts.max
    this.continuity = opts.continuityRatio ?? 0.15
    this.phase1 = this.rand() * Math.PI * 2
    this.phase2 = this.rand() * Math.PI * 2
    this.lastValue = this.base
  }

  value(t: number): number {
    if (t <= this.lastT) return this.lastValue
    this.walk += gaussian(this.rand) * this.walkSigma
    this.walk = Math.min(this.walkMax, Math.max(-this.walkMax, this.walk))
    const wave =
      1 +
      this.amp1 * Math.sin((2 * Math.PI * t) / this.period1 + this.phase1) +
      this.amp2 * Math.sin((2 * Math.PI * t) / this.period2 + this.phase2)
    let raw = this.base * wave + this.walk
    raw = Math.min(this.lastValue * (1 + this.continuity), Math.max(this.lastValue * (1 - this.continuity), raw))
    if (this.min !== undefined) raw = Math.max(this.min, raw)
    if (this.max !== undefined) raw = Math.min(this.max, raw)
    this.lastT = t
    this.lastValue = raw
    return raw
  }
}

const gauss = (h: number, mu: number, sigma: number) => Math.exp(-((h - mu) ** 2) / (2 * sigma * sigma))

export function hourFactor(h: number): number {
  const bump = h >= 10 && h <= 16 ? Math.sin((Math.PI * (h - 10)) / 7) : 0
  return 0.16 + 0.62 * gauss(h, 8, 1.3) + 0.78 * gauss(h, 18, 1.6) + 0.3 * bump
}

export function typeHourFactor(h: number, shape: 'car' | 'bus' | 'truck' | 'ev'): number {
  switch (shape) {
    case 'bus':
      return 0.12 + 0.62 * gauss(h, 8, 1.0) + 0.75 * gauss(h, 18, 1.0)
    case 'truck': {
      const platform = h >= 8 && h <= 17 ? 0.75 : 0.12
      const night = 0.4 * gauss(h, 1, 1.5)
      return 0.12 + platform + night
    }
    case 'ev':
      return (0.16 + 0.62 * gauss(h, 8, 1.3) + 0.94 * gauss(h, 18, 1.6) + 0.3 * (h >= 10 && h <= 16 ? Math.sin((Math.PI * (h - 10)) / 7) : 0))
    default:
      return hourFactor(h)
  }
}