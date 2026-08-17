# Mathematical Appendix

> Background, derivations, and identities that are too long to inline elsewhere but worth having on hand.

---

## Table of contents

- [Rotation matrices](#rotation-matrices)
- [Integrators](#integrators)
- [Noise theory](#noise-theory)
- [Gaussian basis](#gaussian-basis)
- [Slope and Lipschitz constraints](#slope-and-lipschitz-constraints)
- [LCG pseudorandom numbers](#lcg-pseudorandom-numbers)
- [Symbol reference](#symbol-reference)

---

## Rotation matrices

### The two 2D rotation matrices

There are exactly two 2D rotation matrices, both of determinant +1:

$$
R_{\text{CCW}}(\theta) =
\begin{bmatrix}\cos\theta & -\sin\theta \\ \sin\theta & \cos\theta\end{bmatrix},
\qquad
R_{\text{CW}}(\theta) =
\begin{bmatrix}\cos\theta & \sin\theta \\ -\sin\theta & \cos\theta\end{bmatrix}.
$$

They are related by transpose: $R_{\text{CW}}(\theta) = R_{\text{CCW}}(\theta)^T = R_{\text{CCW}}(-\theta)$.

Applied to a Y-up Cartesian frame:

- $R_{\text{CCW}}(\theta)$ rotates a point **counter-clockwise** by $\theta$.
- $R_{\text{CW}}(\theta)$ rotates a point **clockwise** by $\theta$.

The codebase uses **$R_{\text{CW}}(\theta)$** for `rotPt`. The reason is detailed in [`docs/physics.md`](physics.md#rotation-sign-convention) — the choice makes the RIGHT arrow key visually rotate the nose to the right, preserving an intuitive input-to-output mapping.

### Identities

Repeated rotation:

$$
R(\theta_1) R(\theta_2) = R(\theta_1 + \theta_2)
$$

Inverse:

$$
R(\theta)^{-1} = R(-\theta) = R(\theta)^T
$$

Derivative:

$$
\frac{d}{d\theta} R(\theta) = J\,R(\theta),\quad
J = \begin{bmatrix}0 & 1 \\ -1 & 0\end{bmatrix}
\;\;(\text{for the CW convention used here})
$$

Action on the nose:

$$
R_{\text{CW}}(\theta) \begin{bmatrix}0\\1\end{bmatrix}
= \begin{bmatrix}\sin\theta\\\cos\theta\end{bmatrix}
\;=\; \hat{\mathbf n}(\theta)
$$

This is exactly `thrustDir(theta) = [sin θ, cos θ]` in the code.

---

## Integrators

Given a state $\mathbf{x}$ and its derivative $\dot{\mathbf{x}} = \mathbf{f}(\mathbf{x}, t)$, the three single-step Euler-family integrators are:

### Explicit Euler

$$
\mathbf{x}_{n+1} = \mathbf{x}_n + \mathbf{f}(\mathbf{x}_n, t_n)\,\Delta t
$$

First-order accurate, **conditionally stable**. For oscillatory systems it amplifies energy, eventually diverging.

### Implicit (backward) Euler

$$
\mathbf{x}_{n+1} = \mathbf{x}_n + \mathbf{f}(\mathbf{x}_{n+1}, t_{n+1})\,\Delta t
$$

First-order accurate, **unconditionally stable**. For oscillatory systems it dissipates energy, eventually stopping. Requires solving an implicit equation per step (Newton iteration in the general case).

### Semi-implicit (symplectic) Euler — the one we use

For a system split into position $\mathbf{q}$ and momentum $\mathbf{p}$:

$$
\mathbf{p}_{n+1} = \mathbf{p}_n + \mathbf{F}(\mathbf{q}_n)\,\Delta t
$$
$$
\mathbf{q}_{n+1} = \mathbf{q}_n + \mathbf{M}^{-1}\mathbf{p}_{n+1}\,\Delta t
$$

For our lander (with unit mass), $\mathbf{p} = \mathbf{v}$ and:

$$
\mathbf{v}_{n+1} = \mathbf{v}_n + \mathbf{a}(\mathbf{q}_n)\,\Delta t,\qquad
\mathbf{q}_{n+1} = \mathbf{q}_n + \mathbf{v}_{n+1}\,\Delta t.
$$

### Stability comparison

For the simple harmonic oscillator $\ddot x = -\omega^2 x$:

| Integrator | Energy behavior |
|---|---|
| Explicit Euler | $\|E_{n+1}\|^2 = (1 + \omega^2 \Delta t^2) \|E_n\|^2$ — grows |
| Implicit Euler | $\|E_{n+1}\|^2 = \|E_n\|^2 / (1 + \omega^2 \Delta t^2)$ — decays |
| Semi-implicit | $\|E_{n+1}\|^2 \approx \|E_n\|^2$ — bounded |

The semi-implicit form's energy oscillates around a constant value indefinitely. That's the **symplectic** property.

### Why higher order isn't always better

RK4 has $O(\Delta t^4)$ truncation error but uses **4 derivative evaluations per step**. For systems where the derivative is cheap and continuous, RK4 is faster (you can take steps 10× larger). For systems where:

- The derivative depends on a control that can flip mid-step (binary thrust).
- Per-frame collision detection is needed against geometry.
- The motion is short enough that even Euler's truncation error is sub-pixel.

…RK4's mid-stage evaluations become a liability. Semi-implicit Euler wins.

---

## Noise theory

### Why fBm is "natural-looking"

Natural phenomena — mountain silhouettes, coastline outlines, tree branches, river paths — have approximately self-similar statistics. Magnify a coastline 10× and it still looks like a coastline.

Self-similar random functions have power spectra of the form

$$
S(\omega) \propto \frac{1}{\omega^\beta}
$$

with $1 \le \beta \le 3$. Pure noise has $\beta = 0$ (white), Brownian motion has $\beta = 2$ (red/Brownian), and fBm at persistence 0.5 has $\beta = 2$ as well.

### Power spectrum of fBm

For fBm summing $n$ octaves at frequencies $2^i$ with amplitudes $A^i$:

$$
S(\omega) \approx \sum_{i=0}^{n-1} A^{2i} \,\delta(\omega - 2^i \omega_0)
$$

When persistence $A = 0.5$, the amplitude squared at octave $i$ is $4^{-i}$, while the frequency is $2^i$. So:

$$
\frac{\text{amplitude}^2}{\text{frequency}} = \frac{4^{-i}}{2^i} = 8^{-i}.
$$

Each successive octave contributes 1/8 of the previous octave's power per unit bandwidth. This produces a slope on a log-log plot of −1 dB per octave per decade — the canonical pink-noise character.

### Smoothstep continuity

The Hermite smoothstep $S(t) = 3t^2 - 2t^3$ has the properties:

$$
S(0) = 0,\quad S(1) = 1,\quad S'(0) = S'(1) = 0,\quad S''(0) = 6,\;\; S''(1) = -6.
$$

It is $C^1$ but **not** $C^2$ at the endpoints. For visual purposes $C^1$ is enough — the eye sees a $C^0$ kink but not a $C^1$ one. Some references use the $C^2$-continuous *quintic* smoothstep $6t^5 - 15t^4 + 10t^3$ (Perlin 2002), which we don't need for terrain — it would cost extra cycles per noise sample with no perceptible benefit.

---

## Gaussian basis

The 1D Gaussian:

$$
G(x; c, w) = \exp\!\left(-\frac{(x-c)^2}{2w^2}\right)
$$

Useful properties:

| Property | Value |
|---|---|
| Peak | $G(c) = 1$ |
| Half-max | $G(c \pm w\sqrt{2 \ln 2}) = 0.5$ |
| FWHM | $2w\sqrt{2\ln 2} \approx 2.355\,w$ |
| Effective width (2σ) | $4w$ contains 95.4% of integral |
| Integral | $\int G\,dx = w\sqrt{2\pi}$ |
| $C^\infty$ | yes — all derivatives exist |

### Linear superposition

The sum of Gaussians is **not** another Gaussian, but it is well-behaved:

$$
\sum_k a_k\,G(x; c_k, w_k) - \sum_k b_k\,G(x; c_k', w_k')
$$

is smooth, bounded (since each Gaussian is bounded), and locally simple to reason about. Each Gaussian has ~95% of its effect within 2σ, so non-overlapping features don't interact.

### Why we use Gaussians and not B-splines

Quadratic or cubic B-splines also give smooth, localized bumps. They're cheaper to evaluate (no `exp`). We use Gaussians because:

1. The math is more familiar to most readers (one σ knob, intuitive width).
2. The infinite-tailed shape means a small Gaussian *almost* fades to zero before its neighbor's tail begins, but the smooth tail-overlap prevents visible joins.
3. Performance is not a concern — we compute ~600 Gaussians per chunk, once per round.

---

## Slope and Lipschitz constraints

A function $h(x)$ is **L-Lipschitz** if

$$
|h(x) - h(y)| \le L\,|x - y| \quad \text{for all } x, y.
$$

For our 1D heightmap with sample spacing $\Delta x$, the discrete equivalent of the Lipschitz condition is:

$$
|h_{i+1} - h_i| \le \Delta y_{\max}
$$

with $L = \Delta y_{\max} / \Delta x$.

### The two-sweep slope limiter

Given heights that may violate the Lipschitz condition, we project onto the feasible set via two sweeps:

```text
forward:  h[i] ← clamp(h[i], h[i-1] - Δy_max, h[i-1] + Δy_max)
backward: h[i] ← clamp(h[i], h[i+1] - Δy_max, h[i+1] + Δy_max)
```

**Claim**: after both sweeps, $|h_{i+1} - h_i| \le \Delta y_{\max}$ for all $i$.

**Proof sketch**: Suppose after the forward sweep, $h_i$ and $h_{i+1}$ satisfy $h_{i+1} \le h_i + \Delta y_{\max}$ and $h_{i+1} \ge h_i - \Delta y_{\max}$ trivially. The backward sweep clamps $h_i$ against $h_{i+1}$, but cannot increase the right-side difference — only $h_i$ moves. So the symmetric constraint holds after backward. QED.

The limiter is also **idempotent** (running it twice changes nothing) and **monotone** (it never increases the L∞ deviation from the original).

---

## LCG pseudorandom numbers

The LCG recurrence:

$$
s_{n+1} = (a\,s_n + c) \mod m
$$

with $a = 1664525$, $c = 1013904223$, $m = 2^{32}$ (the Numerical Recipes parameters).

### Period (Hull-Dobell theorem)

The LCG has full period $m$ iff:

1. $\gcd(c, m) = 1$ — here $c$ is odd, $m$ is a power of 2, so $\gcd = 1$. ✓
2. $a - 1$ is divisible by every prime factor of $m$ — here $m$'s only prime factor is 2, and $a - 1 = 1664524 = 4 \cdot 416131$, even. ✓
3. $a - 1$ is divisible by 4 if $m$ is divisible by 4 — $a - 1 = 1664524$, $1664524 / 4 = 416131$. ✓

All three conditions hold, so the LCG has full period $2^{32} \approx 4.29 \times 10^9$.

### Equidistribution

By Hull-Dobell, the LCG visits every value in $\{0, 1, \ldots, 2^{32}-1\}$ **exactly once** per period. So uniform distribution on 32-bit integers is guaranteed.

### Low-bit weakness

The low-order bits of an LCG with $m = 2^{32}$ have very short periods (the lowest bit has period 2, the bottom 2 bits have period 4, etc.). For sub-bit applications (e.g. random shuffles using `s & 1`), this matters. We always use the high bits via:

```js
return s / 0x100000000;   // / 2^32, returns float in [0, 1)
```

which uses the *highest* bits primarily. The high-bit periods are effectively the full period, so this works fine for terrain generation, particle emission, and pad selection.

### Cryptographic warning

LCGs are trivially predictable. Anyone who sees two consecutive outputs can solve for $a$ and $c$ algebraically. Don't use this for anything that needs unpredictability.

---

## Symbol reference

Constants and tunables used across the documentation:

### Physics

| Symbol | Meaning | Value | File |
|---|---|---|---|
| $g$ | Surface gravity | 1.62 m/s² (Moon) | `lander-dynamics.js` |
| $a_T$ | Engine acceleration at full throttle | 5.0 m/s² | `lander-dynamics.js` |
| $r_b$ | Burn rate | 7.0 units/s | `lander-dynamics.js` |
| $\alpha_{\text{rcs}}$ | RCS angular acceleration | 7.0 rad/s² | `lander-dynamics.js` |
| $k_\omega$ | Angular damping rate | 1.9 / s | `lander-dynamics.js` |
| $\Omega_{\max}$ | Max angular velocity | 3.0 rad/s | `lander-dynamics.js` |
| $f_0$ | Initial fuel | 100 units | `lander-dynamics.js` |
| $V_{\text{safe},y}$ | Max safe vertical speed | 2.5 m/s | `lander-dynamics.js` |
| $V_{\text{safe},x}$ | Max safe horizontal speed | 1.5 m/s | `lander-dynamics.js` |
| $\Theta_{\text{safe}}$ | Max safe lean | 0.26 rad ≈ 15° | `lander-dynamics.js` |
| $\Omega_{\text{safe}}$ | Max safe spin | 0.5 rad/s | `lander-dynamics.js` |

### Terrain

| Symbol | Meaning | Value | File |
|---|---|---|---|
| $W$ | Chunk width (world units) | 240 | `terrain.js` (default `win`) |
| $H$ | Chunk height range | 160 | `terrain.js` |
| $N$ | Sample count − 1 | 119–159 | `terrain.js` |
| $y_{\text{floor}}$ | Min usable height | $\text{bottom} + 0.06H$ | `terrain.js` |
| $y_{\text{ceil}}$ | Max usable height | $\text{bottom} + 0.88H$ | `terrain.js` |
| $\Delta y_{\max}$ | Slope-limit max delta | $0.18 H$ | `terrain.js` |
| Octaves (base) | fBm octaves for terrain shape | 5 | `terrain.js` |
| Octaves (detail) | fBm octaves for vector detail | 4 | `terrain.js` |
| Detail frequency | Multiplier for u in detail fBm | 16.0 | `terrain.js` |

### Scoring

| Symbol | Meaning | Value | File |
|---|---|---|---|
| $B$ | Base score per landing | 1000 | `lunar-lander-demo.js` |
| $b_f$ | Fuel bonus per remaining unit | 8 | `lunar-lander-demo.js` |
| $b_p$ | Max precision bonus | 500 | `lunar-lander-demo.js` |
| $b_s$ | Max softness bonus | 300 | `lunar-lander-demo.js` |
| Pad multipliers | EASY, MEDIUM, HARD, EXPERT | 1, 2, 3, 5 | `terrain.js` |

### Camera

| Symbol | Meaning | Value | File |
|---|---|---|---|
| $k_{\text{pos}}$ | Position smoothing rate | 3.2 / s | `lunar-lander-demo.js` |
| $k_{\text{zoom}}$ | Zoom smoothing rate | 2.2 / s | `lunar-lander-demo.js` |
| Min ship pixels | When to apply render scale | 22 | `lunar-lander-demo.js` |
| Max render scale | Upper bound on lander resize | 1.8 | `lunar-lander-demo.js` |

### Determinism

| Constant | Value | Use |
|---|---|---|
| $a_{\text{LCG}}$ | 1664525 | LCG multiplier |
| $c_{\text{LCG}}$ | 1013904223 | LCG increment |
| $m_{\text{LCG}}$ | $2^{32}$ | LCG modulus |
| $\varphi^{-1} \cdot 2^{32}$ | 2654435761 | Fibonacci hash multiplier for seed mix |
| glibc LCG multiplier | 1103515245 | Used in `mixSeed` |
