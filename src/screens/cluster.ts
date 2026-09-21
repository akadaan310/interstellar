/* CLUSTER — signal clusters. Signals grouped by band; each band is
   one cluster with a gold band node at its center and member signals on a
   small orbit around it. Clusters sit on one large orbit. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { singleOrbit } from "../engine/layouts";
import { SIGNALS, systemById, type Signal } from "../data/galaxy";

interface BandNode {
  kind: "band";
  band: string;
  count: number;
}
interface SignalNode {
  kind: "signal";
  band: string;
  signal: Signal;
}

const CLUSTER_R = 420;
const MEMBER_R = 120;

export class ClusterScreen implements Screen {
  id = "cluster";
  name = "CLUSTER";
  hint = "tap a cluster to resolve";

  private bands: Array<{ band: string; signals: Signal[] }> = [];

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges = [];
    f.cb = {};
    this.bands = [];

    const byBand = new Map<string, Signal[]>();
    for (const s of SIGNALS) {
      const arr = byBand.get(s.band) ?? [];
      arr.push(s);
      byBand.set(s.band, arr);
    }
    this.bands = [...byBand.entries()].map(([band, signals]) => ({ band, signals }));
    const nb = this.bands.length;

    this.bands.forEach(({ band, signals }, b) => {
      const c = singleOrbit(b, nb, CLUSTER_R);
      const bandId = `cluster-band-${b}`;
      const bandNode = makeNode({
        id: bandId,
        x: c.x,
        y: c.y,
        r: 9,
        hue: "gold",
        label: band,
        labelSub: `${signals.length} SIGNALS`,
      });
      bandNode.data = { kind: "band", band, count: signals.length } as BandNode;
      f.nodes.set(bandId, bandNode);

      signals.forEach((sig, m) => {
        const p = singleOrbit(m, signals.length, MEMBER_R, 0, c.x, c.y);
        const sigNode = makeNode({
          id: `cluster-sig-${b}-${m}`,
          x: p.x,
          y: p.y,
          r: 4,
          hue: "teal",
          label: sig.id,
          labelSub: sig.pattern,
        });
        sigNode.data = { kind: "signal", band, signal: sig } as SignalNode;
        f.nodes.set(sigNode.id, sigNode);
        f.edges.push(makeEdge(bandId, sigNode.id, "dashed", 0.18));
      });
    });

    f.cb.onStarTap = (n) => {
      const d = n.data as BandNode | SignalNode | undefined;
      if (!d) return;
      if (d.kind === "band") {
        const b = this.bands.findIndex((x) => x.band === d.band);
        for (const node of f.nodes.values()) {
          const nd = node.data as BandNode | SignalNode | undefined;
          if (nd && nd.kind === "signal") {
            node.tglow = nd.band === d.band ? 0.7 : 0.05;
          }
        }
        const sigs = this.bands[b]?.signals ?? [];
        f.showPlate({
          title: d.band,
          sub: `${sigs.length} SIGNALS`,
          meta: "TAP A SIGNAL",
        });
      } else if (d.kind === "signal") {
        const sig = d.signal;
        const sys = systemById(sig.systemId);
        f.showPlate({
          title: sig.id,
          sub: `${sig.pattern} · ${sig.band}`,
          meta: sys ? `${sys.name} · ${sig.systemId}` : sig.systemId,
        });
      }
    };
    f.cb.onVoidTap = () => {
      for (const n of f.nodes.values()) n.tglow = 0;
      f.hidePlate();
    };

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.6;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
