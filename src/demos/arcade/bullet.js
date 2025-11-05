// /src/demos/arcade/bullet.js
// Neon tracer bullet (factory, no classes). Compatible with existing callers:
// createBullet(sk, originV, dirV, THEME, pixelToWorld, win, speed, life)

import { V } from '../../lib/esm/V';
import { neonLine } from './neon';

// Wrap helpers
const wrapCoord = (v, min, max) => (v > max ? min : (v < min ? max : v));

export const createBullet = (sk, originV, dirV, THEME, pixelToWorld, win, speed = 0.5, lifeFrames = 60) => {
    // immutable-ish state references
    const position = V.clone(originV);
    const dir = V.normalize(V.clone(dirV));
    const velocity = V.scale(V.clone(dir), speed);

    // Collision & lifetime
    const radius = 0.25;      // used by quadtree/circle overlap
    let ttl = lifeFrames;     // frames
    let alive = true;

    // Visual tuning (world units)
    const CORE_DOT = 0.6 * radius; // diameter (wu) for tiny hot core
    const TRAIL_LEN = 1.25;        // tracer length (wu)
    const GLOW_W   = 2.0;          // outer glow stroke (≈px via pixelToWorld)
    const CORE_W   = 1.2;          // inner hot stroke

    // One-frame muzzle flash offset (so it looks like it “kicks off” the gun)
    let firstFrame = true;

    const update = () => {
        if (!alive) return;

        // Move
        position[0] += velocity[0];
        position[1] += velocity[1];

        // Wrap world
        position[0] = wrapCoord(position[0], win.left,  win.right);
        position[1] = wrapCoord(position[1], win.bottom, win.top);

        // Lifetime
        ttl--;
        if (ttl <= 0) alive = false;

        // Only offset the very first rendered frame
        if (firstFrame) firstFrame = false;
    };

    const draw = () => {
        if (!alive) return;

        // Compute back end of tracer (p2 behind the tip along -dir)
        const p1x = position[0];
        const p1y = position[1];

        // On first frame, nudge the start a hair so it looks like a bright muzzle spit
        const leadBoost = firstFrame ? 0.35 : 0.0;
        const len = TRAIL_LEN + leadBoost;

        const p2x = p1x - dir[0] * len;
        const p2y = p1y - dir[1] * len;

        // Glow pass
        neonLine(
            sk,
            { x: p2x, y: p2y },
            { x: p1x, y: p1y },
            THEME.bullet || '#7DF',
            pixelToWorld,
            GLOW_W
        );

        // Hot core pass (thinner, overlays)
        neonLine(
            sk,
            { x: p2x, y: p2y },
            { x: p1x, y: p1y },
            THEME.bulletCore || '#fff',
            pixelToWorld,
            CORE_W
        );

        // Tiny bright tip dot (helps sell speed)
        sk.push();
        sk.noStroke();
        sk.fill(255);
        const d = Math.max(pixelToWorld(CORE_DOT), pixelToWorld(0.8)); // ~px-consistent
        sk.circle(p1x, p1y, d);
        sk.pop();
    };

    return {
        // physics/collision API expected by the rest of your code:
        position,
        velocity,
        radius,
        ttl,
        alive,

        // lifecycle
        update,
        draw,
    };
};
