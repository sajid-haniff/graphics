# Lunar Lander — Design Brief

## Premise

A physically-grounded, neon-vector lunar lander in the spirit of Atari's 1979 *Lunar Lander* and the VIC-20/C64-era *Jupiter Lander*: rotate, throttle a descent engine against real lunar gravity, manage finite fuel, and touch down softly and upright on a pad cut into jagged moon terrain. Built as a new **Game** topic alongside the existing Asteroids and TimePilot demos, reusing this repo's existing neon-vector rendering and audio infrastructure — but **not** the scenegraph library. That code is slated for its own review/refactor pass, so this topic owns its own physics, state, and input handling end to end rather than picking up a dependency on something about to change underneath it.

This maps onto the canon's domain table directly: gravity+thrust integration is "enforce invariants" (frame-rate-independent dynamics), the landing/crash check is a "geometric predicate," and it's a second worked example of rigid-body dynamics — built independently this time, in its own module, rather than via `scenegraph-physics.js`.

---

## 1. Repo Placement

### What already exists (read before building anything)

| File | What it actually is |
|---|---|
| `src/adv-game-design/lunar-lander.js` (registered as `createLunarLanderDemo`) | A **scenegraph-hierarchy showcase**, not a game — thrust, legs, antenna, door all animate, but there's no gravity and no velocity integration; position is a sine bob. **This is a naming collision — see Decision A.** |
| `src/adv-game-design/library/` (`scenegraph.js`, `scenegraphY.js`, `scenegraph-physics.js`, `scenegraph-keyboard.js`, `display.js`, `tween.js`, `utilities.js`, etc.) **and** `src/adv-game-design/scenegraph-physics-thrust-demo.js` | **Off-limits for this topic — don't open these.** This folder and the demo built on it are queued for their own review/refactor; nothing here should pick up a new dependent in the meantime. The lander gets its own dynamics, its own input handling, its own rendering — none of it routed through this code. |
| `src/demos/arcade/ship.js` (Asteroids' player ship) | **The Shiffman anti-pattern, already live in this repo.** Its `update()` takes no `dt` — `pos[0] += vel[0]`, `DAMPING = 0.988` per call, `rotVel` in "deg/frame." Every other system in `asteroids-demo.js` (asteroids, bullets, exhaust, starfield, camera shake) already threads `dt` correctly; the ship is the one holdout. The lander follows the majority pattern, not this one — but its raw `pos`/`vel` arrays plus direct `sk.keyIsDown(...)` calls are exactly the shape to copy. |
| `src/demos/arcade/neon.js`, `palettes.js`, `camera-shake.js` | Neon-glow vector rendering (`neonPoly`/`neonLine`/`neonDot`), 80s palette presets, and screen shake — generic, reusable as-is, and not part of the scenegraph library. |
| `src/lib/esm/sfx-howler.js` + `src/demos/arcade/sfx-map.js` | The audio-loading convention to mirror. |
| `dist/lunar-lander-audio/` | Already has the ten sound files this topic needs. Default `basePath` in `sfx-howler.js` is `'dist/assets/'`, but `asteroids-demo.js` actually calls it with `'/assets/'` (webpack-dev-server serves `dist/` as web root) — the lander's loader should use `'/lunar-lander-audio/'` to match. **Flag for Claude Code:** confirm in the live repo whether `dist/` subfolders are actually committed despite `.gitignore: /dist` — the snapshot here shows no copy-webpack-plugin step that would regenerate them, so they may be hand-placed and need a real source-controlled location. |

### New files

```
src/demos/lunar-lander/
    lander-dynamics.js        — pure equations of motion (gravity, thrust, fuel, touchdown classification)
    terrain.js                 — procedural moon-surface height function + landing pad placement + contact query
    lunar-lander-sfx-map.js    — sfx map for the 10 existing mp3 files
    lunar-lander-demo.js       — factory: setup/display/keyPressed; wires dynamics + terrain + rendering + audio + camera shake + HUD
    docs/
        lunar-lander.md
        svg/
```

Registered in `src/demos.js` as a **new** key, `createLunarLanderArcadeDemo`, leaving the existing `createLunarLanderDemo` entry and file untouched.

---

## 2. The Math

### State

`p = (x, y)` — position, meters, Y-up
`v = (vx, vy)` — velocity, m/s
`θ` — orientation, radians (0 = nose pointing +Y)
`ω` — angular velocity, rad/s
`m_fuel` — remaining fuel mass, kg
`τ ∈ [0, 1]` — throttle

### Forces / accelerations

```
g = (0, -g_moon)          g_moon = 1.62 m/s²   (Moon's actual surface gravity, ~1/6 Earth's)

a_thrust = τ · (T_max / m) · (sin θ, cos θ)         m = m_dry + m_fuel

dm_fuel/dt = -k·τ          clamped at 0 — no thrust once dry
```

### Integration — semi-implicit Euler, dt explicit throughout

```
v ← v + a·dt
p ← p + v·dt
θ ← θ + ω·dt
```

This is the same semi-implicit Euler scheme `scenegraph-physics.js::step(dt)` uses — implemented independently here, not imported, since that library is off-limits for this topic. No step anywhere assumes an implicit unit timestep.

### Rotation

```
ω ← clamp(ω + (input · α_rcs)·dt − ω·k_damp·dt,  −ω_max, ω_max)
```
`α_rcs` = RCS angular acceleration constant · `k_damp` = damping rate (1/s) · `ω_max` = hard cap on spin rate

**Revised after playtesting** (see Decision C): the original "no damping" choice, combined with too-low torque, made rotation feel sluggish to start and then kept the ship spinning well past where the player released the key — by the time thrust was applied the ship had silently rotated further, which read as thrust going "the wrong way" even though the thrust vector always tracked the current `θ` correctly. Fix: punchier `α_rcs`, a hard `ω_max` clamp, and light continuous-time damping — `ω·k_damp·dt` here, **not** a flat per-frame multiply (`ω *= 0.92`), since that reintroduces the exact frame-rate-dependence problem this whole project exists to avoid.

### Landing / crash predicate

On ground contact:

```
SAFE  iff  |vy| ≤ V_SAFE_Y  ∧  |vx| ≤ V_SAFE_X  ∧  |θ| ≤ Θ_SAFE  ∧  |ω| ≤ Ω_SAFE  ∧  x ∈ [padLeft, padRight]
otherwise CRASH
```

This is the genuinely topic-specific math, in the resemblance-principle sense — a half-space/AABB safety region in `(vx, vy, θ, ω, x)` space, the same flavor as the geometric-predicate topics already under `src/geometric/`.

### Mass model

v1 (recommended starting point): treat `m` as constant `= m_dry` in the thrust term — fuel is tracked as a depleting resource/timer only, not as something that changes inertia. Variable mass (heavier-feeling craft early, snappier as fuel burns) is a clean v2 extension, documented but not built first.

---

## 3. Decision Points — flagged, not silently resolved

| # | Question | Recommendation |
|---|---|---|
| A | Naming collision: keep `createLunarLanderDemo` (hierarchy showcase) as-is and add `createLunarLanderArcadeDemo`, or retire/rename the old one? | Keep both — they teach different things. |
| B | World units: real SI (meters, m/s², HUD shows real altitude/speed) vs. arbitrary "feel" units like `ship.js`? | Real units — more pedagogically honest, equally tunable via named constants. |
| C | Angular damping: none (harder, period-authentic) vs. light damping for easier modern play? | **Revised after playtesting — light damping, with a higher torque and a hard spin cap.** Pure "no damping" felt sluggish to respond and let the ship drift past where you released the key; still skill-based (you can't auto-level), but it actually settles. |
| D | Mass model: constant (v1, simpler) vs. variable mass from fuel burn (v2, more realistic, more code)? | Constant for v1; variable mass as a documented "Extensions" item. |
| E | Integrator: reuse `scenegraph-physics.js`'s `attachBody`/`updatePhysics`, or a fully bespoke dynamics module? | **Resolved — bespoke.** No imports from the scenegraph library. `lander-dynamics.js` is the sole integrator, called directly each frame against a local state object (mirrors `ship.js`'s raw `pos`/`vel` arrays, not an attached body). |
| F | `baby.mp3` — guessing this is an Easter egg for an exceptionally gentle/perfect landing, but didn't want to bake in a wrong guess. | **Needs your answer** before Claude wires it up. |
| G | Branding: generic "Lunar Lander" HUD/title, or lean into the VIC-20 *Jupiter Lander* homage in title/flavor text only (no copied assets or code, just the vibe)? | Your call — cosmetic either way. |

---

## 4. Terrain

A 1D height function over `x`: an array of `(x, y)` vertices forming a polyline — jagged peaks plus a handful of flat pad segments. Query: locate the segment containing the lander's current `x`, lerp for height, compare against the lander's lowest contact point (leg span). Pads carry a difficulty/bonus multiplier — narrower or farther pads score more, same risk/reward as the original arcade's multiple landing zones.

---

## 5. Audio Map

| File | Use |
|---|---|
| `engine.mp3` | Main engine loop, volume scaled by throttle |
| `booster.mp3` | RCS / rotation-thruster pulse |
| `landing1.mp3` / `landing2.mp3` | Random pick on safe touchdown |
| `crash1.mp3` / `crash2.mp3` | Random pick on crash |
| `confetti1.mp3` / `confetti2.mp3` | Bonus stinger for a high-precision landing |
| `theme.mp3` | Attract-mode / title loop |
| `baby.mp3` | TBD — see Decision F |

---

## 6. HUD & Scoring

Altitude above terrain directly below (not absolute `y`), vertical speed, horizontal speed, fuel %, throttle, score. Score = fuel-remaining bonus + landing-precision bonus (distance from pad center) + touchdown-softness bonus, scaled by the pad's difficulty multiplier.

---

## 7. Educational Docs (per WORKFLOW.md Phase 5)

`docs/lunar-lander.md` follows the standard shape: Motivation → Mathematics (the ODE block above) → Visual Walkthrough (SVG of the gravity/thrust vector diagram and the landing-safety region) → Algorithm (integration loop, terrain query) → Implementation Mapping → Engineering Decisions (the dt-explicit choice, contrasted explicitly with `ship.js`) → Complexity (terrain query cost) → Demo Notes → Extensions (variable mass, wind/dust, multiple pads, two-stage descent/ascent).

---

## Instructions for Claude

**Objective:** implement `src/demos/lunar-lander/` exactly as specified above and register it in `src/demos.js`.

**Before writing any code, read:**
- `src/demos/arcade/asteroids-demo.js`, `ship.js`, `neon.js`, `palettes.js`, `camera-shake.js`, `sfx-map.js`, `utils.js` — this is the pattern to actually follow (raw state, direct `sk.keyIsDown`, no scenegraph)
- `src/lib/esm/sfx-howler.js`, `V.js`, `M2D.js`
- `ENGINEERING_PHILOSOPHY.md` and `AGENTS.md` at the repo root

**Build, in order:**

0. Create a feature branch — `feature/lunar-lander` — and work on it for the remainder of this task. Do not commit to or merge into `main`; this stays open for review (per `WORKFLOW.md` Phase 2/6) until it's explicitly approved.
1. `lander-dynamics.js` — pure functions, no p5 or scenegraph imports. Export the tunable constants (`G_MOON = 1.62`, `ENGINE_ACCEL`, `BURN_RATE`, the safety thresholds, and the rotation constants `RCS_ALPHA = 9.0`, `OMEGA_MAX = 3.0`, `OMEGA_DAMPING_RATE = 1.5` — start here, all playtested as a starting point, all easy to retune) and a `step(state, input, dt)` function implementing the ODE above via semi-implicit Euler. Implement angular damping as continuous-time exponential decay against `dt` (e.g. `omega -= omega * OMEGA_DAMPING_RATE * dt`, or `omega *= Math.exp(-OMEGA_DAMPING_RATE * dt)`) — **never** a flat per-frame multiply; that reintroduces a frame-rate-dependent feel even though `dt` is in scope elsewhere. Clamp `omega` to `±OMEGA_MAX` every step. Export `classifyTouchdown(state, pad)` returning `'safe' | 'crash'`. No class syntax; pure data in, pure data out — this file should read like the equations above, not hide them.
2. `terrain.js` — `generateTerrain(seed, win)` returning `{ vertices, pads }`; `heightAt(terrain, x)`; `findPadUnder(terrain, x)`.
3. `lunar-lander-sfx-map.js` — mirror `sfx-map.js`'s shape using the 10 lunar-lander-audio files.
4. `lunar-lander-demo.js` — factory `createLunarLanderArcadeDemo(sk, W = 1024, H = 768)` returning `{ setup, display, keyPressed }`. Build `win`/`COMPOSITE` exactly like `asteroids-demo.js`. Read input directly via `sk.keyIsDown(...)` (no `scenegraph-keyboard` import — same approach `ship.js` already uses). Hold the lander's state (`pos`, `vel`, `θ`, `ω`, fuel) as a plain local object, not an attached body. Each frame: compute `dt = Math.min(sk.deltaTime / 1000, 0.05)`, call `lander-dynamics.step(state, input, dt)` and reassign `state` from the result, query terrain for ground contact, classify touchdown on contact, update score/fuel/HUD, render terrain + lander (via `neonPoly`/`neonLine`) + flame + HUD, trigger camera shake and sfx on landing/crash.
5. Register `'createLunarLanderArcadeDemo': () => import('./demos/lunar-lander/lunar-lander-demo')` in `src/demos.js`. Do not touch the existing `createLunarLanderDemo` entry or its file.
6. Run `npm run build` and report the result.

**Do not:**
- Import anything from `src/adv-game-design/library/` (`scenegraph.js`, `scenegraphY.js`, `scenegraph-physics.js`, `scenegraph-keyboard.js`, `display.js`, `tween.js`, `utilities.js`, etc.) — that folder is under review/refactor and shouldn't gain new dependents right now.
- Touch `src/adv-game-design/lunar-lander.js` or its registry entry.
- Invent new `V` / `M2D` methods — use only what's already in `src/lib/esm/V.js` / `M2D.js`.
- Use ES6 classes.
- Let any per-frame update assume a fixed timestep — every dynamics or animation update takes `dt` explicitly, no exceptions.

**Stop and ask, don't decide silently, if:** the live repo's `.gitignore`/`dist` situation contradicts the asset-loading assumption above, or any of Decision Points A–G haven't been answered yet.
