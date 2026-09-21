/* TIDE — a deep-space screen.
   Station orbital cycles: each station sits at a center, ringed by a
   dotted orbit of eight dim dots, with one bright satellite dot at the
   station's recorded phase angle. Tap the station or its satellite. */

import { Field } from "../engine/field";
import { makeNode, StarNode } from "../engine/types";
import { singleOrbit } from "../engine/layouts";
import { STATION_CYCLES } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class TideScreen implements Screen {
  id = "tide";
  name = "TIDE";
  hint = "tap a station for its cycle";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const RADIUS = 300;
    const ORBIT_R = 40;

    STATION_CYCLES.forEach((c, i) => {
      const center = singleOrbit(i, STATION_CYCLES.length, RADIUS);
      const sid = `st-${c.id}`;
      f.nodes.set(
        sid,
        makeNode({
          id: sid,
          x: center.x,
          y: center.y,
          r: 6,
          hue: "gold",
          glow: 0.4,
          tglow: 0.4,
          label: c.station,
          data: { cycle: c, satellite: false },
        }),
      );
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        f.nodes.set(
          `${sid}-dot-${k}`,
          makeNode({
            id: `${sid}-dot-${k}`,
            x: center.x + Math.cos(a) * ORBIT_R,
            y: center.y + Math.sin(a) * ORBIT_R,
            r: 1.6,
            hue: "teal",
            glow: 0.15,
            tglow: 0.15,
          }),
        );
      }
      const sat = {
        x: center.x + Math.cos(c.phase) * ORBIT_R,
        y: center.y + Math.sin(c.phase) * ORBIT_R,
      };
      f.nodes.set(
        `${sid}-sat`,
        makeNode({
          id: `${sid}-sat`,
          x: sat.x,
          y: sat.y,
          r: 3,
          hue: "teal",
          glow: 0.6,
          tglow: 0.6,
          pulse: true,
          data: { cycle: c, satellite: true },
        }),
      );
    });

    const show = (c: { id: string; station: string; periodH: number }) => {
      nav.plate.show({
        title: c.station,
        sub: `ORBITAL PERIOD ${c.periodH.toFixed(1)} H`,
        meta: c.id,
      });
    };

    f.cb = {
      onStarTap: (n: StarNode) => {
        const d = n.data as { cycle?: { id: string; station: string; periodH: number } } | undefined;
        if (!d?.cycle) return;
        n.tglow = 0.9;
        f.kindleNear(n.x, n.y, 70);
        show(d.cycle);
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "tide"),
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
