// src/library/transform-helpers.js
import { M2D } from './M2D';

// mat2d layout: [a, b, c, d, e, f]
const applyToPoint = (m, x, y) => ({
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
});

// Build helpers from the same COMPOSITE you apply with sk.applyMatrix(...)
export const createTransformHelpers = (COMPOSITE) => {
    // Inverse maps device → world
    const INV = M2D.invert(COMPOSITE);

    const worldToDevice = (wx, wy) => applyToPoint(COMPOSITE, wx, wy);
    const deviceToWorld = (dx, dy) => applyToPoint(INV, dx, dy);

    return { worldToDevice, deviceToWorld, INV };
};
