/* Shared types for the constellation field engine. */

export type Hue = "gold" | "teal";

export interface StarNode {
  id: string;
  /** field coordinates — recomputed by layout, never persisted */
  x: number;
  y: number;
  /** base visual radius in px */
  r: number;
  hue: Hue;
  /** 0..1 extra glow (kindle, pulse, walk highlight) */
  glow: number;
  /** label kindled near the finger; undefined = unnamed */
  label?: string;
  labelSub?: string;
  pulse?: boolean;
  /** arbitrary payload the screen understands */
  data?: unknown;
  /** animation targets */
  tx: number;
  ty: number;
  tr: number;
  tglow: number;
}

export type EdgeKind = "gold" | "teal" | "dashed";

export interface Edge {
  id: string;
  a: string;
  b: string;
  kind: EdgeKind;
  /** quadratic curve offset; 0 = straight */
  curve: number;
  /** 0..1 walk highlight */
  lit: number;
  tlit: number;
}

export interface DetailPlateData {
  title: string;
  sub?: string;
  meta?: string;
}

/** cubic-bezier(.2,.8,.2,1) — the field's one easing */
export const EASE_FIELD = [0.2, 0.8, 0.2, 1] as const;

/** motion spec, ms — from the artifact */
export const MS = {
  kindle: 180,
  plate: 380,
  ladder: 440,
  recenter: 520,
  bloom: 560,
  rosette: 640,
  ringStagger: 40,
  petalStagger: 55,
  leafFan: 300,
  chord: 160,
  flickCapture: 8,
  pulse: 2400,
  ambient: 16000,
  presence: 5000,
  drumDecay: 1100,
  hitTest: 16,
} as const;

export function makeNode(partial: Partial<StarNode> & { id: string; x: number; y: number }): StarNode {
  return {
    r: 5,
    hue: "gold",
    glow: 0,
    tx: partial.x,
    ty: partial.y,
    tr: partial.r ?? 5,
    tglow: 0,
    ...partial,
  } as StarNode;
}

export function makeEdge(a: string, b: string, kind: EdgeKind = "gold", curve = 0): Edge {
  return { id: `${a}→${b}`, a, b, kind, curve, lit: 0, tlit: 0 };
}
