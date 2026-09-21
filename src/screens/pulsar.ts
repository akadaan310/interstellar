/* PULSAR — a deep-space screen.
   Charted pulsars on a phyllotaxis field; each one pulses like a lighthouse.
   Tap to read its period. Long-press a pulsar to jump to the signal screen. */

import { Field } from "../engine/field";
import { makeNode, StarNode } from "../engine/types";
import { phyllotaxis, rng } from "../engine/layouts";
import { PULSARS } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class PulsarScreen implements Screen {
  id = "pulsar";
  name = "PULSAR";
  hint = "tap a pulsar to read its period";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const R = rng(7702);
    PULSARS.forEach((p, i) => {
      const pos = phyllotaxis(i, { scale: 40, xCompress: 0.62 });
      f.nodes.set(
        `psr-${p.id}`,
        makeNode({
          id: `psr-${p.id}`,
          x: pos.x,
          y: pos.y,
          r: 5 + R() * 2,
          hue: "gold",
          glow: 0.25,
          tglow: 0.25,
          pulse: true,
          label: p.id,
          data: p,
        }),
      );
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        const p = n.data as { id: string; period: number; systemId: string };
        n.tglow = 0.9;
        f.kindleNear(n.x, n.y, 90);
        nav.plate.show({
          title: p.id,
          sub: `PERIOD ${p.period.toFixed(3)} S`,
          meta: p.systemId,
        });
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLongPress: () => nav.go("signal"),
      onLadder: (dir) => nav.ladder(dir, "pulsar"),
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
