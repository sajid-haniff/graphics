# Lunar Lander Design Brief

## Purpose

This document is the project handoff brief for the Lunar Lander demo in the graphics repository. It captures design intent, implementation conventions, physics invariants, current architecture, future roadmap, and the Codex workflow used to evolve the project.

Use this document to start future GPT/Codex sessions without reconstructing the full conversation history.

---

## Project Context for Future Sessions

### Repository Style

The graphics repository uses small demo factory functions, plain objects, and functional JavaScript.

Core expectations:

- No ES6 classes.
- Prefer factory functions and closures.
- Use plain objects and arrays for state.
- Keep physics/state logic separate from rendering.
- All p5 calls go through `sk`.
- Use explicit `dt` everywhere.
- Avoid frame-dependent constants such as per-frame damping.
- Prefer deterministic seeded systems over `Math.random`.
- Keep modules small when features grow.

### Important Repository Paths

Primary Lunar Lander implementation:

```text
src/demos/lunar-lander/
    lunar-lander-demo.js
    lander-dynamics.js
    terrain.js
    lunar-lander-sfx-map.js
    docs/lunar-lander.md
```

Relevant shared systems:

```text
src/demos/arcade/
    neon.js
    camera-shake.js
    starfield.js
    burst.js
    shockwave.js
    exhaust.js
    hud.js

src/lib/esm/
    M2D.js
    V.js
    sfx-howler.js
```

Repository snapshot/reference file sometimes provided to assistants:

```text
graphics.html
```

Future assistants should inspect:

```text
src/demos/lunar-lander/
src/demos/arcade/
src/lib/esm/
src/demos.js
docs/
graphics.html
```

---

## Current Game Vision

The project began as a classic Atari/VIC-20/C64-style Lunar Lander homage, but the long-term direction is broader:

> A cinematic neon-vector planetary descent game with physically plausible arcade dynamics, extreme terrain, multiple planet profiles, environmental hazards, and replayable skill-based landings.

The current v1 target remains recognizable as Lunar Lander:

- Rotate.
- Thrust.
- Manage fuel.
- Descend under gravity.
- Land softly on difficulty-classified pads.
- Crash if velocity, lean, spin, or pad alignment are unsafe.

The v2 direction may include variable mass, 2D rigid-body inertia and torque, translational RCS, planet profiles, atmosphere, drag, wind, water, ice, dust, SAM sites, real missile physics, UFO or void entities, gravity anomalies, cargo, and mission objectives.

Fun factor is more important than realism. Physics should support expressive gameplay, not become tedious simulation.

---

## Coordinate System

### World Coordinates

```js
// World:
//   +X right
//   +Y up
```

All geometry, terrain, physics, and velocity live in Y-up world coordinates.

p5 device space is Y-down, so rendering uses a composite transform.

### Attitude Convention

```js
// Attitude:
//   theta = 0       => nose points +Y
//   theta > 0       => nose rotates right
//   theta < 0       => nose rotates left
```

This convention must be shared by physics thrust direction, lander rendering, flame rendering, collision/contact helpers, debug vectors, and controls.

### Controls Convention

```js
// Controls:
//   LEFT  => dtheta/dt < 0
//   RIGHT => dtheta/dt > 0
```

LEFT must rotate the displayed nose left. RIGHT must rotate the displayed nose right.

### Thrust Convention

```js
// Thrust:
//   thrustDir(theta) == displayed nose direction
```

The canonical thrust direction is:

```js
const thrustDir = theta => [Math.sin(theta), Math.cos(theta)];
```

At `theta = 0`, thrust is straight upward: `[0, +1]`.

This was the source of an early bug: rendering and physics used opposite signs for positive rotation. Future work must preserve this invariant.

---

## Transform Pipeline

World rendering uses:

```text
COMPOSITE = REFLECT_Y · DEVICE · WORLD
```

Apply the composite once per world pass:

```js
sk.resetMatrix();
sk.applyMatrix(...M2D.toArgs(COMPOSITE));
```

