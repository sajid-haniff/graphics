// V.js
import * as vec2 from './vec2';

export const V = {
    create: (x = 0, y = 0) => vec2.fromValues(x, y),
    clone: (v) => vec2.clone(v),
    copy: (out, v) => vec2.copy(out, v),
    set: (v, x, y) => vec2.set(v, x, y),

    // Basic Math Operations
    add: (a, b) => vec2.add(vec2.create(), a, b),
    sub: (a, b) => vec2.sub(vec2.create(), a, b),
    scale: (v, s) => vec2.scale(vec2.create(), v, s),
    multiply: (a, b) => vec2.multiply(vec2.create(), a, b),
    divide: (a, b) => vec2.divide(vec2.create(), a, b),
    negate: (v) => vec2.negate(vec2.create(), v),
    inverse: (v) => vec2.inverse(vec2.create(), v),
    floor: (v) => vec2.floor(vec2.create(), v),
    ceil: (v) => vec2.ceil(vec2.create(), v),
    round: (v) => vec2.round(vec2.create(), v),
    min: (a, b) => vec2.min(vec2.create(), a, b),
    max: (a, b) => vec2.max(vec2.create(), a, b),
    //clamp: (v, minVal, maxVal) => vec2.clamp(vec2.create(), v, minVal, maxVal),
    lerp: (a, b, t) => vec2.lerp(vec2.create(), a, b, t),

    // Vector Properties
    length: (v) => vec2.length(v),
    lengthSq: (v) => vec2.squaredLength(v),
    distance: (a, b) => vec2.distance(a, b),
    distanceSq: (a, b) => vec2.squaredDistance(a, b),
    magnitude: (v) => vec2.length(v),
    magnitudeSq: (v) => v[0] ** 2 + v[1] ** 2,
    normalize: (v) => vec2.normalize(vec2.create(), v),
    zero: () => vec2.create(),
    isZero: (v) => V.lengthSq(v) === 0,
    limit: (v, max) => V.length(v) > max ? V.scale(V.normalize(v), max) : v,

    // Angles
    heading: (v) => Math.atan2(v[1], v[0]),
    angleBetween: (a, b) => Math.acos(V.dot(V.normalize(a), V.normalize(b))),
    rotate: (v, angle) => {
        const c = Math.cos(angle), s = Math.sin(angle);
        return V.create(v[0] * c - v[1] * s, v[0] * s + v[1] * c);
    },

    // Vector Operations
    dot: (a, b) => vec2.dot(a, b),
    cross: (a, b) => vec2.cross(vec2.create(), a, b),
    //reflect: (v, normal) => vec2.reflect(vec2.create(), v, normal),
    reflect: (v, normal) => {
        const dotProduct = V.dot(v, normal);
        const scaledNormal = V.scale(normal, 2 * dotProduct);
        return V.sub(v, scaledNormal);
    },
    //project: (v, normal) => vec2.project(vec2.create(), v, normal),
    project: (v, normal) => {
        const dotProduct = V.dot(v, normal);
        const normalLengthSq = V.dot(normal, normal);

        if (normalLengthSq === 0) return V.zero();  // Avoid division by zero

        const scale = dotProduct / normalLengthSq;
        return V.scale(normal, scale);
    },
    perp: (v) => V.create(-v[1], v[0]),  // Returns a perpendicular vector

    // Random Vector Generation
    random: (scale = 1) => {
        const v = vec2.create();
        vec2.random(v, scale);
        return v;
    },

    // Comparisons
    equals: (a, b) => vec2.equals(a, b),
    exactEquals: (a, b) => vec2.exactEquals(a, b)
};
