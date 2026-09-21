/* SIGNAL — a deep-space screen.
   Unidentified signals on a wide orbit. Tap a signal to advance its
   classification: UNREVIEWED → LOGGED → TRIAGED. */

import { Field } from "../engine/field";
import { makeNode, StarNode } from "../engine/types";
import { singleOrbit } from "../engine/layouts";
import { SIGNALS } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

const STAGES = ["UNREVIEWED", "LOGGED", "TRIAGED"] as const;

export class SignalScreen implements Screen {
  id = "signal";
  name = "SIGNAL";
  hint = "tap to classify";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    SIGNALS.forEach((s, i) => {
      const p = singleOrbit(i, SIGNALS.length, 300);
      f.nodes.set(
        `sig-${s.id}`,
        makeNode({
          id: `sig-${s.id}`,
          x: p.x,
          y: p.y,
          r: 5,
          hue: "teal",
          glow: 0.3,
          tglow: 0.3,
          label: s.pattern,
          data: { stage: 0, signal: s },
        }),
      );
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        const d = n.data as { stage: number; signal: { id: string; band: string; pattern: string } };
        d.stage = (d.stage + 1) % STAGES.length;
        const stage = STAGES[d.stage];
        if (d.stage > 0) {
          n.hue = "gold";
          n.tglow = 0.7;
        } else {
          n.hue = "teal";
          n.tglow = 0.3;
        }
        n.label = `${d.signal.id} · ${stage}`;
        f.kindleNear(n.x, n.y, 80);
        nav.plate.show({
          title: d.signal.id,
          sub: `${d.signal.band} · ${d.signal.pattern}`,
          meta: `STATUS: ${stage}`,
        });
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "signal"),
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
