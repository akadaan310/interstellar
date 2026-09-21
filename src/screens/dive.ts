/* DIVE — one star system, up close. The star sits at the center; its bodies
   ride concentric orbit rings. Tap a body for its dossier. Void tap returns
   to the chart. */

import { SYSTEMS, systemById } from "../data/galaxy";
import { concentricOrbit } from "../engine/layouts";
import { makeEdge, makeNode } from "../engine/types";
import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";

const HOT = new Set(["O", "B", "A"]);

export class DiveScreen implements Screen {
  id = "dive";
  name = "DIVE";
  hint = "tap a body for its dossier";

  mount(f: Field, nav: Navigator, params?: Record<string, unknown>): void {
    f.cb = {};
    f.nodes.clear();
    f.edges = [];
    f.hidePlate();

    const id = (params?.systemId as string) || SYSTEMS[0].id;
    const sys = systemById(id) ?? SYSTEMS[0];

    // central star
    const star = makeNode({
      id: `star-${sys.id}`,
      x: 0,
      y: 0,
      r: 16,
      hue: HOT.has(sys.specClass) ? "teal" : "gold",
      pulse: true,
      label: sys.name,
      labelSub: sys.id,
      data: { kind: "star" },
    });
    f.nodes.set(star.id, star);

    // rings of ~8 bodies
    const counts: number[] = [];
    for (let rem = sys.bodies.length; rem > 0; rem -= 8) counts.push(Math.min(8, rem));

    sys.bodies.forEach((b, i) => {
      const p = concentricOrbit(i, counts, { baseR: 90, ringGap: 64 });
      const hue = b.kind === "station" || b.kind === "belt" ? "teal" : "gold";
      const r = Math.max(3, Math.min(6, 3 + ((b.size - 0.4) / 1.4) * 3));
      const node = makeNode({
        id: b.id,
        x: p.x,
        y: p.y,
        r: b.kind === "moon" ? Math.max(2, r * 0.7) : r,
        hue,
        data: {
          kind: "body",
          label: b.name,
          labelSub: `${b.kind.toUpperCase()} · ORBIT ${b.orbit + 1}`,
        },
      });
      f.nodes.set(b.id, node);
      // membership thread: solid gold to planets/moons, teal to stations/belts
      f.edges.push(makeEdge(star.id, b.id, hue, 0));
    });

    // dashed adjacency between consecutive bodies in orbital order
    for (let i = 1; i < sys.bodies.length; i++) {
      f.edges.push(makeEdge(sys.bodies[i - 1].id, sys.bodies[i].id, "dashed", 0.12));
    }

    f.cb.onStarTap = (n) => {
      const d = n.data as { kind: string; label?: string; labelSub?: string };
      if (d.kind === "star") {
        f.showPlate({
          title: sys.name,
          sub: `${sys.id} · ${sys.spectral}`,
          meta: `${sys.sector} SECTOR · ${sys.bodies.length} BODIES · ${sys.tags.join(" / ")}`,
        });
        return;
      }
      n.label = d.label;
      n.labelSub = d.labelSub;
      n.tglow = 0.85;
      const body = sys.bodies.find((b) => b.id === n.id);
      if (!body) return;
      f.showPlate({
        title: body.name,
        sub: `${body.kind.toUpperCase()} · ORBIT ${body.orbit + 1}`,
        meta: sys.id,
      });
    };
    f.cb.onVoidTap = () => nav.go("chart");
    f.cb.onFlick = () => nav.dial();
    f.cb.onLadder = (dir) => nav.ladder(dir, "dive");

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
