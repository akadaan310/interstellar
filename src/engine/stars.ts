/* Star + thread rendering. The whole visual language lives here. */

import type { Edge, EdgeKind, Hue, StarNode } from "./types";

const GOLD = [232, 182, 76];
const GOLD_BRIGHT = [255, 217, 122];
const TEAL = [127, 212, 193];

function rgb(c: number[], a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function hueColors(hue: Hue, glow: number): { core: number[]; halo: number[] } {
  if (hue === "teal") return { core: TEAL, halo: TEAL };
  return glow > 0.5 ? { core: GOLD_BRIGHT, halo: GOLD } : { core: GOLD, halo: GOLD };
}

/** Eight-pointed star: two rotated squares + radial glow halo. */
export function drawStar(
  ctx: CanvasRenderingContext2D,
  n: StarNode,
  time: number,
  opts: { labelAlpha?: number } = {},
): void {
  const pulse = n.pulse ? 0.5 + 0.5 * Math.sin((time / 2400) * Math.PI * 2) : 0;
  const glow = Math.min(1, n.glow + pulse * 0.45);
  const r = n.r * (1 + pulse * 0.12);
  const { core, halo } = hueColors(n.hue, glow);

  // halo
  const haloR = r * (3.2 + glow * 4.5);
  const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
  g.addColorStop(0, rgb(halo, 0.34 + glow * 0.4));
  g.addColorStop(0.45, rgb(halo, 0.12 + glow * 0.16));
  g.addColorStop(1, rgb(halo, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
  ctx.fill();

  // eight-pointed star: square + diamond
  ctx.fillStyle = rgb(core, 0.92);
  ctx.strokeStyle = rgb(core, 0.5);
  ctx.lineWidth = 1;
  const rot = Math.PI / 4;
  for (const a0 of [0, rot]) {
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k / 4) * Math.PI * 2;
      const px = n.x + Math.cos(a) * r;
      const py = n.y + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // hot core
  ctx.fillStyle = rgb([255, 244, 214], 0.95);
  ctx.beginPath();
  ctx.arc(n.x, n.y, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
  ctx.fill();

  // kindled label
  if (n.label) {
    const alpha = opts.labelAlpha ?? 1;
    ctx.font = `600 ${Math.max(12, r * 2.1)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(243,233,210,${0.92 * alpha})`;
    ctx.shadowColor = "rgba(232,182,76,0.6)";
    ctx.shadowBlur = 12 * alpha;
    ctx.fillText(n.label, n.x, n.y - r * 3.1);
    ctx.shadowBlur = 0;
    if (n.labelSub) {
      ctx.font = `400 ${Math.max(10, r * 1.4)}px Georgia, serif`;
      ctx.fillStyle = `rgba(127,212,193,${0.8 * alpha})`;
      ctx.fillText(n.labelSub, n.x, n.y - r * 3.1 + Math.max(13, r * 2.2));
    }
  }
}

/** Center starburst glyph: layered glow + large beacon (for primary system nodes). */
export function drawStarburst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  time: number,
  hue: Hue = "gold",
): void {
  const breathe = 0.5 + 0.5 * Math.sin((time / 16000) * Math.PI * 2); // ambient pulse
  const c = hue === "teal" ? TEAL : GOLD;
  for (const [rr, alpha] of [[r * 7, 0.05], [r * 4.2, 0.1], [r * 2.4, 0.18]] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr * (1 + breathe * 0.08));
    g.addColorStop(0, rgb(c, alpha));
    g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rr * (1 + breathe * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  drawStar(ctx, { id: "burst", x, y, r, hue, glow: 0.9, tx: x, ty: y, tr: r, tglow: 0.9 } as StarNode, time);
}

/** Thread between two nodes. gold = succession/membership, teal = secondary, dashed = adjacency. */
export function drawThread(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: EdgeKind,
  lit: number,
  curve = 0,
): void {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * curve * len;
  const cy = my + (dx / len) * curve * len;

  ctx.save();
  if (kind === "dashed") ctx.setLineDash([3, 7]);
  const base = kind === "teal" ? TEAL : GOLD;
  const alpha = (kind === "dashed" ? 0.22 : 0.4) + lit * 0.55;
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, rgb(base, alpha * 0.25));
  grad.addColorStop(0.5, rgb(base, alpha));
  grad.addColorStop(1, rgb(base, alpha * 0.25));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1 + lit * 1.6;
  ctx.shadowColor = rgb(base, 0.5 * lit);
  ctx.shadowBlur = 10 * lit;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Stardust background: sparse tiny points with slow twinkle. */
export function drawStardust(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; r: number; phase: number }[],
  time: number,
  cam: { x: number; y: number; zoom: number },
  w: number,
  h: number,
): void {
  ctx.save();
  for (const p of points) {
    const sx = (p.x - cam.x) * cam.zoom + w / 2;
    const sy = (p.y - cam.y) * cam.zoom + h / 2;
    if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;
    const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time / 1400 + p.phase));
    ctx.fillStyle = `rgba(200,190,160,${tw * 0.5})`;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
