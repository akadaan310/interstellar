/* HAIL — call/orbit. One central relay ringed by three concentric
   rings of listener outposts. Tap the relay to send a hail that expands
   ring by ring, then decays. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { concentricOrbit } from "../engine/layouts";
import { SYSTEMS } from "../data/galaxy";

const RING_COUNTS = [8, 12, 16];
const BASE_R = 110;
const RING_GAP = 70;

interface OutpostNode {
  kind: "outpost" | "relay";
  ring?: number;
  systemId?: string;
  designation?: string;
}

export class HailScreen implements Screen {
  id = "hail";
  name = "HAIL";
  hint = "tap the relay to hail";

  private outposts = 0;

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges = [];
    f.cb = {};
    this.outposts = 0;

    const relay = makeNode({
      id: "hail-relay",
      x: 0,
      y: 0,
      r: 12,
      hue: "teal",
      pulse: true,
      label: "RELAY PRIME",
      labelSub: "CALL NODE",
    });
    relay.data = { kind: "relay" } as OutpostNode;
    f.nodes.set(relay.id, relay);

    const total = RING_COUNTS.reduce((a, b) => a + b, 0);
    for (let i = 0; i < total; i++) {
      const { x, y, ring } = concentricOrbit(i, RING_COUNTS, {
        baseR: BASE_R,
        ringGap: RING_GAP,
      });
      const sys = SYSTEMS[i % SYSTEMS.length];
      const designation = `${sys.name} OUTPOST`;
      const node = makeNode({
        id: `hail-out-${i}`,
        x,
        y,
        r: 4.5,
        hue: "teal",
        label: designation,
        labelSub: `RING ${ring + 1}`,
      });
      node.data = {
        kind: "outpost",
        ring,
        systemId: sys.id,
        designation,
      } as OutpostNode;
      f.nodes.set(node.id, node);
      f.edges.push(makeEdge("hail-relay", node.id, "dashed", 0.06));
      this.outposts++;
    }

    f.cb.onStarTap = (n) => {
      const d = n.data as OutpostNode | undefined;
      if (!d) return;
      if (d.kind === "relay") this.hail(f);
      else if (d.kind === "outpost") {
        n.tglow = 0.7;
        f.showPlate({
          title: d.designation ?? "OUTPOST",
          sub: `RING ${(d.ring ?? 0) + 1} · LISTENING`,
          meta: d.systemId,
        });
      }
    };
    f.cb.onVoidTap = () => {
      for (const n of f.nodes.values()) n.tglow = 0;
      f.hidePlate();
    };

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.8;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  /** expanding glow: ring 0 lights first, each ring 40ms later, then decay */
  private hail(f: Field): void {
    const ringNodes: Map<number, string[]> = new Map();
    for (const n of f.nodes.values()) {
      const d = n.data as OutpostNode | undefined;
      if (d && d.kind === "outpost") {
        const arr = ringNodes.get(d.ring ?? 0) ?? [];
        arr.push(n.id);
        ringNodes.set(d.ring ?? 0, arr);
      }
    }
    const rings = [...ringNodes.keys()].sort((a, b) => a - b);
    const per = 200;
    const expand = rings.length * MS.ringStagger + per;
    f.tween(expand, (k) => {
      const cursor = k * expand;
      rings.forEach((ring, j) => {
        const local = Math.min(1, Math.max(0, (cursor - j * MS.ringStagger) / per));
        for (const id of ringNodes.get(ring) ?? []) {
          const n = f.nodes.get(id);
          if (n) n.tglow = local * 0.9;
        }
      });
    }, () => {
      f.tween(700, (k) => {
        for (const n of f.nodes.values()) {
          const d = n.data as OutpostNode | undefined;
          if (d && d.kind === "outpost") n.tglow = 0.9 * (1 - k);
        }
      });
    });
    const relay = f.nodes.get("hail-relay");
    if (relay) relay.tglow = 1;
    f.showPlate({
      title: "HAIL SENT",
      sub: `${this.outposts} OUTPOSTS RINGED`,
      meta: "SIGNAL EXPANDING",
    });
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
