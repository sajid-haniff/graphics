// ============================================================================
// lander-dynamics.js
// Pure equations of motion for the lunar lander — no p5, no scenegraph.
// Pure data in, pure data out. Reads like the ODE it implements.
//
// State: { pos:[x,y], vel:[vx,vy], theta:rad, omega:rad/s, fuel:number }
//   pos   — lander centre, Y-up world coordinates (meters)
//   vel   — linear velocity, m/s
//   theta — orientation; 0 = nose pointing +Y; positive = nose rotated right (+X)
//   omega — angular velocity, rad/s
//   fuel  — remaining propellant (dimensionless 0–FUEL_START; not SI kg)
//
// Input: { thrust:bool, rotLeft:bool, rotRight:bool }
//
// Integration: semi-implicit Euler, dt explicit throughout.
//   v ← v + a·dt      (velocity updated from acceleration first)
//   p ← p + v·dt      (position uses the updated velocity)
//   ω and θ follow the same pattern.
// ============================================================================

// ---------- Tunable constants ----------

// Physics
export const G_MOON            = 1.62;  // m/s² — Moon surface gravity (~1/6 Earth's)
export const ENGINE_ACCEL      = 5.0;   // m/s² — peak thrust acceleration at full throttle (constant mass v1)
export const BURN_RATE         = 7.0;   // arcade fuel units / s at τ = 1 (~14s full burn)

// Rotation (playtested starting point — retune via these exports)
export const RCS_ALPHA         = 7.0;   // rad/s² — angular acceleration from RCS thrusters
export const OMEGA_MAX         = 3.0;   // rad/s — hard cap on spin rate
export const OMEGA_DAMPING_RATE = 1.9;  // 1/s  — continuous-time exponential decay rate

// Fuel
export const FUEL_START        = 100.0;

// ---------- Landing-safety region in (vx, vy, θ, ω, x) space ----------
// SAFE iff ALL five conditions hold (see classifyTouchdown below).
export const V_SAFE_Y  = 2.5;   // m/s — max vertical speed for safe landing
export const V_SAFE_X  = 1.5;   // m/s — max horizontal drift for safe landing
export const THETA_SAFE = 0.26; // rad (~15°) — max lean for safe landing
export const OMEGA_SAFE = 0.5;  // rad/s — max spin rate for safe landing

// ---------- Integration ----------

// Thrust direction in Y-up world coords.  This is the authoritative heading
// convention: theta = 0 -> +Y, positive theta -> +X, so nose/thrust are
// [sin(theta), cos(theta)].
const thrustDir = (theta) => [Math.sin(theta), Math.cos(theta)];

export const effectiveThrottle = (state, input) =>
    (state.fuel > 0 && input.thrust) ? 1.0 : 0.0;

// step: single semi-implicit Euler step.
// Returns a new state; the input state is never mutated.
// env is explicit profile data: gravity, drag, and wind. Omitting it preserves
// the original Moon behavior exactly.
export const step = (state, input, dt, env = {}) => {
    const { pos, vel, theta, omega, fuel } = state;
    const gravity = env.gravity ?? G_MOON;
    const drag = env.drag ?? 0;
    const wind = env.wind || [0, 0];

    // Throttle: binary for v1.  Variable mass is a v2 extension (see docs/).
    const tau = effectiveThrottle(state, input);
    const td  = thrustDir(theta);

    // Linear acceleration:  a = [T·sin θ,  −g_moon + T·cos θ]
    const relVx = vel[0] - wind[0];
    const relVy = vel[1] - wind[1];
    const ax = tau * ENGINE_ACCEL * td[0] - drag * relVx;
    const ay = -gravity + tau * ENGINE_ACCEL * td[1] - drag * relVy;

    // Semi-implicit Euler for translation
    const vx1 = vel[0] + ax * dt;
    const vy1 = vel[1] + ay * dt;
    const x1  = pos[0] + vx1 * dt;
    const y1  = pos[1] + vy1 * dt;

    // Angular — RCS torque first, then continuous-time exponential damping,
    // then hard clamp.  Using exp(-OMEGA_DAMPING_RATE·dt) is the exact solution
    // to dω/dt = −k·ω and is frame-rate-independent at any legal dt.
    // A flat per-frame multiply (omega *= 0.92) is NOT used here — that form
    // reintroduces frame-rate dependence even when dt is in scope.
    // Match thrustDir/rendering: left rotates toward -X (negative theta),
    // right rotates toward +X (positive theta).
    const rcsInput = (input.rotRight ? RCS_ALPHA : 0) - (input.rotLeft ? RCS_ALPHA : 0);
    let omega1 = omega + rcsInput * dt;
    omega1 *= Math.exp(-OMEGA_DAMPING_RATE * dt);
    omega1  = Math.max(-OMEGA_MAX, Math.min(OMEGA_MAX, omega1));
    const theta1 = theta + omega1 * dt;

    return {
        pos:   [x1, y1],
        vel:   [vx1, vy1],
        theta: theta1,
        omega: omega1,
        fuel:  Math.max(0, fuel - tau * BURN_RATE * dt),
    };
};

// ---------- Landing / crash predicate ----------
// Half-space safety region in (vx, vy, θ, ω, x) space.
// pad is { x1, x2, y } — must be the pad the lander is currently over (or null).
// Returns 'safe' | 'crash'.
export const classifyTouchdown = (state, pad) => {
    if (!pad)                                    return 'crash';  // not over a pad
    if (Math.abs(state.vel[1]) > V_SAFE_Y)       return 'crash';  // sinking too fast
    if (Math.abs(state.vel[0]) > V_SAFE_X)       return 'crash';  // drifting sideways
    if (Math.abs(state.theta) > THETA_SAFE)      return 'crash';  // leaning too far
    if (Math.abs(state.omega) > OMEGA_SAFE)      return 'crash';  // spinning
    if (state.pos[0] < pad.x1 ||
        state.pos[0] > pad.x2)                   return 'crash';  // missed the pad
    return 'safe';
};
