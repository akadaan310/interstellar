/* INTERSTELLAR — shell: chrome, hash routing, scale ladder, nav strip, boot. */

import { Field } from "./engine/field";
import type { Navigator, Screen } from "./screens/screen";

import { ChartScreen } from "./screens/chart";
import { DiveScreen } from "./screens/dive";
import { LatticeScreen } from "./screens/lattice";
import { SpectraScreen } from "./screens/spectra";
import { DialScreen } from "./screens/dial";
import { ConvoyScreen } from "./screens/convoy";
import { HailScreen } from "./screens/hail";
import { ClusterScreen } from "./screens/cluster";
import { ManeuverScreen } from "./screens/maneuver";
import { DesignationScreen } from "./screens/designation";
import { ProximityScreen } from "./screens/proximity";
import { VoyageScreen } from "./screens/voyage";
import { FanScreen } from "./screens/fan";
import { NebulaScreen } from "./screens/nebula";
import { PulsarScreen } from "./screens/pulsar";
import { DebrisScreen } from "./screens/debris";
import { SignalScreen } from "./screens/signal";
import { BeaconScreen } from "./screens/beacon";
import { CrownScreen } from "./screens/crown";
import { BinaryScreen } from "./screens/binary";
import { NightwatchScreen } from "./screens/nightwatch";
import { AtlasScreen } from "./screens/atlas";
import { TideScreen } from "./screens/tide";

const SCREENS: Screen[] = [
  new ChartScreen(),
  new DiveScreen(),
  new LatticeScreen(),
  new SpectraScreen(),
  new DialScreen(),
  new ConvoyScreen(),
  new HailScreen(),
  new ClusterScreen(),
  new ManeuverScreen(),
  new DesignationScreen(),
  new ProximityScreen(),
  new VoyageScreen(),
  new FanScreen(),
  new NebulaScreen(),
  new PulsarScreen(),
  new DebrisScreen(),
  new SignalScreen(),
  new BeaconScreen(),
  new CrownScreen(),
  new BinaryScreen(),
  new NightwatchScreen(),
  new AtlasScreen(),
  new TideScreen(),
];

/** scale ladder: galaxy ⇄ sector ⇄ system ⇄ body (chart ⇄ dive carry it) */
const LADDER = ["chart", "dive"];

const byId = new Map(SCREENS.map((s) => [s.id, s]));

const app = document.getElementById("app")!;
const field = new Field(app);

const chromeEl = document.createElement("div");
chromeEl.className = "field-chrome";
chromeEl.innerHTML = `<div class="fc-name"></div><div class="fc-hint"></div>`;
app.appendChild(chromeEl);
const fcName = chromeEl.querySelector(".fc-name") as HTMLElement;
const fcHint = chromeEl.querySelector(".fc-hint") as HTMLElement;

const strip = document.createElement("nav");
strip.className = "nav-strip";
for (const s of SCREENS) {
  const b = document.createElement("button");
  b.textContent = s.name;
  b.dataset.id = s.id;
  b.addEventListener("click", () => nav.go(s.id));
  strip.appendChild(b);
}
app.appendChild(strip);

let current: Screen | null = null;
let suppressHash = false;

function paintChrome(s: Screen): void {
  fcName.textContent = s.name;
  fcHint.textContent = s.hint;
  for (const b of strip.querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.id === s.id);
  }
}

function parseHash(): { id: string; params: Record<string, string> } {
  const h = location.hash.replace(/^#\/?/, "");
  const [idPart, query] = h.split("?");
  const params: Record<string, string> = {};
  if (query) {
    for (const kv of query.split("&")) {
      const [k, v] = kv.split("=");
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  }
  return { id: idPart || "chart", params };
}

function writeHash(id: string, params?: Record<string, unknown>): void {
  let h = `#/${id}`;
  if (params && Object.keys(params).length > 0) {
    const q = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    h += `?${q}`;
  }
  suppressHash = true;
  location.hash = h;
  suppressHash = false;
}

const nav: Navigator = {
  go(id: string, params?: Record<string, unknown>): void {
    const next = byId.get(id);
    if (!next) return;
    if (current) current.unmount(field);
    field.nodes.clear();
    field.edges.length = 0;
    field.hidePlate();
    current = next;
    writeHash(id, params);
    next.mount(field, nav, params);
    paintChrome(next);
    field.playBloom();
    try {
      localStorage.setItem("interstellar.last", id);
    } catch {
      /* private mode */
    }
  },
  ladder(dir: 1 | -1, from: string): void {
    const idx = LADDER.indexOf(from);
    if (idx === -1) {
      if (dir === 1) nav.go("dive");
      return;
    }
    const ni = Math.min(LADDER.length - 1, Math.max(0, idx + dir));
    if (ni !== idx) nav.go(LADDER[ni]);
  },
  dial(): void {
    nav.go("dial");
  },
  plate: {
    show: (d) => field.showPlate(d),
    hide: () => field.hidePlate(),
  },
};

window.addEventListener("hashchange", () => {
  if (suppressHash) return;
  const { id, params } = parseHash();
  if (byId.has(id) && id !== current?.id) nav.go(id, params);
});

// boot veil
const boot = document.createElement("div");
boot.style.cssText =
  "position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;gap:14px;" +
  "align-items:center;justify-content:center;background:#05070d;cursor:pointer;" +
  "transition:opacity 600ms cubic-bezier(.2,.8,.2,1);";
boot.innerHTML =
  `<div style="font-family:Didot,Bodoni MT,Georgia,serif;font-size:clamp(30px,8vw,54px);` +
  `letter-spacing:.3em;color:#e8b64c;text-shadow:0 0 40px rgba(232,182,76,.4)">INTERSTELLAR</div>` +
  `<div style="font-family:Menlo,Consolas,monospace;font-size:11px;letter-spacing:.24em;color:#6f6752">DEEP-SPACE NAVIGATION SYSTEM</div>` +
  `<div style="font-family:Menlo,Consolas,monospace;font-size:11px;letter-spacing:.24em;color:#7fd4c1;` +
  `animation:bootpulse 2.4s infinite">TAP TO BRING THE CHART ONLINE</div>` +
  `<style>@keyframes bootpulse{0%,100%{opacity:.35}50%{opacity:1}}</style>`;
app.appendChild(boot);

let booted = false;
boot.addEventListener("pointerdown", () => {
  if (booted) return;
  booted = true;
  boot.style.opacity = "0";
  window.setTimeout(() => boot.remove(), 650);
  const { id, params } = parseHash();
  let last: string | null = null;
  try {
    last = localStorage.getItem("interstellar.last");
  } catch {
    /* ignore */
  }
  nav.go(byId.has(id) && id !== "chart" ? id : last && byId.has(last) ? last : "chart", params);
});

// Hidden diagnostics handle for automated smoke tests. No UI effect.
(window as unknown as { __interstellar: unknown }).__interstellar = { field, nav };
