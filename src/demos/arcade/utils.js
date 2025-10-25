export const mul2D = (A, B) => {
    const [a1,b1,c1,d1,e1,f1] = A;
    const [a2,b2,c2,d2,e2,f2] = B;
    return [
        a1*a2 + c1*b2,
        b1*a2 + d1*b2,
        a1*c2 + c1*d2,
        b1*c2 + d1*d2,
        a1*e2 + c1*f2 + e1,
        b1*e2 + d1*f2 + f1
    ];
};

export const buildWorldToDevice = (M) => M;

export const makePixelToWorld = (WORLD_TO_DEVICE) => {
    // returns function px->world, derived from composite
    const sx = Math.hypot(WORLD_TO_DEVICE[0], WORLD_TO_DEVICE[1]);
    const sy = Math.hypot(WORLD_TO_DEVICE[2], WORLD_TO_DEVICE[3]);
    const s  = (sx + sy) * 0.5;
    return (px) => px / s;
};

export const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));
export const randRange = (lo, hi) => lo + Math.random() * (hi - lo);

export const rotateVec = (sk, vx, vy, deg) => {
    const a = sk.radians(deg);
    return { x: vx * Math.cos(a) - vy * Math.sin(a), y: vx * Math.sin(a) + vy * Math.cos(a) };
};

export const colorA = (sk, hex, alpha) => {
    const c = sk.color(hex);
    return sk.color(sk.red(c), sk.green(c), sk.blue(c), alpha);
};
