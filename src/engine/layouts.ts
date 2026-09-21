/* Deterministic layout algorithms. Same query → same sky. Nothing hand-placed. */

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // 137.5°

/** Starfield: phyllotaxis spiral. radius ∝ √index, x compressed to fit portrait. */
export function phyllotaxis(
  index: number, // 0-based chart rank
  opts: { scale: number; xCompress?: number; cx?: number; cy?: number } = { scale: 1 },
): { x: number; y: number } {
  const { scale, xCompress = 0.54, cx = 0, cy = 0 } = opts;
  const r = Math.sqrt(index + 0.5) * scale;
  const a = index * GOLDEN_ANGLE;
  return { x: cx + Math.cos(a) * r * xCompress, y: cy + Math.sin(a) * r };
}

/**
 * Dive: concentric orbits. counts = per-ring capacities, e.g. [16,24,32,40,23].
 * Returns ring index + angle for body i. Each ring phase-offset 0.13 rad.
 */
export function concentricOrbit(
  i: number,
  counts: number[],
  opts: { baseR?: number; ringGap?: number; cx?: number; cy?: number } = {},
): { x: number; y: number; ring: number } {
  const { baseR = 60, ringGap = 46, cx = 0, cy = 0 } = opts;
  let ring = 0;
  let acc = 0;
  while (ring < counts.length - 1 && i >= acc + counts[ring]) {
    acc += counts[ring];
    ring++;
  }
  const k = i - acc;
  const n = counts[ring];
  const r = baseR + ring * ringGap;
  const a = -Math.PI / 2 + (k / n) * Math.PI * 2 + ring * 0.13;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, ring };
}

/**
 * Lattice ring: single orbit. angle = rank × 2π/n, clockwise from the top.
 * Re-centering rotates the whole orbit by (targetAngle - 0) so the tapped
 * star lands at the bottom-center origin position — positions recomputed.
 */
export function singleOrbit(
  rank: number,
  n: number,
  radius: number,
  rotation = 0,
  cx = 0,
  cy = 0,
): { x: number; y: number } {
  const a = -Math.PI / 2 + (rank / n) * Math.PI * 2 + rotation;
  return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
}

/** rotation needed so that star of `rank` lands at angle `atAngle` (default top) */
export function rotationFor(rank: number, n: number, atAngle = -Math.PI / 2): number {
  const a = -Math.PI / 2 + (rank / n) * Math.PI * 2;
  return atAngle - a;
}

/**
 * Taxonomy rosette. classes on inner orbit at equal angle; members
 * fanned ±0.34 rad on the outer orbit under their own class.
 */
export function rosettePattern(p: number, petals: number, r: number, cx = 0, cy = 0) {
  const a = -Math.PI / 2 + (p / petals) * Math.PI * 2;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, angle: a };
}
export function rosetteLeaf(
  patternAngle: number,
  k: number,
  leaves: number,
  r: number,
  cx = 0,
  cy = 0,
) {
  const spread = 0.34;
  const a = leaves <= 1 ? patternAngle : patternAngle - spread + (2 * spread * k) / (leaves - 1);
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

/**
 * Dial: cylinder projection. t = scroll position (rows), rowH = row height.
 * Returns x (curvature), y, scale, opacity for row i.
 * Curvature is gentle by default: |x| ≈ 150px four rows from the detent
 * (x = −dy² · curve · width).
 */
export function drumRow(
  i: number,
  t: number,
  opts: { rowH?: number; width?: number; curve?: number } = {},
): { x: number; y: number; scale: number; opacity: number } {
  const { rowH = 84, width = 320, curve = 0.0000042 } = opts;
  const dy = (i - t) * rowH;
  const x = -Math.pow(dy, 2) * curve * width;
  const scale = Math.max(0.35, 1 - Math.abs(dy) / (rowH * 6));
  const opacity = Math.max(0, 1 - Math.abs(dy) / (rowH * 4.5));
  return { x, y: dy, scale, opacity };
}

/** mulberry32 — deterministic PRNG for presence stars & stardust */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
