// ============================================================================
// Bullet factory (compatible with ship.js call signature)
// createBullet(sk, muzzleV, dirV, THEME, pixelToWorld, win, speed = 0.5, lifeFrames = 60)
// - position: V vec2
// - velocity: V vec2
// - radius: number (for collisions)
// - update(dt, win): moves, wraps, decrements ttl (supports dt or frame-based)
// - draw(sk): neon dot
// ============================================================================

import { V } from '../../lib/esm/V';
import { neonDot } from './neon';

export const createBullet = (
    sk,
    muzzleV,
    dirV,
    THEME,
    pixelToWorld,
    win,
    speed = 0.6,
    lifeFrames = 60
) => {
    const position = V.clone(muzzleV);
    const velocity = V.scale(V.normalize(dirV), speed);
    const radius = 0.25;        // collision radius (world units)
    let ttl = lifeFrames;       // frames; we’ll also accept dt seconds

    const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));

    const update = (dt = undefined) => {
        // Support both frame-stepped and dt-stepped worlds
        const k = (typeof dt === 'number' && isFinite(dt)) ? (dt * 60.0) : 1.0;

        // pos += vel * k
        V.set(position, position[0] + velocity[0] * k, position[1] + velocity[1] * k);

        // world wrap
        V.set(position, wrap(position[0], win.left, win.right), wrap(position[1], win.bottom, win.top));

        // life
        ttl -= k;
    };

    const draw = (sk) => {
        neonDot(
            sk,
            { x: position[0], y: position[1] },
            THEME?.bullet ?? '#7DF',
            pixelToWorld,
            3 // px nominal
        );
    };

    return {
        position,
        velocity,
        radius,
        ttl,
        update,
        draw,
        get alive() { return ttl > 0; },
    };
};
