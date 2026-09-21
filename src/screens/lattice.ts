/* LATTICE — the jump-lane ring. Twenty-four systems on a single orbit,
   lanes between them as gold threads. Tap a star to rotate it to the top;
   tap a thread to trace a lane. */

import { JUMP_LANES, SYSTEMS } from "../data/galaxy";
import { rotationFor, singleOrbit } from "../engine/layouts";
import { makeEdge, makeNode } from "../engine/types";
import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";

const HOT = new Set(["O", "B", "A"]);
const RING_R = 300;

interface LatticeData {
  rank: number;
  label: string;
  labelSub: string;
}

export class LatticeScreen implements Screen {
  id = "lattice";
  name = "LATTICE";
  hint = "tap a thread to trace a lane";
  private rotation = 0;

  mount(f: Field, nav: Navigator): void {
    f.cb = {};
    f.nodes.clear();
    f.edges = [];
    f.hidePlate();
    this.rotation = 0;

    const set = SYSTEMS.slice(0, 24);
    const ids = new Set(set.map((s) => s.id));
    const n = set.length;

    set.forEach((s, rank) => {
      const p = singleOrbit(rank, n, RING_R, this.rotation);
      f.nodes.set(
        s.id,
        makeNode({
          id: s.id,
          x: p.x,
          y: p.y,
          r: Math.max(4, Math.min(9, 10 - s.magnitude)),
          hue: HOT.has(s.specClass) ? "teal" : "gold",
          data: { rank, label: s.name, labelSub: s.id } as LatticeData,
        }),
      );
    });

    for (const lane of JUMP_LANES) {
      if (ids.has(lane.a) && ids.has(lane.b)) {
        f.edges.push(makeEdge(lane.a, lane.b, "gold", 0.18));
      }
    }

    f.cb.onStarTap = (node) => {
      const d = node.data as LatticeData;
      node.label = d.label;
      node.labelSub = d.labelSub;
      node.tglow = 0.85;
      // recenter: rotate the tapped star to the top over 520ms
      this.rotation = rotationFor(d.rank, n);
      for (const nd of f.nodes.values()) {
        const dd = nd.data as LatticeData;
        const p = singleOrbit(dd.rank, n, RING_R, this.rotation);
        nd.tx = p.x;
        nd.ty = p.y;
      }
      f.settleNodes(520);
    };
    f.cb.onThreadTap = (e) => {
      for (const ed of f.edges) ed.tlit = ed.id === e.id ? 1 : 0;
      const lane = JUMP_LANES.find(
        (l) => (l.a === e.a && l.b === e.b) || (l.a === e.b && l.b === e.a),
      );
      f.showPlate({
        title: "JUMP LANE",
        sub: `${e.a} → ${e.b}`,
        meta: lane ? `RANGE ${lane.length} LY` : undefined,
      });
    };
    f.cb.onVoidTap = () => {
      for (const ed of f.edges) ed.tlit = 0;
      f.hidePlate();
    };
    f.cb.onFlick = () => nav.dial();
    f.cb.onLadder = (dir) => nav.ladder(dir, "lattice");

    f.cam.tx = 0;
    f.cam.ty = 0;
    f.cam.tzoom = 1;
    f.settleCamera();
    f.settleNodes();
    f.playBloom();
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
