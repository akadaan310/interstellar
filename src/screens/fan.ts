/* FAN — device fan. An analyzer node at center; the five signal
   patterns fan out as leaves on an outer radius, each with its example
   signals fanned beneath it. Tap a pattern to isolate it. */

import type { Field } from "../engine/field";
import type { Navigator, Screen } from "./screen";
import { makeEdge, makeNode, MS } from "../engine/types";
import { rosettePattern, rosetteLeaf } from "../engine/layouts";
import { SIGNALS, systemById, type Signal } from "../data/galaxy";

interface FanNode {
  kind: "analyzer" | "pattern" | "example";
  pattern?: string;
  signal?: Signal;
}

const PATTERNS = ["REPEATING", "CHIRP", "DOUBLET", "SWEEP", "STUTTER"];
const PATTERN_R = 320;
const EXAMPLE_R = 460;

export class FanScreen implements Screen {
  id = "fan";
  name = "FAN";
  hint = "tap a pattern to isolate";

  private patternByNode = new Map<string, string>();

  mount(f: Field, nav: Navigator): void {
    f.nodes.clear();
    f.edges = [];
    f.cb = {};
    this.patternByNode.clear();

    const analyzer = makeNode({
      id: "fan-analyzer",
      x: 0,
      y: 0,
      r: 10,
      hue: "gold",
      pulse: true,
      label: "ANALYZER",
      labelSub: "PATTERN DEVICE",
    });
    analyzer.data = { kind: "analyzer" } as FanNode;
    f.nodes.set(analyzer.id, analyzer);

    PATTERNS.forEach((pattern, p) => {
      const leaf = rosettePattern(p, PATTERNS.length, PATTERN_R);
      const patId = `fan-pat-${p}`;
      const patNode = makeNode({
        id: patId,
        x: leaf.x,
        y: leaf.y,
        r: 7,
        hue: "teal",
        label: pattern,
        labelSub: "PATTERN",
      });
      patNode.data = { kind: "pattern", pattern } as FanNode;
      f.nodes.set(patId, patNode);
      this.patternByNode.set(patId, pattern);
      f.edges.push(makeEdge("fan-analyzer", patId, "teal", 0.16));

      const examples = SIGNALS.filter((s) => s.pattern === pattern).slice(0, 3);
      const count = Math.max(1, examples.length);
      examples.forEach((sig, k) => {
        const q = rosetteLeaf(leaf.angle, k, count, EXAMPLE_R);
        const exId = `fan-ex-${p}-${k}`;
        const exNode = makeNode({
          id: exId,
          x: q.x,
          y: q.y,
          r: 4,
          hue: "teal",
          label: sig.id,
          labelSub: sig.band,
        });
        exNode.data = { kind: "example", pattern, signal: sig } as FanNode;
        f.nodes.set(exId, exNode);
        this.patternByNode.set(exId, pattern);
        f.edges.push(makeEdge(patId, exId, "dashed", 0.12));
      });
    });

    f.cb.onStarTap = (n) => {
      const d = n.data as FanNode | undefined;
      if (!d) return;
      if (d.kind === "pattern" && d.pattern) {
        const pattern = d.pattern;
        for (const node of f.nodes.values()) {
          const nd = node.data as FanNode | undefined;
          if (!nd) continue;
          if (nd.kind === "example" && nd.pattern === pattern) node.tglow = 0.85;
          else if (nd.kind === "example" || nd.kind === "pattern") node.tglow = 0.05;
        }
        const examples = SIGNALS.filter((s) => s.pattern === pattern);
        const bands = [...new Set(examples.map((s) => s.band))].join(" · ");
        f.showPlate({
          title: pattern,
          sub: `${examples.length} EXAMPLES`,
          meta: `BANDS: ${bands}`,
        });
      } else if (d.kind === "example" && d.signal) {
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

    f.cam.tx = 0; f.cam.ty = 0; f.cam.tzoom = 0.55;
    f.settleCamera(MS.recenter);
    f.settleNodes(MS.recenter);
    f.playBloom();
  }

  unmount(f: Field): void {
    f.cb = {};
    f.hidePlate();
  }
}
