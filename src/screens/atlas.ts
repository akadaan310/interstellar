/* ATLAS — a deep-space screen.
   Waypoints grouped by kind on concentric rings — one ring per kind —
   with a small gold anchor node marking each ring's start. */

import { Field } from "../engine/field";
import { makeNode, StarNode } from "../engine/types";
import { concentricOrbit } from "../engine/layouts";
import { WAYPOINTS } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class AtlasScreen implements Screen {
  id = "atlas";
  name = "ATLAS";
  hint = "tap a waypoint";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const kinds: string[] = [];
    for (const w of WAYPOINTS) if (!kinds.includes(w.kind)) kinds.push(w.kind);
    const grouped = kinds.map((k) => WAYPOINTS.filter((w) => w.kind === k));
    const counts = grouped.map((g) => g.length);

    kinds.forEach((kind, ring) => {
      const anchor = concentricOrbit(0, counts, { baseR: 100, ringGap: 60 });
      const rad = Math.hypot(anchor.x, anchor.y);
      const ux = rad > 0 ? anchor.x / rad : 1;
      const uy = rad > 0 ? anchor.y / rad : 0;
      f.nodes.set(
        `anchor-${kind}`,
        makeNode({
          id: `anchor-${kind}`,
          x: ux * (100 + ring * 60) * 0.82,
          y: uy * (100 + ring * 60) * 0.82,
          r: 4,
          hue: "gold",
          glow: 0.5,
          tglow: 0.5,
          label: kind,
        }),
      );
    });

    let flat = 0;
    grouped.forEach((group) => {
      group.forEach((w) => {
        const pos = concentricOrbit(flat, counts, { baseR: 100, ringGap: 60 });
        f.nodes.set(
          `wp-${w.id}`,
          makeNode({
            id: `wp-${w.id}`,
            x: pos.x,
            y: pos.y,
            r: 6,
            hue: "teal",
            glow: 0.3,
            tglow: 0.3,
            label: w.name,
            data: w,
          }),
        );
        flat++;
      });
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        if (n.id.startsWith("anchor-")) return;
        const w = n.data as { id: string; name: string; systemId: string; kind: string };
        n.tglow = 0.85;
        f.kindleNear(n.x, n.y, 80);
        nav.plate.show({
          title: w.name,
          sub: `${w.id} · ${w.kind}`,
          meta: w.systemId,
        });
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "atlas"),
    };

    f.cam.tx = 0;
    f.cam.ty = 0;
    f.cam.tzoom = 1;
    f.settleCamera(560);
    f.settleNodes(560);
    f.playBloom();
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
