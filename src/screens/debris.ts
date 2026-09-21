/* DEBRIS — a deep-space screen.
   A dense field of sampled debris-belt bodies. Tap one to kindle it and
   log the sample. Drag pans; the ladder hands off to the shell. */

import { Field } from "../engine/field";
import { makeNode, StarNode } from "../engine/types";
import { phyllotaxis, rng } from "../engine/layouts";
import { SYSTEMS } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class DebrisScreen implements Screen {
  id = "debris";
  name = "DEBRIS";
  hint = "tap to sample the field";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const R = rng(7703);
    const belts: Array<{ name: string; systemId: string }> = [];
    for (const s of SYSTEMS) {
      for (const b of s.bodies) {
        if (b.kind === "belt") {
          belts.push({ name: b.name, systemId: s.id });
          if (belts.length >= 200) break;
        }
      }
      if (belts.length >= 200) break;
    }

    belts.forEach((b, i) => {
      const pos = phyllotaxis(i, { scale: 26, xCompress: 0.8 });
      f.nodes.set(
        `db-${i}`,
        makeNode({
          id: `db-${i}`,
          x: pos.x,
          y: pos.y,
          r: 2 + R() * 1.5,
          hue: "gold",
          glow: 0.2,
          tglow: 0.2,
          data: b,
        }),
      );
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        const b = n.data as { name: string; systemId: string };
        n.tglow = 0.85;
        n.label = b.name;
        f.kindleNear(n.x, n.y, 70);
        nav.plate.show({
          title: b.name,
          sub: `DEBRIS BELT · ${b.systemId}`,
          meta: "DENSITY SAMPLE",
        });
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "debris"),
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
