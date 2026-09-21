/* VOYAGE — narrative arc. Each voyage is one long curved teal arc
   from a left node to a right node, with two midpoint waypoint dots
   riding the curve. Tap the arc to read the log; tap a node for the
   system dossier. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { VOYAGES, systemById } from "../data/galaxy";

interface ArcNode {
  kind: "port" | "waypoint";
  systemId?: string;
}

const ARC_X = 380;
const ARC_Y_STEP = 100;

export class VoyageScreen implements Screen {
  id = "voyage";
  name = "VOYAGE";
  hint = "tap an arc to read the log";

  private voyageByEdge = new Map<string, number>();

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges = [];
    f.cb = {};
    this.voyageByEdge.clear();

    const top = -((VOYAGES.length - 1) * ARC_Y_STEP) / 2;

    VOYAGES.forEach((v, i) => {
      const from = systemById(v.from);
      const to = systemById(v.to);
      const y = top + i * ARC_Y_STEP;

      const fromNode = makeNode({
        id: `vy-${i}-from`,
        x: -ARC_X,
        y,
        r: 6,
        hue: "gold",
        label: from ? from.name : v.from,
        labelSub: v.from,
      });
      fromNode.data = { kind: "port", systemId: v.from } as ArcNode;
      const toNode = makeNode({
        id: `vy-${i}-to`,
        x: ARC_X,
        y,
        r: 6,
        hue: "gold",
        label: to ? to.name : v.to,
        labelSub: v.to,
      });
      toNode.data = { kind: "port", systemId: v.to } as ArcNode;
      f.nodes.set(fromNode.id, fromNode);
      f.nodes.set(toNode.id, toNode);

      // two midpoint dots ride the quadratic curve (control offset =
      // (dx/len)*curve*len, positive y for a left→right arc)
      [1 / 3, 2 / 3].forEach((t, m) => {
        const bx = -ARC_X + 2 * ARC_X * t;
        const by = y + 2 * t * (1 - t) * 0.35 * (2 * ARC_X);
        const dot = makeNode({
          id: `vy-${i}-wp-${m}`,
          x: bx,
          y: by,
          r: 2.6,
          hue: "teal",
        });
        dot.data = { kind: "waypoint" } as ArcNode;
        f.nodes.set(dot.id, dot);
      });

      const arc = makeEdge(fromNode.id, toNode.id, "teal", 0.35);
      f.edges.push(arc);
      this.voyageByEdge.set(arc.id, i);
    });

    f.cb.onThreadTap = (e) => {
      const i = this.voyageByEdge.get(e.id);
      if (i === undefined) return;
      const v = VOYAGES[i];
      const from = systemById(v.from);
      const to = systemById(v.to);
      const fromName = from ? from.name : v.from;
      const toName = to ? to.name : v.to;
      const range =
        from && to ? Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 10) : 0;
      for (const x of f.edges) x.tlit = x.id === e.id ? 1 : 0;
      f.showPlate({
        title: "VOYAGE LOG",
        sub: `${fromName} → ${toName}`,
        meta: `${v.note} · RANGE ${range} LY`,
      });
    };
    f.cb.onStarTap = (n) => {
      const d = n.data as ArcNode | undefined;
      if (!d || d.kind !== "port" || !d.systemId) return;
      const sys = systemById(d.systemId);
      if (!sys) return;
      n.tglow = 0.6;
      f.showPlate({
        title: sys.name,
        sub: `${sys.id} · ${sys.sector}`,
        meta: `${sys.spectral} · MAG ${sys.magnitude.toFixed(1)} · ${sys.bodies.length} BODIES`,
      });
    };
    f.cb.onVoidTap = () => {
      for (const x of f.edges) x.tlit = 0;
      for (const n of f.nodes.values()) n.tglow = 0;
      f.hidePlate();
    };

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.55;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
