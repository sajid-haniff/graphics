import { V } from '../../lib/esm/V';        // kept for symmetry; no heavy use here
import { M2D } from '../../lib/esm/M2D';    // provides makePixelToWorld based on mat2d

// Given a WORLD_TO_DEVICE mat2d, return px -> world units
export const makePixelToWorld = (WORLD_TO_DEVICE) => M2D.makePixelToWorld(WORLD_TO_DEVICE);

// Scalar helpers
export const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));
export const randRange = (lo, hi) => lo + Math.random() * (hi - lo);

// p5 color with alpha from hex (keeps your sk usage centralized)
export const colorA = (sk, hex, alpha) => {
    const c = sk.color(hex);
    return sk.color(sk.red(c), sk.green(c), sk.blue(c), alpha);
};
