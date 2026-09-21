/* NEBULA — a deep-space screen.
   Six nebulae as large soft nodes; member systems orbit each one.
   Tap a nebula to dive into it; tap void to pull back out. */

import { Field } from "../engine/field";
import { makeNode, makeEdge, StarNode } from "../engine/types";
import { singleOrbit, rng } from "../engine/layouts";
import { NEBULAE, systemsInSector } from "../data/galaxy";
import { Screen, Navigator } from "./screen";

export class NebulaScreen implements Screen {
  id = "nebula";
  name = "NEBULA";
  hint = "tap a nebula to enter";

  private nav: Navigator | null = null;
  private nebulae = new Map<string, { name: string; id: string; sector: string; count: number; x: number; y: number }>();

  mount(f: Field, nav: Navigator): void {
    this.nav = nav;
    f.nodes.clear();
    f.edges.length = 0;
    this.nebulae.clear();

    const R = rng(7701);
    const SCALE = 0.5;

    NEBULAE.forEach((neb, i) => {
      const x = neb.x * SCALE;
      const y = neb.y * SCALE;
      const r = 26 + R() * 14;
      const hue = i % 2 === 0 ? "teal" : "gold"; // emission / reflection alternating
      const nid = `neb-${neb.id}`;
      f.nodes.set(
        nid,
        makeNode({ id: nid, x, y, r, hue, glow: 0.5, tglow: 0.5, label: neb.name, data: { nebula: true } }),
      );
      const members = systemsInSector(neb.sector);
      this.nebulae.set(nid, { name: neb.name, id: neb.id, sector: neb.sector, count: members.length, x, y });
      members.forEach((s, j) => {
        const p = singleOrbit(j, members.length, neb.radius * SCALE * 0.55, i * 0.7, x, y);
        const sid = `sys-${s.id}`;
        f.nodes.set(
          sid,
          makeNode({ id: sid, x: p.x, y: p.y, r: 3 + R() * 2, hue: "gold", glow: 0.1, data: { nebulaId: nid } }),
        );
        if (j % 3 === 0) f.edges.push(makeEdge(nid, sid, "dashed", 0.25));
      });
    });

    f.cb = {
      onStarTap: (n: StarNode) => {
        const info = this.nebulae.get(n.id);
        if (info) {
          f.cam.tx = info.x;
          f.cam.ty = info.y;
          f.cam.tzoom = 1.6;
          f.settleCamera(520);
          nav.plate.show({
            title: info.name,
            sub: `${info.id} · ${info.sector} SECTOR`,
            meta: `${info.count} SYSTEMS INSIDE`,
          });
        } else {
          const host = (n.data as { nebulaId?: string } | undefined)?.nebulaId;
          if (host) f.kindleNear(n.x, n.y, 60);
        }
      },
      onThreadTap: () => {},
      onVoidTap: () => {
        f.cam.tx = 0;
        f.cam.ty = 0;
        f.cam.tzoom = 1;
        f.settleCamera(520);
        nav.plate.hide();
      },
      onLadder: (dir) => nav.ladder(dir, "nebula"),
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
    this.nav = null;
  }
}
