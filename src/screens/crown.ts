/* CROWN — a deep-space screen.
   The brightest charted stars as a rosette: eight anchor jewels,
   each with a two-attendant leaf fan of the next-brightest systems. */

import { Field } from "../engine/field";
import { makeNode, StarNode } from "../engine/types";
import { rosettePattern, rosetteLeaf, rng } from "../engine/layouts";
import { SYSTEMS } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class CrownScreen implements Screen {
  id = "crown";
  name = "CROWN";
  hint = "the brightest charted stars";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges.length = 0;

    const R = rng(7706);
    const brightest = [...SYSTEMS].sort((a, b) => a.magnitude - b.magnitude).slice(0, 24);
    const jewels = brightest.slice(0, 8);
    const attendants = brightest.slice(8); // 16 = 2 per jewel

    jewels.forEach((s, p) => {
      const pos = rosettePattern(p, 8, 170);
      const jid = `jewel-${s.id}`;
      f.nodes.set(
        jid,
        makeNode({
          id: jid,
          x: pos.x,
          y: pos.y,
          r: 9 + R() * 2,
          hue: "gold",
          glow: 0.5,
          tglow: 0.5,
          pulse: true,
          label: s.name,
          data: { kind: "jewel", system: s },
        }),
      );
      for (let k = 0; k < 2; k++) {
        const att = attendants[p * 2 + k];
        if (!att) continue;
        const leaf = rosetteLeaf(pos.angle, k, 2, 280);
        const aid = `att-${att.id}`;
        f.nodes.set(
          aid,
          makeNode({
            id: aid,
            x: leaf.x,
            y: leaf.y,
            r: 4.5,
            hue: "teal",
            glow: 0.25,
            tglow: 0.25,
            label: att.name,
            data: { kind: "attendant", system: att, jewel: s.name },
          }),
        );
      }
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        const d = n.data as {
          kind: string;
          system: { id: string; name: string; magnitude: number; spectral: string; sector: string };
          jewel?: string;
        };
        const s = d.system;
        n.tglow = 0.9;
        f.kindleNear(n.x, n.y, 90);
        if (d.kind === "jewel") {
          nav.plate.show({
            title: s.name,
            sub: `${s.id} · MAG ${s.magnitude.toFixed(1)}`,
            meta: `${s.spectral} · ${s.sector} SECTOR`,
          });
        } else {
          nav.plate.show({
            title: s.name,
            sub: `${s.id} · MAG ${s.magnitude.toFixed(1)}`,
            meta: `${s.spectral} · ATTENDANT OF ${d.jewel}`,
          });
        }
      },
      onThreadTap: () => {},
      onVoidTap: () => nav.plate.hide(),
      onLadder: (dir) => nav.ladder(dir, "crown"),
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
