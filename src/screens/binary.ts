/* BINARY — a deep-space screen.
   Binary pairs: two close nodes joined by a curved orbit thread.
   Tap either star, or the orbit thread, to read the pair's period. */

import { Field } from "../engine/field";
import { makeNode, makeEdge, StarNode, Edge } from "../engine/types";
import { phyllotaxis } from "../engine/layouts";
import { BINARIES } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class BinaryScreen implements Screen {
  id = "binary";
  name = "BINARY";
  hint = "tap a pair to read its period";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const show = (nav_: Navigator, field: Field, a: string, b: string, periodD: number) => {
      nav_.plate.show({
        title: `${a} / ${b}`,
        sub: "BINARY PAIR",
        meta: `PERIOD ${periodD.toFixed(0)} DAYS`,
      });
      void field;
    };

    BINARIES.forEach((pair, i) => {
      const c = phyllotaxis(i, { scale: 90, xCompress: 0.62 });
      const aid = `bin-a-${i}`;
      const bid = `bin-b-${i}`;
      f.nodes.set(
        aid,
        makeNode({ id: aid, x: c.x - 12, y: c.y, r: 6, hue: "gold", glow: 0.3, tglow: 0.3, data: pair }),
      );
      f.nodes.set(
        bid,
        makeNode({ id: bid, x: c.x + 12, y: c.y, r: 5, hue: "teal", glow: 0.3, tglow: 0.3, data: pair }),
      );
      f.edges.push(makeEdge(aid, bid, "gold", 0.5));
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        const p = n.data as { a: string; b: string; periodD: number };
        n.tglow = 0.85;
        f.kindleNear(n.x, n.y, 80);
        show(nav, f, p.a, p.b, p.periodD);
      },
      onThreadTap: (e: Edge) => {
        const n = f.nodes.get(e.a) ?? f.nodes.get(e.b);
        const p = n?.data as { a: string; b: string; periodD: number } | undefined;
        if (!p) return;
        e.tlit = 1; // light the orbit thread
        show(nav, f, p.a, p.b, p.periodD);
      },
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "binary"),
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
