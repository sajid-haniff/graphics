# AGENTS.md

This file provides repository-specific guidance for coding agents working in this p5.js + webpack graphics experimentation platform.

## Development Commands

```bash
# Required env var for older Node/OpenSSL compatibility
export NODE_OPTIONS=--openssl-legacy-provider

npm run dev      # Start webpack-dev-server on localhost:8080 (hot reload)
npm run watch    # Continuous rebuild without dev server
npm run build    # One-time production build -> dist/main.js
```

There is no automated test suite. To verify a demo, change the `demoName` variable in `src/index.js`, run the dev server, and inspect the result in the browser.

## Architecture Overview

This repository is organized around many small demo modules that render into a single p5 canvas. Switching demos means changing which exported factory function is invoked at startup.

### Entry Points

- `src/index.js` - application entry point. Selects the active demo with `demoName`, dynamically loads it, and wires p5 lifecycle/input callbacks.
- `src/demos.js` - demo registry mapping demo names to dynamic `import()` calls.

Demos export factory functions whose names match their registry keys. A demo factory receives the p5 sketch instance as `sk` and returns a plain object with lifecycle callbacks such as `setup`, `display`, and optional input handlers.

### Core Rendering System

The primary scenegraph systems live in `src/adv-game-design/library/`. The newer scenegraph code is based on a Cartesian, Y-up coordinate system. A root composite transform maps world coordinates into the default p5/canvas Y-down device space.

Key files:

| File | Role |
|------|------|
| `scenegraphY.js` | Primary Y-up scenegraph: node creation, traversal, and rendering |
| `scenegraph.js` | Older or alternate scenegraph implementation |
| `display.js` | Earlier rendering pipeline for display objects and sprites |
| `utilities.js` | Asset loading, atlas handling, text helpers, and blitter helpers |
| `tween.js` | Easing functions and animation tween helpers |
| `scenegraph-physics.js` | Velocity, acceleration, force integration, and physics helpers |
| `scenegraph-behaviors.js` | Steering behaviors such as seek, flee, wander, and pursuit |
| `scenegraph-keyboard.js` | Keyboard input mapped onto node controls |
| `scenegraph-interactive.js` | Mouse and pointer events on nodes |
| `scenegraph-pointer.js` | Pointer tracking and coordinate conversion utilities |

Supported scenegraph node types include `group`, `rectangle`, `circle`, `line`, `text`, `sprite`, and `tilingSprite`. Sprite variants include single-image sprites, atlases with named frames, filmstrip animation, and tilesets.

### Math Library

`src/lib/esm/` contains glMatrix-based math utilities. Use `M2D.js` for affine transforms and `V.js` for vector math. Related modules include `vec2.js`, `vec3.js`, `mat3.js`, `mat4.js`, `quat.js`, `quadtree.js`, `transform-helper.js`, and `sfx-howler.js`.

### Lower-Level Drawing API

`src/graphics_context2.js` provides an older lower-level drawing API used by legacy demos and transform setup code. Prefer the scenegraph for newer work unless the target code already uses this lower-level path.

### Demo Areas

| Directory | Contents |
|-----------|----------|
| `src/ai/search/` | Search algorithms and animated maze demos |
| `src/ai/csp/` | Constraint satisfaction demos such as Sudoku and map coloring |
| `src/recursion/` | Fractals and recursive visualizations |
| `src/noc/` | Nature of Code experiments |
| `src/physics/` | Kinematics and spring simulation |
| `src/demos/arcade/` | Asteroids-style game |
| `src/demos/timepilot/` | TimePilot-inspired game |
| `src/geometric/` | Computational geometry experiments |
| `src/cg_algorithms/` | Line clipping and related algorithms |
| `src/algorithm/` | Sorting, union-find, and dynamic programming visualizations |
| `src/space/` | Starfield rendering variants |

## Coordinate System Convention

Most current rendering systems use Cartesian world coordinates with positive Y upward. Raw p5.js and HTML canvas drawing still use device coordinates with positive Y downward.

The standard world-to-canvas transform is:

```text
COMPOSITE = REFLECT_Y * DEVICE * WORLD
```

`WORLD` maps world coordinates into normalized view coordinates, `DEVICE` scales normalized coordinates to canvas pixels, and `REFLECT_Y` flips the result into p5/canvas device space. Preserve this convention when editing scenegraph, physics, sprite, or pointer code.

## Rendering Guidance

- Geometry generally renders through the active world transform.
- Device-space rendering should happen only after an explicit matrix reset.
- Sprites may render in device space after world-to-device conversion, or inside the scenegraph when the renderer handles local sprite orientation.
- Text and raster images require care because canvas pixels are Y-down even when world coordinates are Y-up.
- Scenegraph renderers own the root transform; avoid applying duplicate world transforms inside nodes.
- Keep atlas parsing, frame selection, asset loading, and drawing responsibilities separate.
- Avoid repeated matrix resets, repeated asset lookups, unnecessary `sk.push()` / `sk.pop()` calls, and avoidable allocations in hot rendering paths.

## Coding Conventions

- Do not use ES6 classes.
- Prefer factory functions, closures, and plain objects.
- Prefer functional composition over inheritance.
- Use `sk.*` for all p5 calls; do not rely on global p5 functions.
- Use `M2D` for affine transforms and `V` for vector math.
- Keep demos self-contained, with local state inside the demo factory where practical.
- Prefer small composable helpers over broad framework-style abstractions.
- Preserve module-local conventions when editing existing files.
- Avoid unnecessary mutable shared state, especially across demos.

## Working Guidance

- Preserve the existing demo-driven structure.
- If you add or switch demos, update `src/index.js` and `src/demos.js` consistently.
- Keep changes small and reviewable.
- Avoid broad rewrites or cross-demo migrations unless explicitly requested.
- Preserve compatibility with existing demos and shared utilities.
- For rendering changes, validate visually through the dev server and inspect transform consistency, sprite orientation, text orientation, and related demo regressions.
