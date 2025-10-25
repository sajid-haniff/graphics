import { colorA } from './utils';

export const neonPoly = (sk, points, colorHex, pixelToWorld, px = 1.6, closed = true) => {
    const weights = [3.5, 2.0, 1.0].map(s => pixelToWorld(px * s/3));
    const alphas  = [0.25, 0.6, 1.0];
    for (let i = 0; i < weights.length; i++) {
        sk.noFill();
        sk.stroke(colorA(sk, colorHex, 255 * alphas[i]));
        sk.strokeWeight(0.01); // xxx fix this hack
        sk.beginShape();
        for (const p of points) sk.vertex(p.x, p.y);
        sk.endShape(closed ? sk.CLOSE : undefined);
    }
};

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

export const neonDot = (sk, rPx, colorHex, pixelToWorld) => {
    const dOuter = pixelToWorld(rPx * 2.8);
    const dMid   = pixelToWorld(rPx * 1.8);
    const dInner = pixelToWorld(rPx * 1.0);
    sk.noStroke();
    sk.fill(colorA(sk, colorHex, 64));  sk.circle(0, 0, .1);
    sk.fill(colorA(sk, colorHex, 160)); sk.circle(0, 0, .1);
    sk.fill(colorA(sk, colorHex, 255)); sk.circle(0, 0, .1);


};
