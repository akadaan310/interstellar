/* BEACON — a deep-space screen.
   Navigation beacons along a status arc. Color reads the beacon state;
   a curved dashed route links consecutive beacons. */

import { Field } from "../engine/field";
import { makeNode, makeEdge, StarNode, Hue } from "../engine/types";
import { BEACONS } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class BeaconScreen implements Screen {
  id = "beacon";
  name = "BEACON";
  hint = "tap a beacon for its status";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const sorted = [...BEACONS].sort((a, b) => a.leg - b.leg);
    const RADIUS = 380;
    let prevId: string | null = null;

    sorted.forEach((b, i) => {
      const angle = -Math.PI / 2 + (i / sorted.length) * Math.PI;
      const x = Math.cos(angle) * RADIUS;
      const y = Math.sin(angle) * RADIUS;
      let hue: Hue = "gold";
      let glow = 0.3;
      let pulse = false;
      if (b.status === "HOMING") {
        hue = "gold";
        glow = 0.6;
      } else if (b.status === "DISTRESS") {
        hue = "teal";
        glow = 0.7;
        pulse = true;
      } else if (b.status === "SILENT") {
        hue = "gold";
        glow = 0;
      } else {
        hue = "gold"; // RELAY
        glow = 0.45;
      }
      const nid = `bcn-${b.id}`;
      f.nodes.set(
        nid,
        makeNode({
          id: nid,
          x,
          y,
          r: 6,
          hue,
          glow,
          tglow: glow,
          pulse,
          label: b.id,
          labelSub: b.status,
          data: b,
        }),
      );
      if (prevId) f.edges.push(makeEdge(prevId, nid, "dashed", 0.45));
      prevId = nid;
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        const b = n.data as { id: string; systemId: string; status: string; leg: number };
        n.tglow = Math.max(n.tglow, 0.8);
        nav.plate.show({
          title: b.id,
          sub: `STATUS: ${b.status}`,
          meta: `${b.systemId} · LEG ${b.leg}`,
        });
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "beacon"),
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
