# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Required env var for older Node/OpenSSL compatibility
export NODE_OPTIONS=--openssl-legacy-provider

npm run dev      # Start webpack-dev-server on localhost:8080 (hot reload)
npm run watch    # Continuous rebuild without dev server
npm run build    # One-time production build → dist/main.js
```

No automated test suite. To test a demo, change the `demoName` variable in `src/index.js` and view results in the browser. The active demo is a single exported factory function imported dynamically via `src/demos.js`.

## Architecture Overview

This is a p5.js + webpack graphics experimentation platform. All demos run in a single canvas; switching demos means changing which factory function is invoked at startup.

### Entry Points

- **`src/index.js`** — Entry point. Sets `demoName` and calls the matching factory from `src/demos.js`. Change `demoName` here to switch the active demo.
- **`src/demos.js`** — Registry mapping demo name strings to dynamic `import()` calls.

### Core: Scenegraph System (`src/adv-game-design/library/`)

The scenegraph is the primary rendering system. It uses a **Y-up (Cartesian) coordinate system** via a root COMPOSITE transform that flips the p5.js Y-axis. Key files:

| File | Role |
|------|------|
| `scenegraphY.js` | Primary scenegraph — node creation, tree traversal, rendering |
| `scenegraph.js` | Older/alternative scenegraph implementation |
| `display.js` | Rendering pipeline; walks the tree and draws nodes |
| `utilities.js` | Asset loading (images, atlases, filmstrips, tilesets), blit helpers |
| `tween.js` | Easing functions and animation tweens |
| `scenegraph-physics.js` | Velocity/acceleration/force integration onto nodes |
| `scenegraph-behaviors.js` | AI steering: seek, flee, wander, pursuit |
| `scenegraph-keyboard.js` | Keyboard input mapped to node controls |
| `scenegraph-interactive.js` | Mouse/pointer events on nodes |
| `scenegraph-pointer.js` | Advanced pointer tracking |

**Node types:** `group`, `rectangle`, `circle`, `line`, `text`, `sprite`, `tilingSprite`
**Sprite variants:** single image, atlas (spritesheet with named frames), filmstrip (animation), tileset

### Math Library (`src/lib/esm/`)

glMatrix-based math. The main public API is **`M2D.js`** — a Pythonic wrapper over `mat2d.js` for 2D affine transforms. Also includes `vec2.js`, `vec3.js`, `mat3.js`, `mat4.js`, `quat.js`, `quadtree.js`, `transform-helper.js`, and `sfx-howler.js` (audio via Howler).

### Graphics Context (`src/graphics_context2.js`)

A lower-level turtle-graphics-style drawing API used by older demos. Newer demos use the scenegraph directly.

### Demo Subsystems

| Directory | Contents |
|-----------|----------|
| `src/ai/search/` | DFS, BFS, UCS, A*, GBFS, IDA*, RBFS, bidirectional — all with animated maze demos |
| `src/ai/csp/` | Constraint satisfaction: map coloring, 8-queens, Sudoku, crossword, river crossing |
| `src/recursion/` | Fractals: Apollonian gasket, fractal tree, Pythagorean tree, H-tree, Brownian motion, knight's tour |
| `src/noc/` | Nature of Code: forces, flow fields, oscillations, particles, steering vehicles |
| `src/physics/` | Spring simulation, kinematics |
| `src/demos/arcade/` | Full Asteroids game (ship, asteroid, bullet, UFO, sfx, camera shake) |
| `src/demos/timepilot/` | TimePilot arcade game |
| `src/geometric/` | Computational geometry (triangles, polygons, circle relationships) |
| `src/cg_algorithms/` | Cohen-Sutherland line clipping |
| `src/algorithm/` | Sorting, union-find, dynamic programming visualizations |
| `src/space/` | Starfield rendering (3 variants) |

### Coordinate System Convention

The scenegraphY system applies a root COMPOSITE transform so that **+Y is up** (standard math/Cartesian). When working with scenegraph nodes, treat Y as pointing upward. Raw p5.js drawing (outside the scenegraph) uses the default **+Y is down** screen convention.
