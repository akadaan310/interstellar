/* MANEUVER — action field. A ship node at center, eight maneuver
   actions on a single orbit. Tap an action to preview it; long-press to
   open the lattice. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { singleOrbit } from "../engine/layouts";

interface ActionNode {
  kind: "ship" | "action";
  action?: string;
}

const ACTIONS: Array<{ name: string; desc: string }> = [
  { name: "BURN", desc: "Main drive burn · delta-v committed" },
  { name: "SLINGSHOT", desc: "Gravity assist pass · velocity borrowed" },
  { name: "DOCK", desc: "Hard dock at station berth" },
  { name: "HOLD", desc: "Station-keeping burn · position locked" },
  { name: "SCAN", desc: "Deep sweep of local sky" },
  { name: "RELAY", desc: "Bounce signal through relay chain" },
  { name: "DRIFT", desc: "Engines cold · ballistic coast" },
  { name: "ANCHOR", desc: "Moored to mass point" },
];

const ORBIT_R = 260;

export class ManeuverScreen implements Screen {
  id = "maneuver";
  name = "MANEUVER";
  hint = "tap an action to preview";

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges = [];
    f.cb = {};

    const ship = makeNode({
      id: "man-ship",
      x: 0,
      y: 0,
      r: 12,
      hue: "gold",
      pulse: true,
      label: "NAV-01",
      labelSub: "VESSEL",
    });
    ship.data = { kind: "ship" } as ActionNode;
    f.nodes.set(ship.id, ship);

    ACTIONS.forEach((a, i) => {
      const p = singleOrbit(i, ACTIONS.length, ORBIT_R);
      const node = makeNode({
        id: `man-act-${a.name}`,
        x: p.x,
        y: p.y,
        r: 6,
        hue: "teal",
        label: a.name,
        labelSub: "ACTION",
      });
      node.data = { kind: "action", action: a.name } as ActionNode;
      f.nodes.set(node.id, node);
      f.edges.push(makeEdge("man-ship", node.id, "gold", 0.14));
    });

    f.cb.onStarTap = (n) => {
      const d = n.data as ActionNode | undefined;
      if (!d || d.kind !== "action" || !d.action) return;
      for (const e of f.edges) e.tlit = e.b === n.id ? 1 : 0;
      const a = ACTIONS.find((x) => x.name === d.action);
      f.showPlate({
        title: d.action,
        sub: "MANEUVER PREVIEW",
        meta: a?.desc ?? "",
      });
    };
    f.cb.onVoidTap = () => {
      for (const e of f.edges) e.tlit = 0;
      f.hidePlate();
    };
    f.cb.onLongPress = (n) => {
      const d = n.data as ActionNode | undefined;
      if (d && d.kind === "action") nav.go("lattice");
    };

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.9;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
