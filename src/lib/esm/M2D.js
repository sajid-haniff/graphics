// src/lib/esm/M2D.js
// A pythonic-style wrapper for glMatrix mat2d, matching the style of V.js.
// Matrix layout: [a, b, c, d, e, f]  representing:
// x' = a*x + c*y + e
// y' = b*x + d*y + f
// This maps directly to p5.applyMatrix(a,b,c,d,e,f)

import * as mat2d from './mat2d';
import { V } from './V';

export const M2D = {
    // Creation
    create: () => mat2d.create(),                                // identity
    identity: () => mat2d.identity(mat2d.create()),
    fromValues: (a, b, c, d, e, f) => mat2d.fromValues(a, b, c, d, e, f),
    clone: (m) => mat2d.clone(m),
    copy: (out, m) => mat2d.copy(out, m),
    set: (m, a, b, c, d, e, f) => {
        const out = mat2d.clone(m);
        out[0] = a; out[1] = b; out[2] = c; out[3] = d; out[4] = e; out[5] = f;
        return out;
    },

    // Basic Operations (return new matrices)
    multiply: (A, B) => {
        const out = mat2d.create();
        // out = A * B
        mat2d.multiply(out, A, B);
        return out;
    },
    invert: (m) => {
        const out = mat2d.create();
        if (!mat2d.invert(out, m)) return null; // non-invertible
        return out;
    },
    determinant: (m) => mat2d.determinant(m),

    // Transforms (pre-multiply: result applies original then this op)
    translate: (m, tx, ty) => {
        const out = mat2d.clone(m);
        mat2d.translate(out, out, [tx, ty]);
        return out;
    },
    rotate: (m, angleRad) => {
        const out = mat2d.clone(m);
        mat2d.rotate(out, out, angleRad);
        return out;
    },
    scale: (m, sx, sy) => {
        const out = mat2d.clone(m);
        mat2d.scale(out, out, [sx, sy]);
        return out;
    },

    // Constructors
    fromTranslation: (tx, ty) => {
        const out = mat2d.create();
        mat2d.fromTranslation(out, [tx, ty]);
        return out;
    },
    fromRotation: (angleRad) => {
        const out = mat2d.create();
        mat2d.fromRotation(out, angleRad);
        return out;
    },
    fromScaling: (sx, sy) => {
        const out = mat2d.create();
        mat2d.fromScaling(out, [sx, sy]);
        return out;
    },

    // Compose / Decompose (2D affine)
    // compose: T * R * S (note: no shear param; you can multiply a shear yourself if needed)
    compose: (tx, ty, angleRad, sx, sy) => {
        const T = M2D.fromTranslation(tx, ty);
        const R = M2D.fromRotation(angleRad);
        const S = M2D.fromScaling(sx, sy);
        return M2D.multiply(M2D.multiply(T, R), S);
    },

    // decompose into translation, rotation, scale, and shear
    // Returns: { translation: vec2, rotation: rad, scale: vec2, shear: number }
    // Based on column decomposition:
    // col0 = (a, b), col1 = (c, d)
    // sx = ||col0||
    // shear = (col0 · col1) / sx^2
    // col1' = col1 - shear*col0
    // sy = ||col1'||
    // rot = atan2(b, a)
    decompose: (m) => {
        const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5];

        const sx = Math.hypot(a, b) || 0;
        let shear = 0;
        let c1x = c, c1y = d;

        if (sx !== 0) {
            shear = (a * c + b * d) / (sx * sx);
            // remove shear from second column
            c1x = c - shear * a;
            c1y = d - shear * b;
        }

        const sy = Math.hypot(c1x, c1y) || 0;
        const rot = Math.atan2(b, a);
        const translation = V.create(e, f);
        const scale = V.create(sx, sy);

        return { translation, rotation: rot, scale, shear };
    },

    // Apply to points/vectors
    // transformPoint applies full affine (includes translation)
    transformPoint: (m, v) => {
        const x = v[0], y = v[1];
        return V.create(
            m[0] * x + m[2] * y + m[4],
            m[1] * x + m[3] * y + m[5]
        );
        // equivalent to p5.applyMatrix(a,b,c,d,e,f) usage
    },

    // transformDir applies only linear part (ignores translation)
    transformDir: (m, v) => {
        const x = v[0], y = v[1];
        return V.create(
            m[0] * x + m[2] * y,
            m[1] * x + m[3] * y
        );
    },

    // Extractors / Helpers
    translation: (m) => V.create(m[4], m[5]),
    rotation: (m) => Math.atan2(m[1], m[0]), // CCW radians
    scaleXY: (m) => {
        const sx = Math.hypot(m[0], m[1]);
        const sy = Math.hypot(m[2], m[3]);
        return V.create(sx, sy);
    },
    shear: (m) => {
        const sx = Math.hypot(m[0], m[1]) || 1;
        return (m[0] * m[2] + m[1] * m[3]) / (sx * sx);
    },

    // For p5.js applyMatrix convenience
    toArgs: (m) => [m[0], m[1], m[2], m[3], m[4], m[5]],

    // Pixel/world scale helpers (useful for consistent stroke sizes)
    // Given WORLD_TO_DEVICE matrix, returns a function px -> world units
    makePixelToWorld: (WORLD_TO_DEVICE) => {
        const sx = Math.hypot(WORLD_TO_DEVICE[0], WORLD_TO_DEVICE[1]);
        const sy = Math.hypot(WORLD_TO_DEVICE[2], WORLD_TO_DEVICE[3]);
        const avg = (sx + sy) * 0.5;
        return (px) => px / avg;
    },

    // Comparisons
    equals: (a, b, eps = 1e-8) => (
        Math.abs(a[0] - b[0]) <= eps &&
        Math.abs(a[1] - b[1]) <= eps &&
        Math.abs(a[2] - b[2]) <= eps &&
        Math.abs(a[3] - b[3]) <= eps &&
        Math.abs(a[4] - b[4]) <= eps &&
        Math.abs(a[5] - b[5]) <= eps
    ),

    // Pretty print
    toString: (m, precision = 4) => {
        const f = (x) => Number(x).toFixed(precision);
        return `mat2d([${f(m[0])}, ${f(m[1])}, ${f(m[2])}, ${f(m[3])}, ${f(m[4])}, ${f(m[5])}])`;
    }
};

export default M2D;
