/* CONVOY — grouped sequence. Each voyage is one horizontal chain of
   nodes stacked on its own row. Tap a node to walk its voyage leg by leg. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { rng } from "../engine/layouts";
import { VOYAGES, systemById } from "../data/galaxy";

interface VoyageNode {
  kind: "convoy";
  voyage: number;
}

const MID_SEED = 9091;
const ROW_H = 150;
const LEG_W = 170;

export class ConvoyScreen implements Screen {
  id = "convoy";
  name = "CONVOY";
  hint = "tap a leg to walk the convoy";

  private voyageEdges: string[][] = [];
  private voyageMids: string[][] = [];

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges = [];
    f.cb = {};
    this.voyageEdges = [];
    this.voyageMids = [];

    const r = rng(MID_SEED);
    const top = -((VOYAGES.length - 1) * ROW_H) / 2;

    VOYAGES.forEach((v, i) => {
      const from = systemById(v.from);
      const to = systemById(v.to);
      const fromName = from ? from.name : v.from;
      const toName = to ? to.name : v.to;

      // 0..2 midpoint systems, deterministic pick from the middle of the catalog
      const midCount = Math.floor(r() * 3);
      const mids: string[] = [];
      for (let m = 0; m < midCount; m++) {
        mids.push(`mid-${i}-${m}`);
      }

      const stops: Array<{ id: string; label: string; labelSub: string }> = [
        { id: `cv-${i}-from`, label: fromName, labelSub: v.from },
        ...mids.map((id, m) => ({
          id,
          label: `MID-${i}${"ABCDEF"[m] ?? ""}`,
          labelSub: "WAYPOINT",
        })),
        { id: `cv-${i}-to`, label: toName, labelSub: v.to },
      ];
      const y = top + i * ROW_H;
      const x0 = -((stops.length - 1) * LEG_W) / 2;

      stops.forEach((s, k) => {
        const node = makeNode({
          id: s.id,
          x: x0 + k * LEG_W,
          y,
          r: k === 0 || k === stops.length - 1 ? 7 : 5,
          hue: "gold",
          label: s.label,
          labelSub: s.labelSub,
        });
        node.data = { kind: "convoy", voyage: i } as VoyageNode;
        f.nodes.set(s.id, node);
      });

      const edgeIds: string[] = [];
      for (let k = 0; k + 1 < stops.length; k++) {
        const e = makeEdge(stops[k].id, stops[k + 1].id, "gold", 0.12);
        f.edges.push(e);
        edgeIds.push(e.id);
      }
      this.voyageEdges.push(edgeIds);
      this.voyageMids.push(mids);

      // faint phyllotaxis stardust per row (visual grammar only)
      for (let s = 0; s < 6; s++) {
        const a = r() * Math.PI * 2;
        const rad = 60 + r() * 120;
        const dot = makeNode({
          id: `cv-${i}-dust-${s}`,
          x: Math.cos(a) * rad,
          y: y + Math.sin(a) * rad * 0.3,
          r: 1.4,
          hue: "teal",
        });
        f.nodes.set(dot.id, dot);
      }
    });

    f.cb.onStarTap = (n) => {
      const d = n.data as VoyageNode | undefined;
      if (!d || d.kind !== "convoy") return;
      this.walk(f, d.voyage);
    };
    f.cb.onThreadTap = (e) => {
      const i = this.voyageEdges.findIndex((ids) => ids.includes(e.id));
      if (i >= 0) this.walk(f, i);
    };
    f.cb.onVoidTap = () => {
      for (const e of f.edges) e.tlit = 0;
      f.hidePlate();
    };

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.62;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  /** light the voyage's edges in sequence, stagger MS.chord apart */
  private walk(f: Field, i: number): void {
    for (const ids of this.voyageEdges) {
      for (const id of ids) {
        const e = f.edges.find((x) => x.id === id);
        if (e) e.tlit = 0;
      }
    }
    const ids = this.voyageEdges[i] ?? [];
    const n = Math.max(1, ids.length);
    const total = n * MS.chord + MS.bloom;
    f.tween(total, (k) => {
      const cursor = k * total;
      ids.forEach((id, j) => {
        const e = f.edges.find((x) => x.id === id);
        if (e) e.tlit = Math.min(1, Math.max(0, (cursor - j * MS.chord) / MS.chord));
      });
    });
    const v = VOYAGES[i];
    const from = systemById(v.from);
    const to = systemById(v.to);
    const fromName = from ? from.name : v.from;
    const toName = to ? to.name : v.to;
    f.showPlate({
      title: `CONVOY ${i + 1}`,
      sub: `${fromName} → ${toName}`,
      meta: v.note,
    });
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
