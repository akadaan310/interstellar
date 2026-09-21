/* PROXIMITY — co-occurrence field. The focus system sits at center;
   its jump-lane neighbors ring it on one orbit, and their neighbors form
   a second, smaller teal ring. Tap any system to make it the new focus —
   the infinite walk. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { singleOrbit } from "../engine/layouts";
import { JUMP_LANES, SYSTEMS, systemById, type StarSystem } from "../data/galaxy";

interface FocusNode {
  kind: "focus" | "neighbor" | "second";
  systemId: string;
}

const NEIGHBOR_R = 280;
const SECOND_R = 120;

export class ProximityScreen implements Screen {
  id = "proximity";
  name = "PROXIMITY";
  hint = "tap a system to sweep";

  private focusId = SYSTEMS[0].id;

  mount(f: Field, nav: Navigator): void {
    this.focusId = SYSTEMS[0].id;
    this.build(f);
    f.cb = {};
    f.cb.onStarTap = (n) => {
      const d = n.data as FocusNode | undefined;
      if (!d || !d.systemId) return;
      if (d.kind !== "focus") {
        this.focusId = d.systemId;
        this.build(f);
      }
      this.dossierPlate(f, d.systemId);
    };
    f.cb.onVoidTap = () => f.hidePlate();

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.8;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  private neighborsOf(id: string): string[] {
    const out: string[] = [];
    for (const l of JUMP_LANES) {
      if (l.a === id) out.push(l.b);
      else if (l.b === id) out.push(l.a);
    }
    return out;
  }

  private build(f: Field): void {
    f.nodes.clear();
    f.edges = [];

    const focus = systemById(this.focusId) ?? SYSTEMS[0];
    const center = makeNode({
      id: `px-${focus.id}`,
      x: 0,
      y: 0,
      r: 12,
      hue: "gold",
      pulse: true,
      label: focus.name,
      labelSub: `${focus.id} · FOCUS`,
    });
    center.data = { kind: "focus", systemId: focus.id } as FocusNode;
    f.nodes.set(center.id, center);

    const first = this.neighborsOf(focus.id);
    first.forEach((nid, i) => {
      const sys = systemById(nid);
      if (!sys) return;
      const p = singleOrbit(i, first.length, NEIGHBOR_R);
      const node = makeNode({
        id: `px-${sys.id}`,
        x: p.x,
        y: p.y,
        r: 6,
        hue: "gold",
        label: sys.name,
        labelSub: sys.id,
      });
      node.data = { kind: "neighbor", systemId: sys.id } as FocusNode;
      f.nodes.set(node.id, node);
      f.edges.push(makeEdge(center.id, node.id, "dashed", 0.1));
    });

    // second ring: neighbors of the first neighbor, excluding focus & first ring
    const firstIds = new Set(first);
    if (first.length > 0) {
      const anchor = first[0];
      const second = this.neighborsOf(anchor).filter(
        (sid) => sid !== focus.id && !firstIds.has(sid),
      );
      second.slice(0, 10).forEach((sid, i) => {
        const sys = systemById(sid);
        if (!sys) return;
        const a = singleOrbit(i, Math.min(10, second.length), SECOND_R);
        const node = makeNode({
          id: `px2-${sys.id}`,
          x: a.x + 0,
          y: a.y,
          r: 4,
          hue: "teal",
          label: sys.name,
          labelSub: sys.id,
        });
        node.data = { kind: "second", systemId: sys.id } as FocusNode;
        f.nodes.set(node.id, node);
        f.edges.push(makeEdge(`px-${anchor}`, node.id, "dashed", 0.2));
      });
    }

    f.settleNodes(MS.recenter);
  }

  private dossierPlate(f: Field, systemId: string): void {
    const sys: StarSystem | undefined = systemById(systemId);
    if (!sys) return;
    f.showPlate({
      title: sys.name,
      sub: `${sys.id} · ${sys.sector}`,
      meta: `${sys.spectral} · MAG ${sys.magnitude.toFixed(1)} · ${sys.bodies.length} BODIES`,
    });
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
