/* INTERSTELLAR — procedural chart data. Deterministic: same seed → same galaxy.
   Everything is synthetic. No real catalogs, no cultural references. */

import { rng } from "../engine/layouts";

export interface Sector {
  id: string;      // 'VELA'
  name: string;    // 'VELA SECTOR'
  prefix: string;  // 'VLA'
  cx: number; cy: number; // chart position
}

export interface Body {
  id: string;      // 'VLA-0117-III'
  name: string;    // 'MERIDIAN III'
  kind: "planet" | "moon" | "station" | "belt";
  orbit: number;   // orbital rank
  size: number;    // relative
}

export interface StarSystem {
  id: string;        // 'VLA-0117'
  name: string;      // 'MERIDIAN'
  sector: string;    // 'VELA'
  x: number; y: number; // chart coords
  spectral: string;  // 'G2V'
  specClass: string; // 'G'
  magnitude: number; // apparent brightness 1..6 (lower = brighter)
  bodies: Body[];
  tags: string[];
}

export interface JumpLane { a: string; b: string; length: number; }
export interface Signal { id: string; systemId: string; band: string; strength: number; pattern: string; }
export interface Pulsar { id: string; period: number; systemId: string; }
export interface Nebula { id: string; name: string; sector: string; x: number; y: number; radius: number; }
export interface Beacon { id: string; systemId: string; status: "HOMING" | "DISTRESS" | "SILENT" | "RELAY"; leg: number; }
export interface Waypoint { id: string; name: string; systemId: string; kind: string; }
export interface VoyageLeg { from: string; to: string; note: string; }
export interface StationCycle { id: string; station: string; periodH: number; phase: number; }

const R = rng(20260921);

const SECTOR_DEFS: Array<[string, string, number, number]> = [
  ["VELA", "VLA", 0, 0],
  ["LYRA", "LYR", 1, 0],
  ["DRACO", "DRA", 2, 0],
  ["ORION", "ORI", 0, 1],
  ["CYGNUS", "CYG", 1, 1],
  ["AQUILA", "AQL", 2, 1],
  ["PEGASUS", "PEG", 0, 2],
  ["HYDRA", "HYD", 1, 2],
  ["CRUX", "CRX", 2, 2],
  ["CENTAURUS", "CEN", 0, 3],
  ["PERSEUS", "PER", 1, 3],
  ["DELPHINUS", "DEL", 2, 3],
];

const PROPER_NAMES = [
  "MERIDIAN", "HALCYON", "KESTREL", "LODESTAR", "ZENITH", "SOLSTICE", "EQUINOX",
  "PARSEC", "AZIMUTH", "NADIR", "PERIGEE", "APOGEE", "ECLIPTIC", "SIDEREAL",
  "LUMEN", "VESPER", "AURORA", "CORONA", "STRATA", "CIRCUIT", "VECTOR", "TENSOR",
  "FLUX", "DRIFT", "EMBER", "FROST", "GALE", "HAVEN", "INLET", "JETTY", "KEEL",
  "LANTERN", "MARROW", "NEXUS", "OPAL", "PRISM", "QUILL", "RIDGE", "SABLE",
  "TALON", "UMBRA", "VIGIL", "WICK", "YONDER", "ZEPHYR", "ALDER", "BIRCH",
  "CORAL", "DUNE", "ESTUARY",
];

const SPEC_CLASSES = ["O", "B", "A", "F", "G", "K", "M"];
const SPEC_WEIGHTS = [0.02, 0.06, 0.12, 0.18, 0.24, 0.26, 0.12];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const BODY_KINDS: Body["kind"][] = ["planet", "planet", "planet", "moon", "moon", "station", "belt"];

function pick<T>(arr: T[]): T { return arr[Math.floor(R() * arr.length)]; }

function spectral(): { full: string; cls: string } {
  let x = R(), acc = 0, cls = "G";
  for (let i = 0; i < SPEC_CLASSES.length; i++) {
    acc += SPEC_WEIGHTS[i];
    if (x <= acc) { cls = SPEC_CLASSES[i]; break; }
  }
  const sub = Math.floor(R() * 10);
  const lum = cls === "M" ? "V" : pick(["V", "V", "V", "IV", "III"]);
  return { full: `${cls}${sub}${lum}`, cls };
}

export const SECTORS: Sector[] = SECTOR_DEFS.map(([id, prefix, gx, gy]) => ({
  id,
  name: `${id} SECTOR`,
  prefix,
  cx: (gx - 1) * 900,
  cy: (gy - 1.5) * 760,
}));

export const SYSTEMS: StarSystem[] = [];
{
  const usedNames = new Set<string>();
  let n = 0;
  for (const s of SECTORS) {
    const count = 8 + Math.floor(R() * 4); // 8..11
    for (let i = 0; i < count; i++) {
      n++;
      const id = `${s.prefix}-${String(100 + n).slice(1)}${n}`;
      let name = pick(PROPER_NAMES);
      while (usedNames.has(name)) name = pick(PROPER_NAMES);
      usedNames.add(name);
      const sp = spectral();
      const bodies: Body[] = [];
      const nb = 3 + Math.floor(R() * 6); // 3..8
      for (let b = 0; b < nb; b++) {
        const kind = pick(BODY_KINDS);
        const roman = ROMAN[b % ROMAN.length];
        bodies.push({
          id: `${id}-${roman}${kind === "moon" ? "·" + String.fromCharCode(97 + (b % 3)) : ""}`,
          name: kind === "station" ? `${name} ${roman} GATE` : kind === "belt" ? `${name} ${roman} BELT` : `${name} ${roman}`,
          kind,
          orbit: b,
          size: 0.4 + R() * 1.4,
        });
      }
      SYSTEMS.push({
        id,
        name,
        sector: s.id,
        x: s.cx + (R() - 0.5) * 760,
        y: s.cy + (R() - 0.5) * 620,
        spectral: sp.full,
        specClass: sp.cls,
        magnitude: 1 + R() * 5,
        bodies,
        tags: [sp.cls + "-CLASS", bodies.length > 6 ? "RICH SYSTEM" : "STANDARD", R() < 0.2 ? "SURVEYED" : "UNREVIEWED"],
      });
    }
  }
}

