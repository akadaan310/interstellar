# INTERSTELLAR — Deep-Space Navigation System

A canvas-native navigation instrument for charting synthetic deep space.
Twenty-three independent navigation stations share one visual grammar —
gold eight-pointed nav beacons, teal secondary threads, void-black charts —
and one tap grammar: tap a beacon to dive, tap a thread to trace it,
wheel or pinch to move the scale ladder, sideways flick to open the sector dial,
tap the void to fall back.

## Stations

**Core** — `CHART` (sector starfield) · `DIVE` (system dive) · `LATTICE` (jump lanes) ·
`SPECTRA` (spectral taxonomy rosette) · `DIAL` (sector rolodex)

**Navigation modes** — `CONVOY` · `HAIL` · `CLUSTER` · `MANEUVER` · `DESIGNATION` ·
`PROXIMITY` · `VOYAGE` · `FAN`

**Deep space** — `NEBULA` · `PULSAR` · `DEBRIS` · `SIGNAL` · `BEACON` · `CROWN` ·
`BINARY` · `NIGHTWATCH` · `ATLAS` · `TIDE`

## Architecture

- `src/engine/` — deterministic layouts (phyllotaxis, concentric/single orbits,
  rosette, dial cylinder projection, seeded PRNG), star/thread/stardust rendering,
  the `Field` (DPR-aware canvas, camera, gestures, render loop, presence lights).
- `src/data/galaxy.ts` — procedural synthetic chart: 12 sectors, ~120 systems,
  jump lanes, signals, pulsars, nebulae, beacons, waypoints, voyages. Same seed,
  same galaxy. Nothing hand-placed, nothing stored.
- `src/screens/` — one independent UI per station. Screens never import each other;
  the shell owns chrome, bloom, dial overlay, and the scale ladder.
- Scale ladder: `galaxy ⇄ sector ⇄ system ⇄ body`.

## Develop

```sh
npm install
npm run build    # tsc --noEmit + vite build
python3 scripts/audit.py   # content audit: no non-English script, no religious references
```

## Content boundary

All chart data is procedurally generated and synthetic. The project ships zero
Quranic material and zero religious content — enforced by `scripts/audit.py`.
