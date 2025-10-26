// Expanding world-space ring at position p (V vec2).
// Visual only (can be used to tag rocks separately if you want gameplay impact).
import { V } from '../../lib/esm/V';

export const createShockwave = (sk, p, THEME, pixelToWorld, {
    maxRadius = 4.0,   // world units
    thicknessPx = 2,   // visual stroke in *pixels* (converted via pixelToWorld)
    lifeFrames = 30
} = {}) => {
    const pos = V.clone(p);
    let t = 0;

    const update = () => { t += 1; };
    const draw = () => {
        const k = t / lifeFrames;
        if (k >= 1) return;
        const r = maxRadius * k;
        sk.push();
        sk.translate(pos[0], pos[1]);
        sk.noFill();
        sk.stroke(THEME.burst);
        sk.strokeWeight(pixelToWorld(thicknessPx));
        sk.circle(0, 0, r * 2);
        sk.pop();
    };
    const dead = () => t >= lifeFrames;

    return { update, draw, dead, pos };
};