Device-space UI/HUD/background:

```js
sk.resetMatrix();
```

Pixel-consistent sizes:

```js
const pixelToWorld = M2D.makePixelToWorld(COMPOSITE);
```

Use `pixelToWorld` for stroke weights, dots, lander readability, and effects that need consistent screen size.

---

## Physics Integration

Current v1 uses semi-implicit Euler:

```text
v ← v + a·dt
p ← p + v·dt
ω ← ω + α·dt
θ ← θ + ω·dt
```

This is intentional.

Why semi-implicit Euler instead of RK4:

- The lander has simple forces: gravity, binary/arcade thrust, RCS torque.
- Controls and collisions are discontinuous.
- Contact/landing/crash predicates happen every frame.
- Game feel and predictability matter more than high-order numerical accuracy.
- Explicit `dt` makes tuning clear.

RK4 remains useful for smooth ODE demos, spring systems, orbit demos, or continuous force fields. It is not necessary for the core lander.

### No Frame-Dependent Damping

Use continuous-time damping:

```js
omega *= Math.exp(-dampingRate * dt);
```

Do not use:

```js
omega *= 0.92; // bad: frame-dependent
```

---

## Current Core Dynamics

The pure dynamics module should remain independent of p5 and rendering.

State shape:

```js
{
    pos: [x, y],
    vel: [vx, vy],
    theta,
    omega,
    fuel
}
```

Input shape:

```js
{
    thrust,
    rotLeft,
    rotRight
}
```

Future v2 may replace constant engine acceleration with force/mass:

```text
m = dryMass + fuelMass
a = thrustForce / m
```

This is recommended because it improves fun: heavy/sluggish at full fuel, more nimble near empty, and fuel conservation changes handling.

---

## Fuel and Throttle Invariant

Fuel must feel correlated with engine burn.

There should be a single effective throttle concept:

```js
actualThrottle = state.fuel > 0 && input.thrust ? 1 : 0;
```

The same `actualThrottle` must control:

- Physics thrust.
- Fuel burn.
- Flame visibility.
- Engine loop sound.
- HUD throttle display.
- Exhaust/dust effects.

Out of fuel:

- No thrust acceleration.
- No flame.
- No engine loop.
- HUD throttle reads zero.

Fuel units are arcade/dimensionless unless v2 mass modeling is enabled.

---

## Landing Predicate

Safe landing requires:

- Over a landing pad.
- Vertical speed below safe threshold.
- Horizontal drift below safe threshold.
- Lean below safe threshold.
- Angular velocity below safe threshold.
- Position within the pad span.

The predicate is a geometric/physics safety region. It should be easy to inspect and tune.

Future improvements may compute both foot positions against terrain, but avoid overbuilding full polygon collision unless it adds fun.

---

## Terrain System

The terrain should feel like classic Lunar Lander, but more cinematic:

- Broad smooth mountains.
- Very deep gorges.
- Angular vector-line silhouette.
- No rectangular cliffs.
- No shallow rolling-hill-only look.
- Landing pads carved into the terrain.
- Difficulty-classified pads.

The successful terrain architecture uses:

```text
macro landforms + fBm detail
```

fBm alone was rejected because it produced shallow rolling hills. Explicit macro shaping creates the sense of enormous scale.

### Recommended Terrain Recipe

1. Large world bounds.
2. 120–160 samples.
3. Usable vertical range covering most of the world height.
4. Low-frequency fBm/value noise as texture, not the main shape.
5. Explicit Gaussian gorges and mountains.
6. Small high-frequency vector detail.
7. Slope limiting only to prevent vertical walls.
8. Pad placement after terrain shaping.
9. Pad edge blending.

### Pad Difficulty

Pads should include:

```js
{
    x1,
    x2,
    y,
    multiplier,
    label,
    difficulty
}
```

Suggested difficulty classes:

