/* NIGHTWATCH — a deep-space screen.
   Patrol the dark sectors: dim unlit systems on a phyllotaxis field,
   with a dashed patrol route linking every sixth system.
   Tap a node to kindle it — the sweep is logged. */

import { Field } from "../engine/field";
import { makeNode, makeEdge, StarNode } from "../engine/types";
import { phyllotaxis, rng } from "../engine/layouts";
import { SYSTEMS, DARK_SECTORS } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class NightwatchScreen implements Screen {
  id = "nightwatch";
  name = "NIGHTWATCH";
  hint = "patrol the dark sectors";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const R = rng(7708);
    const dark = SYSTEMS.filter((s) => DARK_SECTORS.includes(s.sector));
    const ids: string[] = [];

    dark.forEach((s, i) => {
      const pos = phyllotaxis(i, { scale: 34, xCompress: 0.62 });
      const nid = `nw-${s.id}`;
      ids.push(nid);
      f.nodes.set(
        nid,
        makeNode({
          id: nid,
          x: pos.x,
          y: pos.y,
          r: 3 + R() * 2,
          hue: "gold",
          glow: 0,
          tglow: 0,
          data: s,
        }),
      );
    });

    for (let i = 0; i + 6 < ids.length; i += 6) {
      f.edges.push(makeEdge(ids[i], ids[i + 6], "dashed", 0.3));
      const e = f.edges[f.edges.length - 1];
      e.kind = "teal";
    }

    f.cb = {
      onStarTap: (n: StarNode) => {
        const s = n.data as { id: string; name: string; sector: string };
        n.tglow = 0.9;
        n.label = s.name;
        nav.plate.show({
          title: s.name,
          sub: `${s.id} · DARK SECTOR ${s.sector}`,
          meta: "PATROL SWEEP LOGGED",
        });
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "nightwatch"),
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
