// /src/demos/arcade/swarm.js
// Flocking swarm (Reynolds Boids): Separation, Alignment, Cohesion
// + soft target "arrive/orbit" around the ship to avoid smothering.
//
// API: createSwarm(sk, THEME, pixelToWorld, win, count=6, opts?)
// Returns: { members, update(getShipPosFn), draw() }
//
// Conventions: world is Y-up; all p5 via `sk`; vectors via V wrapper.

import { V } from '../../lib/esm/V';
import { neonPoly } from './neon';

// ---------- helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const toDeg = (rad) => (rad * 180) / Math.PI;

// Heading rule (due to final Y-flip): given dir (x,y), visual angle deg = -atan2(x, y)
const degFromDir = (vx, vy) => -toDeg(Math.atan2(vx, vy));

// limit magnitude (using V.limit)
const limit = (v, max) => V.limit(v, max);

// make a normalized direction from A to B (V.create)
const dirAB = (ax, ay, bx, by) => {
    const d = V.create(bx - ax, by - ay);
    return V.normalize(d);
};

// steering = desired - velocity
const steerTo = (vel, desired, maxForce) => {
    const steer = V.sub(desired, vel);
    return limit(steer, maxForce);
};

// Project a vector onto its perpendicular (for orbiting tangential motion)
const perp = (v) => V.perp(v); // wrapper provides perp

