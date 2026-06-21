# Lunar Lander

## Terrain Scale

The terrain uses explicit macro landforms plus small fBm detail. fBm alone was rejected because it produced shallow rolling hills that did not read like classic Lunar Lander terrain at gameplay scale.

The major gorges are intentional Gaussian depressions. The large mountain walls are intentional Gaussian rises. These features dominate the silhouette; fBm is only used for low-amplitude texture and angular vector detail.

Camera zoom is part of the scale illusion. At altitude the camera pulls back to show gorge walls, floor, and enclosing mountains. Near landing it tightens enough for control, but keeps enough surrounding terrain visible that pads still feel carved into a larger landscape.

The camera has two competing jobs: reveal terrain scale and keep the lander readable. At high altitude, terrain context wins: the camera stays wide enough to show gorge walls and floor instead of zooming into empty sky.

The camera target is biased downward, placing the lander above center so the player can see the terrain, gorge floor, and pads below. If the projected lander would become too small in the wide view, a render-only scale floor keeps it recognizable. Physics size and render/camera readability are separate concerns: render scale changes drawing only, not thrust, collision, contact, or landing classification.

## Camera Modes

The camera uses altitude bands:

- High altitude keeps a wide view so gorge walls and floors are visible immediately.
- Mid altitude blends toward a tighter view without abrupt zoom jumps.
- Low altitude prioritizes landing precision while keeping nearby terrain readable.

## Pad Difficulties

Landing pads are selected after terrain shaping from slope-aware candidate shelves. Difficulty is encoded in both width and score multiplier:

- EASY: wide lower shelf or gorge-floor pad, `1x`.
- MEDIUM: medium-width mid-elevation shelf, `2x`.
- HARD: narrow high or exposed shelf, `3x`.
- EXPERT: very narrow ridge or gorge-side shelf, `5x`.

The exact pad vertices are flat. The neighboring terrain blends toward the pad height over one or two samples so pads read as carved shelves rather than rectangular cuts.

## Spawn Profiles

The lander starts with nonzero downward velocity on purpose. The player begins already descending, matching the classic arcade feel where the first decision matters immediately.

| Profile | Initial VY | Initial VX | Fuel | Altitude |
|---------|------------|------------|------|----------|
| EASY | -2.5 | 0 | 100 | 75 |
| NORMAL | -3.5 | seeded random [-0.5, 0.5] | 95 | 95 |
| HARD | -5.0 | seeded random [-1.0, 1.0] | 85 | 110 |
| CHALLENGE | -7.0 | seeded random [-2.0, 2.0] | 75 | 125 |

Spawn X is chosen from deterministic terrain-aware candidates: gorge floors, ridges, pad neighborhoods, and spaces between pads. The same terrain seed and profile produce replayable starts, while profile changes intentionally alter the initial velocity, fuel, and spawn candidate selection.
