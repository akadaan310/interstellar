/* CHART — the full sector field. Every charted system as a phyllotaxis field.
   Tap a system to dive into it. Drag pans the sky. Flick opens the sector dial. */

import { SECTORS, SYSTEMS, systemById } from "../data/galaxy";
import { phyllotaxis } from "../engine/layouts";
import { makeNode } from "../engine/types";
import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";

const HOT = new Set(["O", "B", "A"]);

export class ChartScreen implements Screen {
  id = "chart";
  name = "CHART";
  hint = "tap a system to dive · drag to pan";
  private goTimer = 0;

  mount(f: Field, nav: Navigator, params?: Record<string, unknown>): void {
    f.cb = {};
    f.nodes.clear();
    f.edges = [];
    f.hidePlate();

    SYSTEMS.forEach((s, i) => {
      const p = phyllotaxis(i, { scale: 34, xCompress: 0.54 });
      const n = makeNode({
        id: s.id,
        x: p.x,
        y: p.y,
        r: Math.max(4, Math.min(9, 10 - s.magnitude)),
        hue: HOT.has(s.specClass) ? "teal" : "gold",
        data: { label: s.name, labelSub: s.id },
      });
      f.nodes.set(s.id, n);
    });

    f.cb.onStarTap = (n) => {
      const sys = systemById(n.id);
      if (!sys) return;
      const d = n.data as { label: string; labelSub: string };
      n.label = d.label;
      n.labelSub = d.labelSub;
      n.tglow = 0.85;
      f.showPlate({
        title: sys.name,
        sub: `${sys.id} · ${sys.spectral}`,
        meta: `${sys.sector} SECTOR · ${sys.bodies.length} BODIES`,
      });
      window.clearTimeout(this.goTimer);
      this.goTimer = window.setTimeout(() => nav.go("dive", { systemId: sys.id }), 480);
    };
    f.cb.onVoidTap = () => f.hidePlate();
    f.cb.onFlick = () => nav.dial();
    f.cb.onLadder = (dir) => nav.ladder(dir, "chart");

    // arriving from the dial focuses the chosen sector's neighborhood
    const sectorId = params?.sector as string | undefined;
    const sec = sectorId ? SECTORS.find((s) => s.id === sectorId) : undefined;
    f.cam.tx = sec ? sec.cx : 0;
    f.cam.ty = sec ? sec.cy : 0;
    f.cam.tzoom = 1;
    f.settleCamera();
    f.settleNodes();
    f.playBloom();
  }

  unmount(f: Field): void {
    window.clearTimeout(this.goTimer);
    f.cb = {};
    f.hidePlate();
  }
}
