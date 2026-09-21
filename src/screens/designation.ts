/* DESIGNATION — naming chain. SECTOR → SYSTEM → four bodies as one
   vertical linked chain. Tap a node to walk the highlight from the sector
   down to that level and read its dossier. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { SECTORS, SYSTEMS } from "../data/galaxy";

interface ChainNode {
  kind: "chain";
  level: number; // 0 = sector, 1 = system, 2..5 = bodies
}

const CHAIN_GAP = 120;

export class DesignationScreen implements Screen {
  id = "designation";
  name = "DESIGNATION";
  hint = "tap to walk the chain";

  private chainIds: string[] = [];
  private systemCount = 0;

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges = [];
    f.cb = {};
    this.chainIds = [];

    const sys = SYSTEMS.find((s) => s.bodies.length >= 4) ?? SYSTEMS[0];
    const sector = SECTORS.find((s) => s.id === sys.sector);
    this.systemCount = SYSTEMS.filter((s) => s.sector === sys.sector).length;
    const bodies = sys.bodies.slice(0, 4);

    const levels: Array<{ id: string; label: string; labelSub: string; r: number }> = [
      {
        id: "des-sector",
        label: sector ? sector.name : sys.sector,
        labelSub: "SECTOR",
        r: 10,
      },
      { id: "des-system", label: sys.name, labelSub: `${sys.id} · SYSTEM`, r: 8 },
      ...bodies.map((b, i) => ({
        id: `des-body-${i}`,
        label: b.name,
        labelSub: `${b.kind.toUpperCase()} · ORBIT ${i + 1}`,
        r: 5.5,
      })),
    ];
    const top = -((levels.length - 1) * CHAIN_GAP) / 2;

    levels.forEach((lv, i) => {
      const node = makeNode({
        id: lv.id,
        x: 0,
        y: top + i * CHAIN_GAP,
        r: lv.r,
        hue: "gold",
        label: lv.label,
        labelSub: lv.labelSub,
      });
      node.data = { kind: "chain", level: i } as ChainNode;
      f.nodes.set(lv.id, node);
      this.chainIds.push(lv.id);
      if (i > 0) f.edges.push(makeEdge(levels[i - 1].id, lv.id, "gold", 0));
    });

    f.cb.onStarTap = (n) => {
      const d = n.data as ChainNode | undefined;
      if (!d || d.kind !== "chain") return;
      const lvl = d.level;
      // highlight the path sector → tapped level
      this.chainIds.forEach((id, i) => {
        const e = f.edges.find((x) => x.b === id);
        if (e) e.tlit = i <= lvl && i > 0 ? 1 : 0;
      });
      f.showPlate(this.dossier(sys, sector?.name, bodies, lvl));
    };
    f.cb.onVoidTap = () => {
      for (const e of f.edges) e.tlit = 0;
      f.hidePlate();
    };

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.85;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  private dossier(
    sys: (typeof SYSTEMS)[number],
    sectorName: string | undefined,
    bodies: (typeof sys.bodies)[number][],
    level: number,
  ): { title: string; sub?: string; meta?: string } {
    if (level === 0) {
      return {
        title: sectorName ?? sys.sector,
        sub: "SECTOR DOSSIER",
        meta: `${this.systemCount} SYSTEMS CHARTED`,
      };
    }
    if (level === 1) {
      return {
        title: sys.name,
        sub: `${sys.id} · ${sys.sector}`,
        meta: `${sys.spectral} · MAG ${sys.magnitude.toFixed(1)} · ${sys.bodies.length} BODIES`,
      };
    }
    const b = bodies[level - 2];
    if (!b) return { title: sys.name, sub: "SYSTEM" };
    return {
      title: b.name,
      sub: `${b.kind.toUpperCase()} · ${sys.name}`,
      meta: `DESIGNATION ${b.id} · ORBIT RANK ${b.orbit + 1}`,
    };
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