```text
EASY    1x  wide, low/gorge-floor shelf
MEDIUM  2x  mid shelf
HARD    3x  high/narrow shelf
EXPERT  5x  exposed ridge or gorge-side shelf
```

Score should multiply once by `pad.multiplier`.

---

## Dynamic Camera

The camera has two competing jobs:

1. Reveal the terrain scale.
2. Keep the lander readable and landing precise.

The correct fix is not always zooming in to make the lander larger. That caused an empty-sky problem. Instead:

```text
camera = terrain context + landing context
render scale = ship readability
```

### Camera Modes

High altitude:

- Show gorge/mountain context.
- Bias view downward so terrain is visible.
- Lander should be in the upper third.
- Do not over-zoom on the ship.

Mid altitude:

- Blend toward landing view.
- Keep terrain and pads visible.

Low altitude:

- Prioritize landing precision.
- Tighten framing.

### Ship Readability

If needed, use render-only scale for the lander:

- Does not affect physics.
- Does not affect collision.
- Does not affect contact.
- Only improves readability.

---

## Spawn Profiles

Initial vertical velocity should not be zero.

Classic lander feel starts with the player already descending.

Recommended profiles:

```text
EASY:
  vy = -2.5
  vx = 0
  fuel = 100
  altitude = 75

NORMAL:
  vy = -3.5
  vx = deterministic random [-0.5, 0.5]
  fuel = 95
  altitude = 95

HARD:
  vy = -5.0
  vx = deterministic random [-1.0, 1.0]
  fuel = 85
  altitude = 110

CHALLENGE:
  vy = -7.0
  vx = deterministic random [-2.0, 2.0]
  fuel = 75
  altitude = 125
```

Default: `NORMAL`.

Spawn position should showcase interesting terrain: near gorges, ridges, medium/hard/expert pads, or centered between pads.

Keep deterministic behavior unless seed/profile changes.

---

## Audio

Important audio invariants:

- Engine loop plays only when `actualThrottle > 0`.
- RCS/booster sounds align with actual rotation input.
- Crash sound triggers once on crash.
- Landing sound triggers once on safe touchdown.
- Optional bonus/confetti sound for high-precision landings.

Future audio may include dynamic music intensity, low-fuel warning, atmosphere-specific ambience, SAM launch warning, and void distortion sound.

---

## Visual Effects

Recommended effects:

- Neon vector lander.
- Neon terrain.
- Pad difficulty colors.
- Camera shake.
- Crash fragments.
- Engine flame.
- Starfield.

### Crash Explosion

A good crash effect should include:

- Strong camera shake.
- Fragmented lander geometry.
- Fragments inherit crash velocity.
- Fragments scatter, spin, and fade.
- Sparks or neon dots.
- Optional shock ring/flash.

Explosion must not mutate physics state except phase/life/reset logic.

### Starfield

A good starfield should be deterministic from seed, parallax layered, subtly twinkling, beautiful but not distracting, drawn before terrain and lander, and responsive to camera movement.

---

## Infinite / Continuous Terrain

Future work should support flying past left/right edges.

Preferred design:

- Procedural chunked terrain.
- Deterministic chunk generation from `seed + chunkIndex`.
- `heightAt(terrain, x)` works outside initial bounds.
- `findPadUnder(terrain, x)` works outside initial bounds.
- Visible terrain is generated for the current camera window.
- Chunks connect without seams.

Avoid clamping lander to old world bounds once continuous terrain exists.

---

## Planet Profiles

v2 should introduce planet profiles as the main extension point.

Example shape:

```js
{
    name,
    gravity,
    atmosphereDensity,
    wind,
    palette,
    terrainProfile,
    hazards,
    waterLevel,
    iceLevel,
    musicMood
}
```

Potential planets:

```text
Moon:
  no atmosphere, pure inertia, harsh craters

Mars:
  thin atmosphere, dust storms, orange palette

Europa:
  low gravity, ice cliffs, slippery pads, geysers

Titan:
  dense atmosphere, drag, wind, methane lakes

Io:
  volcanic terrain, lava hazards, violent palette

Void Planet:
  alien gravity wells, UFOs, unstable terrain
```

