/* The Field: canvas, camera, tap grammar plumbing, render loop, presence.
   Screens own their nodes/edges/layout; the Field owns pixels and gestures. */

import { drawStar, drawStardust, drawThread } from "./stars";
import { rng } from "./layouts";
import { MS, type Edge, type StarNode, type DetailPlateData } from "./types";

export interface Camera { x: number; y: number; zoom: number; tx: number; ty: number; tzoom: number; }

export interface FieldCallbacks {
  onStarTap?(n: StarNode): void;
  onThreadTap?(e: Edge): void;
  onVoidTap?(): void;
  onFlick?(dx: number, dy: number): void;
  onLadder?(dir: 1 | -1): void;
  onLongPress?(n: StarNode): void;
}

const BEZ = (t: number) => {
  // cubic-bezier(.2,.8,.2,1) approximation
  const c1 = 0.2, c2 = 0.8, c3 = 0.2, c4 = 1;
  let x = t;
  for (let i = 0; i < 4; i++) {
    const f = 3 * c1 * x * (1 - x) * (1 - x) + 3 * c3 * x * x * (1 - x) + x * x * x - t;
    const d = 3 * c1 * (1 - x) * (1 - x) + 6 * (c3 - c1) * x * (1 - x) + 3 * (1 - c3) * x * x;
    if (Math.abs(d) < 1e-6) break;
    x -= f / d;
  }
  return 3 * c2 * x * (1 - x) * (1 - x) + 3 * c4 * x * x * (1 - x) + x * x * x;
};

interface Tween { t0: number; dur: number; update(k: number): void; done?(): void; }

