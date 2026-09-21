/* A screen is one independent UI: it owns its nodes, edges, layout and tap
   rules. The shell owns the chrome, the bloom, the sector dial overlay and the
   scale ladder. Screens never import each other. */

import type { Field } from "../engine/field";

/** What the shell offers every screen. */
export interface Navigator {
  /** switch to another screen */
  go(id: string, params?: Record<string, unknown>): void;
  /** scale-ladder step: galaxy ⇄ sector ⇄ system ⇄ body */
  ladder(dir: 1 | -1, from: string): void;
  /** open the sector dial overlay */
  dial(): void;
  /** the detail plate */
  plate: {
    show(d: { title: string; sub?: string; meta?: string }): void;
    hide(): void;
  };
}

export interface Screen {
  id: string;
  /** display name shown in the chrome, e.g. CHART */
  name: string;
  /** one-line hint, English */
  hint: string;
  mount(f: Field, nav: Navigator, params?: Record<string, unknown>): void;
  unmount(f: Field): void;
}