const sysById = new Map(SYSTEMS.map((s) => [s.id, s]));
export const systemById = (id: string): StarSystem | undefined => sysById.get(id);
export const systemsInSector = (sector: string): StarSystem[] =>
  SYSTEMS.filter((s) => s.sector === sector);

export const JUMP_LANES: JumpLane[] = (() => {
  const lanes: JumpLane[] = [];
  const seen = new Set<string>();
  for (const s of SYSTEMS) {
    const near = SYSTEMS
      .filter((o) => o.id !== s.id)
      .map((o) => ({ o, d: Math.hypot(o.x - s.x, o.y - s.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { o, d } of near) {
      const key = [s.id, o.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      lanes.push({ a: s.id, b: o.id, length: Math.round(d / 10) });
    }
  }
  return lanes;
})();

export const SIGNALS: Signal[] = (() => {
  const bands = ["21-CM", "OH-1667", "H-ALPHA", "X-BURST", "FAST-RADIO"];
  const patterns = ["REPEATING", "CHIRP", "DOUBLET", "SWEEP", "STUTTER"];
  return SYSTEMS.filter((_, i) => i % 7 === 0).map((s, i) => ({
    id: `SIG-${String(1000 + i)}`,
    systemId: s.id,
    band: bands[i % bands.length],
    strength: 0.2 + R() * 0.8,
    pattern: patterns[i % patterns.length],
  }));
})();

export const PULSARS: Pulsar[] = (() =>
  SYSTEMS.filter((_, i) => i % 11 === 0).map((s, i) => ({
    id: `PSR J${String(1000 + Math.floor(R() * 9000))}${R() < 0.5 ? "+" : "-"}${String(10 + Math.floor(R() * 80))}`,
    period: 0.004 + R() * 3.2,
    systemId: s.id,
  })))();

export const NEBULAE: Nebula[] = (() => {
  const names = ["VEIL", "HELIX", "RING", "DUMBBELL", "OWL", "ESKIMO", "CATSEYE", "HOURGLASS"];
  return SECTORS.filter((_, i) => i % 2 === 0).map((s, i) => ({
    id: `NGC-${2200 + i * 137}`,
    name: `${names[i % names.length]} NEBULA`,
    sector: s.id,
    x: s.cx + (R() - 0.5) * 300,
    y: s.cy + (R() - 0.5) * 300,
    radius: 90 + R() * 130,
  }));
})();

export const BEACONS: Beacon[] = (() => {
  const statuses: Beacon["status"][] = ["HOMING", "DISTRESS", "SILENT", "RELAY"];
  return SYSTEMS.filter((_, i) => i % 5 === 0).map((s, i) => ({
    id: `BCN-${String(2000 + i)}`,
    systemId: s.id,
    status: statuses[i % statuses.length],
    leg: i,
  }));
})();

export const WAYPOINTS: Waypoint[] = (() => {
  const kinds = ["RALLY", "CACHE", "RELAY", "MARKER", "SHELTER"];
  return SYSTEMS.filter((_, i) => i % 6 === 0).map((s, i) => ({
    id: `WP-${String(3000 + i)}`,
    name: `${s.name} ${kinds[i % kinds.length]}`,
    systemId: s.id,
    kind: kinds[i % kinds.length],
  }));
})();

export const VOYAGES: VoyageLeg[] = (() => {
  const notes = ["FIRST CROSSING", "SUPPLY RUN", "SURVEY ARC", "RELAY CHAIN", "RETURN LEG"];
  const legs: VoyageLeg[] = [];
  for (let i = 0; i < 10; i++) {
    const a = SYSTEMS[Math.floor(R() * SYSTEMS.length)];
    let b = SYSTEMS[Math.floor(R() * SYSTEMS.length)];
    while (b.id === a.id) b = SYSTEMS[Math.floor(R() * SYSTEMS.length)];
    legs.push({ from: a.id, to: b.id, note: notes[i % notes.length] });
  }
  return legs;
})();

export const BINARIES: Array<{ a: string; b: string; periodD: number }> = (() => {
  const out: Array<{ a: string; b: string; periodD: number }> = [];
  for (let i = 0; i + 1 < SYSTEMS.length; i += 9) {
    out.push({ a: SYSTEMS[i].id, b: SYSTEMS[i + 1].id, periodD: 12 + R() * 900 });
  }
  return out;
})();

export const STATION_CYCLES: StationCycle[] = (() =>
  SYSTEMS.flatMap((s) => s.bodies)
    .filter((b) => b.kind === "station")
    .slice(0, 12)
    .map((b, i) => ({
      id: `CYC-${String(4000 + i)}`,
      station: b.name,
      periodH: 4 + R() * 90,
      phase: R() * Math.PI * 2,
    })))();

export const DARK_SECTORS = ["HYDRA", "CRUX", "DELPHINUS"];

export const GALAXY_SEED = 20260921;
