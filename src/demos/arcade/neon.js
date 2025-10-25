// /src/demo/arcade/asteroids-neon.js
// Neon-style drawing helpers (pixel-consistent strokes).
// - Depend only on p5 (sk) and a pixelToWorld(px) function.
// - No V/M2D usage here; rendering only.

import { colorA } from './utils';

// Draw a polygon with a soft outer glow + crisp core
export const neonPoly = (sk, points, colorHex, pixelToWorld, px = 1.6, closed = true) => {
    const weights = [3.5, 2.0, 1.0].map(s => pixelToWorld(px * s));
    const alphas  = [0.25, 0.6, 1.0];
    for (let i = 0; i < weights.length; i++) {
        sk.noFill();
        sk.stroke(colorA(sk, colorHex, 255 * alphas[i]));
        sk.strokeWeight(weights[i]);
        sk.beginShape();
        for (const p of points) sk.vertex(p.x, p.y);
        sk.endShape(closed ? sk.CLOSE : undefined);
    }
};

// Draw a glowing line (rounded caps)
export const neonLine = (sk, ax, ay, bx, by, colorHex, pixelToWorld, px = 1.6) => {
    const weights = [3.5, 2.0, 1.0].map(s => pixelToWorld(px * s));
    const alphas  = [0.25, 0.6, 1.0];
    sk.strokeCap(sk.ROUND);
    for (let i = 0; i < weights.length; i++) {
        sk.stroke(colorA(sk, colorHex, 255 * alphas[i]));
        sk.strokeWeight(weights[i]);
        sk.line(ax, ay, bx, by);
    }
};

// Draw a glowing dot (three concentric discs)
export const neonDot = (sk, rPx, colorHex, pixelToWorld) => {
    const dOuter = pixelToWorld(rPx * 2.8);
    const dMid   = pixelToWorld(rPx * 1.8);
    const dInner = pixelToWorld(rPx * 1.0);
    sk.noStroke();
    sk.fill(colorA(sk, colorHex, 64));  sk.circle(0, 0, dOuter);
    sk.fill(colorA(sk, colorHex, 160)); sk.circle(0, 0, dMid);
    sk.fill(colorA(sk, colorHex, 255)); sk.circle(0, 0, dInner);
};