---

## Recommended Physics Features

Include only if they improve fun.

### Definitely Add

1. Variable mass due to fuel burn.
2. Full 2D rigid-body rotation with scalar inertia.
3. Translational RCS.
4. Dust plume physics.
5. Camera shake.
6. Fragment explosions.

### Strong Candidates

7. Multiple gravities.
8. Atmospheric drag.
9. Wind/gusts/shear.
10. Buoyancy for water/methane lakes.
11. Ice friction/sliding.
12. SAM sites.
13. Missile guidance and acceleration.
14. Terrain masking.
15. Gravity anomalies.
16. Meteor physics.

### Use Carefully

17. Craters.
18. Falling rocks.
19. Cargo pendulum.

### Probably Skip

These are realistic but likely reduce fun:

- Structural flex.
- Finite-element landing legs.
- Detailed engine gimbal dynamics.
- Thermal modeling.
- Propellant slosh.
- Detailed regolith mechanics.
- Precise orbital mechanics.

---

## SAM Sites and Missiles

SAM sites are a strong v2 feature.

Missiles should feel physically plausible and skillful to evade.

Missile state:

```js
{
    pos,
    vel,
    theta,
    omega,
    fuel,
    mass,
    thrust,
    turnRateLimit,
    sensorCone
}
```

Missile behavior:

- Launch plume.
- Rapid acceleration.
- Limited fuel burn.
- Coast phase after burnout.
- Turn-rate limited steering.
- Terrain collision.
- Fragment burst.
- Possible overshoot.

Guidance options:

```text
Simple pursuit:
  Aim at current lander position.

Lead pursuit:
  Aim at predicted intercept.

Proportional navigation:
  Turn based on line-of-sight rate.
```

Preferred: proportional navigation, because it looks smart without feeling like cheating.

Terrain masking should matter: the player can hide behind mountains/gorge walls.

---

## Environmental Features

### Atmosphere and Drag

Drag should be planet-specific.

- Moon: no drag.
- Mars: light drag, dust.
- Titan: strong drag, wind, slow descent feel.

### Wind

Wind should be readable and tunable:

- Steady wind.
- Gusts.
- Shear layers.
- Storm profiles.

Avoid random unfair wind. It should be signaled visually or on instruments.

### Water / Methane / Fluid

Fluid zones may apply buoyancy, drag, rotation damping, engine steam/suppression visuals, and splash effects.

### Ice

Ice should add low friction, sliding after touchdown, stronger need for low horizontal velocity, and ice crystal dust/plume effects.

---

## Documentation Expectations

Every feature pass should update documentation.

Codex instruction pattern:

```text
After implementing the code, add/update documentation that explains:

1. What changed
2. Why it changed
3. The coordinate/physics convention
4. The invariants future code must preserve
5. How to manually verify the behavior
6. Known non-goals or deferred work

Use concise repo-style Markdown.
Do not just restate code.
Explain the design decisions and failure modes.
```

Lunar Lander docs should include:

```text
src/demos/lunar-lander/docs/lunar-lander.md
```

Recommended sections:

- Overview
- Controls
- Coordinate System
- Heading / Thrust Convention
- Physics Integration
- Landing Predicate
- Terrain + Pads
- Camera
- Fuel / Throttle
- Audio
- Visual Effects
- Spawn Profiles
- Debugging Checklist
- Known Non-Goals
- Future Roadmap

---

## Coordinate Invariants Checklist

Codex must satisfy this before considering a task complete:

```text
[ ] World is Y-up.
[ ] theta = 0 means nose points +Y.
[ ] Positive theta convention documented.
[ ] Rendering uses the same convention as physics.
[ ] thrustDir(theta) equals displayed nose direction.
[ ] LEFT rotates visually left.
[ ] RIGHT rotates visually right.
[ ] COMPOSITE = REFLECT_Y · DEVICE · WORLD.
[ ] Stroke widths use pixelToWorld.
[ ] All integration uses explicit dt.
[ ] No frame-dependent damping constants.
[ ] Temporary debug vectors removed.
```