// ---------- factory ----------
export const createSwarm = (sk, THEME, pixelToWorld, win, count = 6, opts = {}) => {
    const cfg = {
        // boid radii / draw scale
        memberRadius: 0.55,
        drawScale: 0.85,

        // motion limits (world units / frame & per-frame accel)
        maxSpeed: 0.38,
        maxForce: 0.015,

        // flock radii
        neighRadius: 3.5,
        sepRadius: 1.6,

        // flock weights
        wSep: 1.25,
        wAli: 0.9,
        wCoh: 0.75,

        // ship interaction
        standoffRadius: 4.5,  // distance where they prefer to orbit instead of pile on
        hardAvoid: 1.8,       // strong separation close to ship
        targetWeight: 0.8,    // how much they care about the ship overall

        // wander to keep it lively
        wanderJitter: 0.02,
        wanderWeight: 0.35,

        // bounds
        margin: 1.0,
        ...opts
    };

    // canonical chevron (Y-up, forward +Y)
    const CHEVRON = [
        { x:  0.00, y:  0.55 },
        { x:  0.30, y: -0.55 },
        { x: -0.30, y: -0.55 },
    ];

    // spawn ring around origin so they arrive from different angles
    const members = [];
    for (let i = 0; i < count; i++) {
        const a = sk.radians(rand(0, 360));
        const r = rand(6, 11);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const pos = V.create(x, y);
        const vel = V.create(Math.cos(a + Math.PI/2) * 0.2, Math.sin(a + Math.PI/2) * 0.2);
        const acc = V.create(0, 0);
        members.push({
            pos, vel, acc,
            r: cfg.memberRadius,
        });
    }

    // neighbor pass (naive; counts are small)
    const neighborsOf = (i) => {
        const me = members[i];
        const out = [];
        for (let j = 0; j < members.length; j++) {
            if (j === i) continue;
            const o = members[j];
            const dx = o.pos[0] - me.pos[0];
            const dy = o.pos[1] - me.pos[1];
            if (dx*dx + dy*dy <= cfg.neighRadius * cfg.neighRadius) out.push(o);
        }
        return out;
    };

    const update = (getShipPos) => {
        // Accumulate steering forces per member
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const ns = neighborsOf(i);

            // --- Separation ---
            let sep = V.create(0,0);
            if (ns.length) {
                for (const n of ns) {
                    const dx = m.pos[0] - n.pos[0];
                    const dy = m.pos[1] - n.pos[1];
                    const d2 = dx*dx + dy*dy;
                    const d = Math.sqrt(d2);
                    if (d > 1e-6 && d < cfg.sepRadius) {
                        // weighted away force
                        const away = V.scale(V.create(dx/d, dy/d), (cfg.sepRadius - d) / cfg.sepRadius);
                        sep = V.add(sep, away);
                    }
                }
            }
            sep = limit(sep, cfg.maxForce);

            // --- Alignment ---
            let ali = V.create(0,0);
            if (ns.length) {
                for (const n of ns) ali = V.add(ali, n.vel);
                ali = V.scale(ali, 1 / ns.length);
                ali = limit(ali, cfg.maxForce);
            }

            // --- Cohesion ---
            let coh = V.create(0,0);
            if (ns.length) {
                let cx = 0, cy = 0;
                for (const n of ns) { cx += n.pos[0]; cy += n.pos[1]; }
                cx /= ns.length; cy /= ns.length;
                const desired = V.scale(dirAB(m.pos[0], m.pos[1], cx, cy), cfg.maxSpeed * 0.8);
                coh = steerTo(m.vel, desired, cfg.maxForce);
            }

            // --- Targeting: arrive/orbit around ship ---
            let tgt = V.create(0,0);
            const ship = getShipPos?.();
            if (ship) {
                const toShip = V.create(ship[0] - m.pos[0], ship[1] - m.pos[1]);
                const dist = Math.hypot(toShip[0], toShip[1]);
                let desired;
                if (dist > cfg.standoffRadius) {
                    // arrive: slow as it approaches standoff
                    const slowed = cfg.maxSpeed * clamp((dist - cfg.standoffRadius) / cfg.standoffRadius, 0.25, 1.0);
                    desired = V.scale(V.normalize(toShip), slowed);
                } else {
                    // orbit: steer tangentially around ship (pick side stochastically)
                    const tang = perp(V.normalize(toShip));
                    const side = (i % 2 === 0) ? 1 : -1;
                    desired = V.scale(tang, cfg.maxSpeed * 0.85 * side);
                    // also a gentle outward push to keep ring shape
                    desired = V.add(desired, V.scale(V.normalize(toShip), 0.05));
                }
                // strong local avoidance if too close
                if (dist < cfg.hardAvoid) {
                    const away = V.scale(V.normalize(V.negate(toShip)), clamp((cfg.hardAvoid - dist) * 0.25, 0, 0.35));
                    desired = V.add(desired, away);
                }
                tgt = steerTo(m.vel, desired, cfg.maxForce);
            }

            // --- Wander ---
            const jitter = V.create(rand(-1,1)*cfg.wanderJitter, rand(-1,1)*cfg.wanderJitter);
            const wan = limit(jitter, cfg.maxForce * 0.5);

            // Blend forces
            let acc = V.create(0,0);
            acc = V.add(acc, V.scale(sep, cfg.wSep));
            acc = V.add(acc, V.scale(ali, cfg.wAli));
            acc = V.add(acc, V.scale(coh, cfg.wCoh));
            acc = V.add(acc, V.scale(tgt, cfg.targetWeight));
            acc = V.add(acc, V.scale(wan, cfg.wanderWeight));

            // store
            m.acc = limit(acc, cfg.maxForce);
        }

        // Integrate + bounds wrap
        for (const m of members) {
            // v += a, clamp
            m.vel = limit(V.add(m.vel, m.acc), cfg.maxSpeed);
            // pos += vel
            m.pos = V.add(m.pos, m.vel);

            // world wrap with a small margin
            const margin = cfg.margin;
            if (m.pos[0] > win.right + margin)  m.pos[0] = win.left - margin;
            if (m.pos[0] < win.left  - margin)  m.pos[0] = win.right + margin;
            if (m.pos[1] > win.top   + margin)  m.pos[1] = win.bottom - margin;
            if (m.pos[1] < win.bottom - margin) m.pos[1] = win.top + margin;
        }

        // drop empty swarms automatically by the caller (members.length check)
    };

    const drawMember = (m) => {
        sk.push();
        sk.translate(m.pos[0], m.pos[1]);

        // rotate chevron to velocity
        const angDeg = degFromDir(m.vel[0], m.vel[1]);
        sk.rotate(sk.radians(angDeg));

        // scale
        const s = cfg.drawScale * (m.r / 0.55);
        const pts = CHEVRON.map(p => ({ x: p.x * s, y: p.y * s }));

        neonPoly(sk, pts, THEME.bullet || THEME.ship, pixelToWorld, 1.2, true);
        sk.pop();
    };

    const draw = () => {
        for (const m of members) drawMember(m);
    };

    return { members, update, draw };
};
