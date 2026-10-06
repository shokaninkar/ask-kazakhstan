// Small, fast, deterministic PRNG. mulberry32 — 32-bit seed, uniform output.
// Used so that the same (question, seed) pair always produces the same
// persona cohort. This makes results reproducible and shareable via URL.

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  // 32-bit unsigned, browser + node safe
  return Math.floor(Math.random() * 0x100000000) >>> 0
}

export function pickInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n)
}

export function weightedPick<T>(rng: Rng, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}