---

## Feature Completion Checklist

Before committing any Lunar Lander feature:

```text
[ ] Build passes.
[ ] Feature works in the demo.
[ ] Docs updated.
[ ] Coordinate invariants still hold.
[ ] Physics invariants still hold.
[ ] No scenegraph dependency introduced.
[ ] No p5 calls outside sk.
[ ] No unnecessary classes.
[ ] Temporary debug visuals removed or intentionally gated.
[ ] Manual verification steps documented.
[ ] Known non-goals/deferred items documented.
```

---

## Codex Workflow

Recommended workflow:

```text
You
  creative director / playtester

Assistant
  architect / reviewer
  translates feel into invariants and tasks

Codex
  implementation engine
  edits, builds, tests, commits

You
  evaluates feel from running demo/screenshots
```

Codex prompts should include:

- Branch name.
- Files to edit.
- Problem statement.
- Design goal.
- Constraints.
- Implementation strategy.
- Acceptance criteria.
- Documentation requirements.
- Commit message.

Avoid vague prompts such as `make it better`.

Prefer:

```text
Problem:
The lander is readable but camera shows empty sky at spawn.

Goal:
Show terrain/gorge context at high altitude while keeping lander readable.

Invariant:
Camera controls terrain context; render-only scale controls ship readability.
```

---

## Recommended Next Feature Order

Suggested v2 order:

```text
1. Stabilize v1:
   starfield
   continuous terrain
   crash fragments
   fuel/throttle audit
   spawn profiles

2. Physics depth:
   variable mass
   scalar inertia
   force application points
   translational RCS

3. Planet profiles:
   gravity
   palette
   terrain profile
   atmosphere

4. Environmental forces:
   drag
   wind
   dust
   ice
   water/methane

5. Combat/survival:
   SAM sites
   missiles
   terrain masking
   UFO/void entities

6. Missions:
   rescue
   cargo
   survey
   fuel depot
   destroy radar
```

---

## Known Non-Goals

For now, avoid:

- Full 3D.
- Scenegraph dependency.
- High-fidelity finite-element landing legs.
- Propellant slosh.
- Orbital mechanics.
- Overly realistic systems that reduce arcade clarity.
- Random unfair hazards without player-readable signals.

---

## Session Bootstrap Prompt

For a new GPT/Codex session, paste this:

```text
You are helping with the graphics repository Lunar Lander demo.

Read and follow:
docs/lunar-lander-design.md
src/demos/lunar-lander/docs/lunar-lander.md

Key implementation files:
src/demos/lunar-lander/lunar-lander-demo.js
src/demos/lunar-lander/terrain.js
src/demos/lunar-lander/lander-dynamics.js
src/demos/lunar-lander/lunar-lander-sfx-map.js

Relevant shared files:
src/demos/arcade/neon.js
src/demos/arcade/camera-shake.js
src/lib/esm/M2D.js
src/lib/esm/V.js
src/lib/esm/sfx-howler.js

Repository style:
No classes.
Functional factory functions.
All p5 calls through sk.
World is Y-up.
p5 device space is Y-down.
COMPOSITE = REFLECT_Y · DEVICE · WORLD.
theta = 0 means nose +Y.
theta > 0 means nose rotates right.
LEFT decreases theta.
RIGHT increases theta.
thrustDir(theta) must equal displayed nose direction.
Use explicit dt.
No frame-dependent damping.
Update docs with every feature.
Fun factor beats realism.
```

---

## Design Summary

The Lunar Lander project should remain a polished, readable, neon-vector physics game.

The core philosophy:

```text
Physically plausible where it improves feel.
Arcade-simple where realism would reduce fun.
Deterministic where replayability and debugging matter.
Documented enough that future agents cannot silently break conventions.
```