export class Field {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  nodes = new Map<string, StarNode>();
  edges: Edge[] = [];
  cam: Camera = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tzoom: 1 };
  cb: FieldCallbacks = {};
  w = 0; h = 0;
  time = 0;
  bloom = 0; // 0..1 screen-enter bloom overlay

  private tweens: Tween[] = [];
  private raf = 0;
  private last = 0;
  private stardust: { x: number; y: number; r: number; phase: number }[] = [];
  private presence: { x: number; y: number; phase: number }[] = [];
  private plateEl!: HTMLElement;

  // gesture state
  private pDown: { x: number; y: number; t: number; id: number } | null = null;
  private pLast: { x: number; y: number; t: number } | null = null;
  private pMoved = 0;
  private pinchD0 = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private longTimer = 0;

  constructor(private container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "field";
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;

    this.plateEl = document.createElement("div");
    this.plateEl.className = "detail-plate";
    container.appendChild(this.plateEl);

    const r = rng(1375);
    for (let i = 0; i < 260; i++) {
      this.stardust.push({ x: (r() - 0.5) * 2400, y: (r() - 0.5) * 2400, r: 0.4 + r() * 1.1, phase: r() * 6.28 });
    }
    for (let i = 0; i < 14; i++) {
      this.presence.push({ x: (r() - 0.5) * 1600, y: (r() - 0.5) * 1600, phase: r() * 6.28 });
    }

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.bindGestures();
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - this.last);
      this.last = now;
      this.time = now;
      this.step(dt, now);
      this.draw(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
    this.plateEl.remove();
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.container.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** screen → field coords */
  toField(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.w / 2) / this.cam.zoom + this.cam.x,
      y: (sy - this.h / 2) / this.cam.zoom + this.cam.y,
    };
  }
  toScreen(fx: number, fy: number): { x: number; y: number } {
    return {
      x: (fx - this.cam.x) * this.cam.zoom + this.w / 2,
      y: (fy - this.cam.y) * this.cam.zoom + this.h / 2,
    };
  }

  tween(dur: number, update: (k: number) => void, done?: () => void): void {
    this.tweens.push({ t0: performance.now(), dur, update, done });
  }

  /** animate every node toward its tx/ty/tr/tglow over ms */
  settleNodes(ms: number = MS.recenter): void {
    const from = [...this.nodes.values()].map((n) => ({ n, x: n.x, y: n.y, r: n.r, g: n.glow }));
    this.tween(ms, (k) => {
      const e = BEZ(k);
      for (const f of from) {
        f.n.x = f.x + (f.n.tx - f.x) * e;
        f.n.y = f.y + (f.n.ty - f.y) * e;
        f.n.r = f.r + (f.n.tr - f.r) * e;
        f.n.glow = f.g + (f.n.tglow - f.g) * e;
      }
    });
  }

  /** animate camera toward its targets */
  settleCamera(ms: number = MS.recenter): void {
    const { x, y, zoom, tx, ty, tzoom } = this.cam;
    this.tween(ms, (k) => {
      const e = BEZ(k);
      this.cam.x = x + (tx - x) * e;
      this.cam.y = y + (ty - y) * e;
      this.cam.zoom = zoom + (tzoom - zoom) * e;
    });
  }

  /** kindle labels on nodes within `radius` px (screen space) of a point */
  kindleNear(sx: number, sy: number, radius = 90): void {
    for (const n of this.nodes.values()) {
      const p = this.toScreen(n.x, n.y);
      const d = Math.hypot(p.x - sx, p.y - sy);
      const want = d < radius;
      const had = !!n.label;
      if (want && !had && n.data && (n.data as { label?: string }).label) {
        n.label = (n.data as { label: string }).label;
        n.labelSub = (n.data as { labelSub?: string }).labelSub;
        n.tglow = Math.max(n.tglow, 0.55);
      } else if (!want && had && !n.pulse) {
        n.label = undefined;
        n.labelSub = undefined;
        if (n.tglow === 0.55) n.tglow = 0;
      }
    }
  }

  hitStar(sx: number, sy: number): StarNode | null {
    let best: StarNode | null = null;
    let bd = 26; // px
    for (const n of this.nodes.values()) {
      const p = this.toScreen(n.x, n.y);
      const d = Math.hypot(p.x - sx, p.y - sy);
      const rr = Math.max(12, n.r * this.cam.zoom) + 8;
      if (d < rr && d < bd) { bd = d; best = n; }
    }
    return best;
  }

  hitThread(sx: number, sy: number): Edge | null {
    const f = this.toField(sx, sy);
    let best: Edge | null = null;
    let bd = 14 / this.cam.zoom;
    for (const e of this.edges) {
      const a = this.nodes.get(e.a); const b = this.nodes.get(e.b);
      if (!a || !b) continue;
      const d = distToSeg(f.x, f.y, a.x, a.y, b.x, b.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  showPlate(d: DetailPlateData): void {
    this.plateEl.innerHTML =
      `<div class="dp-title">${escapeHtml(d.title)}</div>` +
      (d.sub ? `<div class="dp-sub">${escapeHtml(d.sub)}</div>` : "") +
      (d.meta ? `<div class="dp-meta">${escapeHtml(d.meta)}</div>` : "");
    this.plateEl.classList.add("open");
  }
  hidePlate(): void { this.plateEl.classList.remove("open"); }

  /** screen-enter bloom, 560ms */
  playBloom(): void {
    this.bloom = 1;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / MS.bloom);
      this.bloom = 1 - BEZ(k);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private bindGestures(): void {
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchD0 = Math.hypot(a.x - b.x, a.y - b.y);
        this.pDown = null;
        return;
      }
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      this.pDown = { x, y, t: performance.now(), id: e.pointerId };
      this.pLast = { x, y, t: performance.now() };
      this.pMoved = 0;
      window.clearTimeout(this.longTimer);
      this.longTimer = window.setTimeout(() => {
        if (this.pDown && this.pMoved < 8) {
          const n = this.hitStar(x, y);
          if (n && this.cb.onLongPress) this.cb.onLongPress(n);
        }
      }, 550);
    });
    c.addEventListener("pointermove", (e) => {
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchD0 > 0 && Math.abs(d - this.pinchD0) > 24) {
          this.cb.onLadder?.(d > this.pinchD0 ? 1 : -1);
          this.pinchD0 = d;
        }
        return;
      }
      if (!this.pDown) return;
      const dx = x - this.pLast!.x, dy = y - this.pLast!.y;
      this.pMoved += Math.hypot(dx, dy);
      this.pLast = { x, y, t: performance.now() };
      if (this.pMoved > 10) {
        window.clearTimeout(this.longTimer);
        // drag pans the sky
        this.cam.x -= dx / this.cam.zoom;
        this.cam.y -= dy / this.cam.zoom;
        this.cam.tx = this.cam.x; this.cam.ty = this.cam.y;
      }
    });
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      window.clearTimeout(this.longTimer);
      if (!this.pDown) { this.pDown = null; return; }
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const dt = performance.now() - this.pDown.t;
      const dist = Math.hypot(x - this.pDown.x, y - this.pDown.y);
      if (dist < 10 && dt < 350) {
        // tap — hit-test <16ms
        const t0 = performance.now();
        const star = this.hitStar(x, y);
        if (star) { this.cb.onStarTap?.(star); }
        else {
          const thread = this.hitThread(x, y);
          if (thread) this.cb.onThreadTap?.(thread);
          else this.cb.onVoidTap?.();
        }
        void t0;
      } else if (this.pLast) {
        // flick?
        const fdt = performance.now() - this.pLast.t;
        const fdx = x - this.pLast.x, fdy = y - this.pLast.y;
        const v = Math.hypot(fdx, fdy) / Math.max(1, fdt);
        if (v > 0.9 && Math.abs(fdx) > Math.abs(fdy) * 1.6) {
          this.cb.onFlick?.(fdx, fdy); // sideways flick → dial
        }
      }
      this.pDown = null;
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", () => { this.pointers.clear(); this.pDown = null; });
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.cb.onLadder?.(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
  }

  private step(dt: number, now: number): void {
    // tweens
    const keep: Tween[] = [];
    for (const tw of this.tweens) {
      const k = Math.min(1, (now - tw.t0) / tw.dur);
      tw.update(k);
      if (k < 1) keep.push(tw);
      else tw.done?.();
    }
    this.tweens = keep;
    // edge glow settle
    for (const e of this.edges) {
      e.lit += (e.tlit - e.lit) * Math.min(1, dt / 120);
    }
    void dt;
  }

  private draw(now: number): void {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    drawStardust(ctx, this.stardust, now, this.cam, w, h);

    // edges under nodes
    for (const e of this.edges) {
      const a = this.nodes.get(e.a); const b = this.nodes.get(e.b);
      if (!a || !b) continue;
      const pa = this.toScreen(a.x, a.y); const pb = this.toScreen(b.x, b.y);
      if (pa.x < -80 || pa.x > w + 80 || pa.y < -80 || pa.y > h + 80) continue;
      if (pb.x < -80 || pb.x > w + 80 || pb.y < -80 || pb.y > h + 80) continue;
      drawThread(ctx, pa.x, pa.y, pb.x, pb.y, e.kind, e.lit, e.curve);
    }
    // nodes
    for (const n of this.nodes.values()) {
      const p = this.toScreen(n.x, n.y);
      if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60) continue;
      drawStar(ctx, { ...n, x: p.x, y: p.y, r: n.r * this.cam.zoom }, now);
    }
    // presence: faint teal points, anonymous, light only — 5s kindle
    for (const p of this.presence) {
      const s = this.toScreen(p.x, p.y);
      if (s.x < 0 || s.x > w || s.y < 0 || s.y > h) continue;
      const k = 0.5 + 0.5 * Math.sin(now / MS.presence * Math.PI * 2 + p.phase);
      ctx.fillStyle = `rgba(127,212,193,${0.05 + k * 0.16})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // enter bloom
    if (this.bloom > 0.01) {
      ctx.fillStyle = `rgba(232,182,76,${this.bloom * 0.14})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
