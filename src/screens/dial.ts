/* DIAL — the sector rolodex. Twelve sectors as rows on a drum; scroll the
   scale ladder to roll it, tap a row to jump to its sector on the chart. */

import { SECTORS, systemsInSector } from "../data/galaxy";
import { drumRow } from "../engine/layouts";
import { makeNode } from "../engine/types";
import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";

const ROW_H = 92;

export class DialScreen implements Screen {
  id = "dial";
  name = "DIAL";
  hint = "scroll to a sector · tap to jump";
  private t = 0;

  mount(f: Field, nav: Navigator): void {
    f.cb = {};
    f.nodes.clear();
    f.edges = [];
    f.hidePlate();
    this.t = 0;

    SECTORS.forEach((sec, i) => {
      const row = drumRow(i, this.t, { rowH: ROW_H, width: 340 });
      f.nodes.set(
        `dial-${sec.id}`,
        makeNode({
          id: `dial-${sec.id}`,
          x: row.x,
          y: row.y,
          r: 6 * row.scale,
          hue: "gold",
          data: { sector: sec.id },
        }),
      );
    });

    const refresh = (tweenMs = 0) => {
      SECTORS.forEach((sec, i) => {
        const row = drumRow(i, this.t, { rowH: ROW_H, width: 340 });
        const node = f.nodes.get(`dial-${sec.id}`);
        if (!node) return;
        node.tx = row.x;
        node.ty = row.y;
        node.tr = 6 * row.scale;
        // labels only kindle on rows near the detent
        if (Math.abs((i - this.t) * ROW_H) < ROW_H) {
          node.label = sec.name;
          node.labelSub = `${systemsInSector(sec.id).length} SYSTEMS`;
        } else {
          node.label = undefined;
          node.labelSub = undefined;
        }
      });
      if (tweenMs > 0) f.settleNodes(tweenMs);
    };

    refresh(0);

    f.cb.onStarTap = (node) => {
      const d = node.data as { sector: string };
      nav.go("chart", { sector: d.sector });
    };
    f.cb.onFlick = () => nav.go("chart");
    f.cb.onLadder = (dir) => {
      this.t = Math.max(0, Math.min(SECTORS.length - 1, this.t + dir));
      refresh(220);
    };

    f.cam.tx = 0;
    f.cam.ty = 0;
    f.cam.tzoom = 1;
    f.settleCamera();
    f.settleNodes();
    f.playBloom();
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
