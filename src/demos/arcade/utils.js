// ============================================================================
// Scalar + render helpers used across the arcade demo
// ============================================================================

import { M2D } from '../../lib/esm/M2D';

// World wrap for a scalar (Y-up world)
export const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));

// Random in [lo, hi)
export const randRange = (lo, hi) => lo + Math.random() * (hi - lo);

// p5 color with alpha (handles hex or p5.Color)
export const colorA = (sk, hexOrColor, alpha) => {
    const c = (typeof hexOrColor === 'string' || Array.isArray(hexOrColor))
        ? sk.color(hexOrColor)
        : hexOrColor;
    return sk.color(sk.red(c), sk.green(c), sk.blue(c), alpha);
};

// Given WORLD→DEVICE composite mat2d, return px→world helper
export const makePixelToWorld = (WORLD_TO_DEVICE) => M2D.makePixelToWorld(WORLD_TO_DEVICE);

// Circle → AABB (for quadtree insertion)
export const aabbFromCircle = (cx, cy, r) => ({ x: cx - r, y: cy - r, w: 2*r, h: 2*r });

// Circle–circle precise test (narrow phase)
export const circleOverlaps = (c1, c2) => {
    const dx = c1.cx - c2.cx;
    const dy = c1.cy - c2.cy;
    const rr = c1.r + c2.r;
    return (dx*dx + dy*dy) <= rr*rr;
};

// Generous world bounds around play window (Y-up)
export const makeWorldBounds = (win, pad = 200) => ({
    x: win.left  - pad,
    y: win.bottom - pad,
    w: (win.right - win.left) + 2*pad,
    h: (win.top   - win.bottom) + 2*pad,
});
