/* SPECTRA — the spectral rosette. Seven star classes on an inner orbit,
   their charted members fanned on the outer ring. Tap a class to fan its
   stars; tap a member for its dossier. */

import { SYSTEMS, systemById } from "../data/galaxy";
import { rosetteLeaf, rosettePattern } from "../engine/layouts";
import { makeNode } from "../engine/types";
import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";

const CLASSES = ["O", "B", "A", "F", "G", "K", "M"];
const INNER_R = 150;
const OUTER_R = 330;

type SpectraData =
  | { kind: "class"; cls: string; count: number }
  | { kind: "member"; systemId: string; label: string; labelSub: string };

export class SpectraScreen implements Screen {
  id = "spectra";
  name = "SPECTRA";
  hint = "tap a class to fan its stars";

  mount(f: Field, nav: Navigator): void {
    f.cb = {};
    f.nodes.clear();
    f.edges = [];
    f.hidePlate();

    CLASSES.forEach((cls, p) => {
      const c = rosettePattern(p, CLASSES.length, INNER_R);
      const members = SYSTEMS.filter((s) => s.specClass === cls).slice(0, 10);
      f.nodes.set(
        `class-${cls}`,
        makeNode({
          id: `class-${cls}`,
          x: c.x,
          y: c.y,
          r: 8,
          hue: "gold",
          label: `${cls}-CLASS`,
          labelSub: `${members.length} CHARTED`,
          data: { kind: "class", cls, count: members.length } as SpectraData,
        }),
      );
      members.forEach((s, k) => {
        const leaf = rosetteLeaf(c.angle, k, members.length, OUTER_R);
        f.nodes.set(
          s.id,
          makeNode({
            id: s.id,
            x: leaf.x,
            y: leaf.y,
            r: 4,
            hue: "teal",
            data: { kind: "member", systemId: s.id, label: s.name, labelSub: s.id } as SpectraData,
          }),
        );
      });
    });

    f.cb.onStarTap = (node) => {
      const d = node.data as SpectraData;
      if (d.kind === "class") {
        // fan: brighten this class's members, dim the rest
        for (const nd of f.nodes.values()) {
          const dd = nd.data as SpectraData;
          nd.tglow = dd.kind === "member" && systemById(dd.systemId)?.specClass === d.cls ? 0.8 : 0;
        }
        f.settleNodes(300);
        f.showPlate({
          title: `${d.cls}-CLASS STARS`,
          sub: `${d.count} CHARTED`,
          meta: "TAP A MEMBER",
        });
        return;
      }
      const sys = systemById(d.systemId);
      if (!sys) return;
      node.label = d.label;
      node.labelSub = d.labelSub;
      node.tglow = 0.85;
      f.settleNodes(300);
      f.showPlate({
        title: sys.name,
        sub: `${sys.id} · ${sys.spectral}`,
        meta: `${sys.sector} SECTOR · ${sys.bodies.length} BODIES`,
      });
    };
    f.cb.onVoidTap = () => {
      for (const nd of f.nodes.values()) nd.tglow = 0;
      f.settleNodes(300);
      f.hidePlate();
    };
    f.cb.onFlick = () => nav.dial();
    f.cb.onLadder = (dir) => nav.ladder(dir, "spectra");

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
