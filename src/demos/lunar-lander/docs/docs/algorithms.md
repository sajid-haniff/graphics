# Algorithms

> A catalog of every distinct algorithmic technique used in the project, with pseudocode, complexity, and pointers into the codebase.
> Many of these are tiny — the goal is not to celebrate cleverness, it's to make every clever bit *findable*.

---

## Table of contents

- [Numerics](#numerics)
  - [Semi-implicit Euler integration](#semi-implicit-euler-integration)
  - [Continuous-time exponential damping](#continuous-time-exponential-damping)
  - [Exponential smoothing for camera follow](#exponential-smoothing-for-camera-follow)
- [Determinism](#determinism)
  - [Linear-congruential PRNG](#linear-congruential-prng)
  - [Seed mixing](#seed-mixing)
- [Procedural generation](#procedural-generation)
  - [Value noise with smoothstep](#value-noise-with-smoothstep)
  - [Fractal Brownian motion](#fractal-brownian-motion)
  - [Gaussian landform composition](#gaussian-landform-composition)
  - [Two-sweep slope limiter](#two-sweep-slope-limiter)
  - [Top-k candidate selection](#top-k-candidate-selection)
- [Geometry](#geometry)
  - [Piecewise-linear height query](#piecewise-linear-height-query)
  - [2D point rotation](#2d-point-rotation)
  - [Single-point ground contact](#single-point-ground-contact)
- [Particle systems](#particle-systems)
  - [Carry-counter discrete emission](#carry-counter-discrete-emission)
  - [Bounded ring-style storage](#bounded-ring-style-storage)
  - [In-place reverse-sweep removal](#in-place-reverse-sweep-removal)
- [Transforms](#transforms)
  - [Camera composite](#camera-composite)
  - [Inverse-transform pixel size](#inverse-transform-pixel-size)
- [Decision logic](#decision-logic)
  - [Half-space safety predicate](#half-space-safety-predicate)
  - [Approach-strength heuristic](#approach-strength-heuristic)

---

# Numerics

## Semi-implicit Euler integration

Used for: lander dynamics, debris dynamics, particle dynamics, explosion fragments.

```text
function step(state, input, dt):
    a   = forces(state, input) / m              # acceleration at current pose
    v'  = v + a · dt                            # update velocity first
    p'  = p + v' · dt                           # position uses the new velocity
    return (p', v')
```

**Complexity**: $O(1)$ per state per step.

**Why this and not RK4**: See [`docs/physics.md`](physics.md#why-not-rk4). Briefly — RK4's mid-stage evaluations are awkward when inputs are discontinuous and collisions are tested per-frame, and the symplectic property of semi-implicit Euler matters more for the energy bookkeeping of an arcade game than RK4's higher-order truncation error.

---

## Continuous-time exponential damping

Used for: angular damping (`omega`), linear drag (`vel`), debris drag, shard drag.

```text
function damp(x, k, dt):
    return x * exp(−k · dt)
```

This is the exact solution to $\dot x = -k x$.

**Why not multiply by a fixed constant per frame?** Because a constant like `omega *= 0.92` assumes a frame-rate of exactly 60 Hz. At 30 Hz it dampens half as much, at 120 Hz twice as much. The exponential form is **frame-rate-independent at any legal `dt`**.

**Complexity**: $O(1)$ per damped scalar.

---

## Exponential smoothing for camera follow

Used for: camera center, camera zoom, flame length.

A first-order low-pass filter, discretized exactly:

$$
\alpha = 1 - e^{-k \,\Delta t},\qquad x \leftarrow x + \alpha(x^\star - x)
$$

```text
function smoothFollow(currentValue, targetValue, rate, dt):
    alpha = 1 − exp(−rate · dt)
    return currentValue + (targetValue − currentValue) * alpha
```

Choose `rate` (units: 1/s) such that the filter follows at the desired speed:

| Rate $k$ | Time constant $1/k$ | Half-life $\ln 2 / k$ |
|---|---|---|
| 1 | 1.0 s | 0.69 s |
| 2.2 (camera zoom) | 0.45 s | 0.31 s |
| 3.2 (camera position) | 0.31 s | 0.22 s |
| 18 (flame ramp) | 0.056 s | 0.039 s |

Used throughout the codebase. **Never write `x *= 0.9` for smoothing.**

---

# Determinism

## Linear-congruential PRNG

Used for: every randomized subsystem (terrain, particles, explosions, debris, starfield, spawn).

```text
function lcg(seed):
    s = seed mod 2^32
    return function():
        s = (Math.imul(s, 1664525) + 1013904223) mod 2^32
        return s / 2^32
```

**Constants**: The Numerical Recipes choice $(a = 1664525,\;c = 1013904223)$ on a 32-bit state. Period is the full $2^{32}$.

**Properties**:
- **Period**: $2^{32}$ ≈ 4.3 × 10⁹ (more than enough for our 1000-call-per-chunk budget).
- **Equidistribution**: Hull-Dobell theorem applies — the LCG generates every value in $\{0, 1, ..., 2^{32}-1\}$ exactly once per period.
- **Low-bit weakness**: The lowest bits cycle with very short period. We always use the high bits via the `/ 2^32` divide, which mitigates this.

**Complexity**: $O(1)$ per call.

**Not cryptographic.** Don't use this for anything that needs unpredictability.

---

## Seed mixing

Used for: producing independent PRNG streams from a single root seed (terrain chunks, explosion events).

```text
function mixSeed(rootSeed, index):
    return (Math.imul(rootSeed, 1103515245) XOR Math.imul(index, 2654435761)) mod 2^32
```

The constant `2654435761` is the Fibonacci hash multiplier ($2^{32} / \varphi$); `1103515245` is the glibc LCG multiplier. The XOR mixes them.

**Why this works**: The two multiplications spread input bits across the output, the XOR combines them, and the resulting integer becomes a high-quality seed for an LCG that produces a stream uncorrelated with `mixSeed(root, anyOtherIndex)`.

**Use in the codebase**:

| Call site | Purpose |
|---|---|
| `mixSeed(roundSeed, chunkIndex)` | Independent terrain streams per chunk |
| `roundSeed ^ 0x7a17c9d3` | Starfield seed |
| `roundSeed ^ 0x6d2b79f5` | Environment-effects seed |
| `roundSeed ^ Math.imul(roundNumber+1, 0x4d3a9f17)` | Per-round particle seed |
| `boomSeed = roundSeed ^ … ^ eventCounter * 0x85ebca6b ^ posBits` | Per-crash explosion seed |

**Complexity**: $O(1)$.

---

# Procedural generation

## Value noise with smoothstep

Used for: the underlying noise function for terrain fBm.

```text
function valueNoise1D(table, x):
    i   = floor(x)
    t   = x − i
    a   = table[i      mod n]
    b   = table[(i+1)  mod n]
    return lerp(a, b, smoothstep(t))
where smoothstep(t) = 3t² − 2t³
```

**Properties**: $C^1$-continuous (the smoothstep has zero derivative at both ends, so the noise is differentiable everywhere).

**Why smoothstep and not raw lerp?** Linear interpolation between random samples produces a sawtooth (visible "creases" at every integer). Smoothstep flattens those creases.

**Complexity**: $O(1)$ per evaluation. The table is a 256-entry pre-randomized array — modular indexing handles wrap-around.

---

## Fractal Brownian motion

Used for: terrain base shape, terrain fine detail.

```text
function fbm(noise, x, octaves=5):
    amp, freq, sum, norm = 1, 1, 0, 0
    for i in 0..octaves-1:
        sum  += amp * noise(x * freq)
        norm += amp
        amp  *= 0.5     # persistence
        freq *= 2       # lacunarity
    return sum / norm
```

The output is naturally bounded near $[0, 1]$ regardless of octave count, because the normalizer $\sum 2^{-i}$ converges to 2.

**Spectral character**: fBm has a $1/f^\beta$ power spectrum with $\beta = 2 \log_2(1/\text{persistence}) = 2$. That's a classic "pink-noise" character — gentle long-wavelength undulations dominate, with progressively weaker high-frequency detail. The eye reads this as "natural."

**Complexity**: $O(\text{octaves})$ per evaluation. With 5 octaves and a 256-entry table, each call is ~20 floating-point ops.

---

## Gaussian landform composition

Used for: explicit gorges and mountains, layered on top of fBm.

```text
function gaussian(x, center, width):
    return exp(− (x − center)² / (2 · width²))

# Composition:
for each x:
    h(x) -= gorgeDepth · gaussian(x, gorgeCenter, gorgeWidth)
    h(x) += mountainHeight · gaussian(x, mountainCenter, mountainWidth)
    ...
```

**Why Gaussians?** Smooth, $C^\infty$, localized (a Gaussian at $c$ with width $w$ has <2% of its peak influence past $|x - c| > 2w$). They are the most "polite" bumps mathematically — no ringing, no Gibbs phenomenon, no discontinuities.

**Complexity**: $O(\text{features})$ per terrain sample. With ~4 features per chunk and ~140 samples, that's <600 evaluations.

---

## Two-sweep slope limiter

Used for: keeping terrain free of vertical cliffs while preserving steep but not-quite-vertical segments.

```text
function limitSlopes(heights, maxDelta):
    # Forward sweep
    for i in 1..N:
        heights[i] = clamp(heights[i],
                           heights[i-1] - maxDelta,
                           heights[i-1] + maxDelta)
    # Backward sweep
    for i in N-1..0:
        heights[i] = clamp(heights[i],
                           heights[i+1] - maxDelta,
                           heights[i+1] + maxDelta)
```

**Why two sweeps?** A single forward sweep can leave the right side of a tall spike unconstrained. The backward sweep catches that. After both sweeps, no adjacent pair violates `|Δy| ≤ maxDelta`.

This is essentially a **clamped 1D projection onto the L∞-Lipschitz function class** — Lipschitz constant ≤ `maxDelta / dx`.

**Complexity**: $O(n)$ total (two passes, $n$ samples each).

**Property**: idempotent. Running it a second time is a no-op.

---

## Top-k candidate selection

Used for: pad placement, spawn-x selection.

```text
function pickFromTopK(candidates, score, rand, k):
    sorted = candidates.sort(by score, ascending)   # ← lower score = better
    window = min(k, sorted.length)
    return sorted[floor(rand() * window)]
```

The pattern: generate many candidates, score each, keep the best $k$, and pick uniformly from those $k$. Used twice in the codebase:

| Location | Candidates | $k$ |
|---|---|---|
| Pad placement (`terrain.js`) | All flat-shelf candidates of the right width | 3 (EASY) or 6 (rest) |
| Spawn-x selection | Pad midpoints, gorge floor, ridge top, etc. | 5 (EASY) or 3 (rest) |

**Why not just "argmin"?** Pure argmin produces the *same* pad layout every time the seed and chunk index match — uninteresting. Random-from-top-k preserves the seed's role in determinism while injecting just enough variation to keep replays feeling fresh when the chunk is regenerated with the same seed but a different round.

**Complexity**: $O(n \log n)$ for the sort. Could be reduced to $O(n + k \log k)$ with quickselect but unnecessary here.

---

# Geometry

## Piecewise-linear height query

Used for: terrain height sampling for collision, camera, particle emission.

```text
function heightAt(vertices, x):
    if x ≤ vertices[0].x:    return vertices[0].y
    if x ≥ vertices[-1].x:   return vertices[-1].y
    find i such that x ∈ [vertices[i].x, vertices[i+1].x]
    t = (x - vertices[i].x) / (vertices[i+1].x - vertices[i].x)
    return lerp(vertices[i].y, vertices[i+1].y, t)
```

**Complexity**: $O(n)$ with linear search. The chunked design keeps $n$ small (~140 per chunk) and the function is called once per frame for the lander, so $O(n)$ is fine.

**Could be $O(\log n)$** with binary search since vertices are sorted by x. Worth doing if profiled hot.

---

## 2D point rotation

Used for: lander body, explosion fragments, debris meshes.

```text
function rotPt(p, theta):
    c = cos(theta), s = sin(theta)
    return { x: p.x·c + p.y·s,  y: -p.x·s + p.y·c }
```

This is the rotation matrix from [`docs/physics.md`](physics.md#rotation-sign-convention):

$$
R(\theta) = \begin{bmatrix}\cos\theta & \sin\theta \\ -\sin\theta & \cos\theta\end{bmatrix}
$$

**Complexity**: $O(1)$ per point. Per frame the lander mesh costs ~10 rotations.

---

## Single-point ground contact

Used for: detecting when the lander has touched the ground.

```text
function contact(state, terrain):
    footLocal = (0, FOOT_Y)
    footWorld = state.pos + rotate(footLocal, state.theta)
    groundY   = heightAt(terrain, state.pos.x)
    return footWorld.y ≤ groundY
```

A single point — the centerline foot — rather than testing each leg tip independently. Combined with the safety predicate's $|\theta| \le \Theta_{\text{safe}}$ check, this approximates a "two-leg contact when upright" test without the false-negatives that a strict two-leg test would produce.

**Complexity**: $O(n)$ from `heightAt`, $O(1)$ otherwise.

---

# Particle systems

## Carry-counter discrete emission

Used for: every particle emitter that wants a continuous-rate spawn with frame-independent counts.

```text
function emitByRate(rateHz, dt):
    carry += rateHz * dt
    n = floor(carry)
    carry -= n
    spawn n particles
```

The trick: `carry` is a fractional accumulator. Each frame we add the desired rate × dt, then spawn the integer part. The fractional part persists to the next frame.

This produces **exactly `rateHz` particles per second on average**, regardless of frame rate, with no extra particles even at very high refresh rates.

**Complexity**: $O(n)$ per frame for spawn cost. The accumulator is $O(1)$.

Used in:
- `lunar-particles.js`: plume emission, dust emission
- `neon-debris.js`: meteor / asteroid / crystal / fireball / ice-shard / cinder spawn rates

---

## Bounded ring-style storage

Used for: every particle list, debris list, log list, shard list.

```text
function addBounded(list, item, max):
    list.push(item)
    if list.length > max:
        list.splice(0, list.length - max)   # drop oldest
```

When the list exceeds `max`, drop the oldest items. This is FIFO under overflow — the oldest particles disappear first, which matches what we want visually.

**Complexity**: $O(1)$ amortized when below capacity, $O(k)$ when shedding $k$ items (rare).

---

## In-place reverse-sweep removal

Used for: aging out dead particles every frame.

```text
function ageAndRemove(list, dt):
    for i in list.length-1 down to 0:
        update(list[i], dt)
        list[i].life -= dt
        if list[i].life ≤ 0:
            list.splice(i, 1)
```

Iterating backwards means an in-place `splice` doesn't break the loop index. This is the canonical JavaScript pattern for "iterate and possibly remove."

**Complexity**: $O(n)$ per frame. Each particle is touched once.

---

# Transforms

## Camera composite

Used for: rendering everything in world coordinates.

```text
function makeComposite(visibleWin, W, H):
    WORLD     = scale-translate that maps win to [0,1]×[0,1]
    DEVICE    = scale by (W, H)
    REFLECT_Y = flip-y around H
    return REFLECT_Y · DEVICE · WORLD
```

A 3×3 affine matrix (we use `M2D`, which stores the 2D affine as a 6-tuple `[a b c d tx ty]`).

```js
const sw = 1 / (visibleWin.right  - visibleWin.left);
const sh = 1 / (visibleWin.top    - visibleWin.bottom);
const tw = -visibleWin.left   * sw;
const th = -visibleWin.bottom * sh;
const WORLD = M2D.fromValues(sw, 0, 0, sh, tw, th);
return M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);
```

**Complexity**: $O(1)$ per frame. Rebuilt once and applied via `sk.applyMatrix(...)`.

---

## Inverse-transform pixel size

Used for: every stroke weight and visual size that must remain readable across zoom.

```text
function pixelToWorld(COMPOSITE):
    inverse = M2D.invert(COMPOSITE)
    return px => |M2D.transformPointDirection(inverse, [px, 0])|
```

Roughly: how big is one screen pixel in world units? Answer: the magnitude of the inverse-transformed unit-x vector. The implementation is one inverse + one matrix-vector multiply, both $O(1)$.

```js
const pixelToWorld = M2D.makePixelToWorld(COMPOSITE);
sk.strokeWeight(pixelToWorld(1.8));     // 1.8 screen pixels, in world units
```

Used pervasively — anywhere a `strokeWeight` or radius needs to stay visible regardless of camera zoom.

---

# Decision logic

## Half-space safety predicate

Used for: classifying a touchdown as safe or crash.

```text
function classifyTouchdown(state, pad):
    if pad is null:                  return CRASH
    if |state.vy|    > V_SAFE_Y:     return CRASH
    if |state.vx|    > V_SAFE_X:     return CRASH
    if |state.theta| > THETA_SAFE:   return CRASH
    if |state.omega| > OMEGA_SAFE:   return CRASH
    if state.x not in [pad.x1, pad.x2]:  return CRASH
    return SAFE
```

**Geometry**: This is the indicator function of an axis-aligned box (intersected with a slab on x). All five constraints must hold simultaneously — the safe region is the intersection of five half-spaces, which is a 5-dimensional rectangular cell.

**Complexity**: $O(1)$.

**Why not a smooth scoring function for safety?** Because the *consequence* of crossing the threshold is a binary outcome (life lost / score earned). The threshold should be sharp. The smooth function lives elsewhere — in the precision and softness *bonuses*, which scale the score smoothly inside the safe region.

---

## Approach-strength heuristic

Used for: pad glow intensity, particle pad-pulse rate, danger-halo coloring.

A scalar in $[0, 1]$ summarizing "how close is the lander to landing on this pad?":

```text
function padApproachStrength(pad, state):
    if state is missing: return 0
    padCenter = (pad.x1 + pad.x2) / 2
    padHalfW  = (pad.x2 - pad.x1) / 2

    xProx    = clamp(1 - |state.pos.x - padCenter| / (padHalfW + 14), 0, 1)
    altitude = max(0, state.pos.y - pad.y + FOOT_Y)
    yProx    = clamp(1 - altitude / 42, 0, 1)

    speedOk  = clamp(1 - max(0, |state.vy| - V_SAFE_Y) / 5, 0, 1)
    driftOk  = clamp(1 - max(0, |state.vx| - V_SAFE_X) / 4, 0, 1)
    leanOk   = clamp(1 - max(0, |state.theta| - THETA_SAFE) / 0.65, 0, 1)
    descending = state.vy < 0 ? 1 : 0.55

    return xProx · yProx · (0.35 + 0.65 · speedOk · driftOk · leanOk) · descending
```

**Why this shape?** Each factor is in $[0, 1]$, so the product is in $[0, 1]$. The pieces:

- **`xProx · yProx`**: pure geometric proximity. The pad is "approaching" only if the lander is over and near it.
- **`0.35 + 0.65 · skillTerm`**: even a sloppy approach contributes at least 35% — the pad still glows, just less. Skillful approaches glow brighter.
- **`descending`**: 100% credit when sinking, 55% otherwise. Encourages downward intent.

The output drives:

1. **Pad glow intensity**: `drawPadGlow` scales the halo by `strength`.
2. **Pad pulse particle rate**: `emitPadPulse` spawns more pulses when `strength` is high.
3. **Danger halo**: if `strength > 0.15` and any safety check is failing, the halo color switches to red.

**Complexity**: $O(1)$ per pad per frame. Called for visible pads only.

---

# Summary table

| Algorithm | Used for | Time | Space | Where |
|---|---|---|---|---|
| Semi-implicit Euler | Dynamics integration | $O(1)$ | $O(1)$ | `lander-dynamics.js` |
| Exponential damping | Angular/drag damping | $O(1)$ | $O(1)$ | `lander-dynamics.js`, `neon-debris.js` |
| Exponential smoothing | Camera, flame | $O(1)$ | $O(1)$ | `lunar-lander-demo.js` |
| LCG | Determinism | $O(1)$ | $O(1)$ | every randomized module |
| Seed mix | Independent streams | $O(1)$ | $O(1)$ | `terrain.js`, `lunar-lander-demo.js` |
| Value noise | Terrain base | $O(1)$ | $O(256)$ | `terrain.js` |
| fBm | Terrain base + detail | $O(\text{octaves})$ | $O(1)$ | `terrain.js` |
| Gaussian landforms | Cinematic terrain | $O(F)$ per sample | $O(1)$ | `terrain.js` |
| Slope limiter | No vertical cliffs | $O(N)$ | $O(1)$ | `terrain.js` |
| Top-k pick | Pad / spawn placement | $O(n \log n)$ | $O(n)$ | `terrain.js`, `lunar-lander-demo.js` |
| heightAt linear search | Collision, camera | $O(N)$ | $O(1)$ | `terrain.js` |
| 2D rotation | Lander, debris, explosion | $O(1)$ per point | $O(1)$ | everywhere |
| Carry counter | Particle emission | $O(1)$ | $O(1)$ | `lunar-particles.js`, `neon-debris.js` |
| Bounded list | Particle storage | $O(1)$ amortized | $O(\text{cap})$ | all particle modules |
| Reverse-sweep remove | Aging particles | $O(n)$ | $O(1)$ | all particle modules |
| Composite transform | World→device | $O(1)$ | $O(1)$ | `lunar-lander-demo.js` |
| Pixel-to-world | Stroke weights | $O(1)$ | $O(1)$ | everywhere |
| Half-space predicate | Landing classification | $O(1)$ | $O(1)$ | `lander-dynamics.js` |
| Approach strength | UX feedback | $O(1)$ per pad | $O(1)$ | `lunar-lander-demo.js` |
