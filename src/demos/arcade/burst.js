// /src/demo/arcade/burst.js
// Impact burst effect (V + neon).
// - World is Y-up; screen flip handled by your composite matrix in the demo.
// - Draws a ring of radial neon lines that expand over time.

import { V } from '../../lib/esm/V';
import { neonLine } from './neon';

/**
 * createBurst
 * @param {object} sk            p5 instance
 * @param {vec2}   posV          V vec2 (Float32Array[2]) world position
 * @param {string} colorHex      neon color (e.g., THEME.burst)
 * @param {fn}     pixelToWorld  (px:number)=>worldUnits:number (for line weights)
 * @param {number} rays          number of radial segments
 * @param {number} speed         outward speed (world units per frame)
 * @param {number} life          lifetime in frames
 */
export const createBurst = (
    sk,
    posV,
    colorHex,
    pixelToWorld,
    rays = 24,
    speed = 0.6,
    life = 24
) => {
    const pos = V.clone(posV);
    let t = 0;

    const update = () => { t += 1; };

    const draw = () => {
        const r1 = t * speed;
        const r2 = r1 + 0.6; // small thickness band
        // draw radial spikes around pos
        sk.push();
        sk.translate(pos[0], pos[1]);
        for (let i = 0; i < rays; i++) {
            const a = (i / rays) * sk.TWO_PI;
            // Y-up ring construction (consistent with asteroid/ship geometry)
            const x1 = -Math.sin(a) * r1, y1 = -Math.cos(a) * r1;
            const x2 = -Math.sin(a) * r2, y2 = -Math.cos(a) * r2;
            neonLine(sk, x1, y1, x2, y2, colorHex, pixelToWorld, 1.3);
        }
        sk.pop();
    };

    const dead = () => t > life;

    return { update, draw, dead };
};
