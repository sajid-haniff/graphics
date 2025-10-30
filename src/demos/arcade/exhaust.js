// Neon exhaust trail particle system (world-space).
// Factory style; draw in world pass, no transforms inside.
// API:
//   const exhaust = createExhaust(sk, THEME, pixelToWorld)
//   exhaust.emit(posV, dirV, intensity0to1, { afterburn, brake, speed })
//   exhaust.update(dtSec)
//   exhaust.draw()

import { V } from '../../lib/esm/V';
import { neonLine } from './neon';

export const createExhaust = (sk, THEME, pixelToWorld) => {
    const puffs = [];

    const emit = (pos, dir, intensity = 0.5, meta = {}) => {
        if (intensity <= 0) return;

        // spawn a short streak slightly behind ship along -dir
        const len  = 0.5 + intensity * 0.9 + (meta.afterburn ? 0.5 : 0) + (meta.brake ? 0.3 : 0);
        const off  = 0.55; // start just behind the hull
        const life = 0.25 + 0.25 * intensity; // seconds

        const back = V.create(pos[0] - dir[0] * off, pos[1] - dir[1] * off);
        const tip  = V.create(back[0] - dir[0] * len, back[1] - dir[1] * len);

        puffs.push({
            a: back, b: tip,
            t: life,
            w: 2.2 + 1.2 * intensity + (meta.afterburn ? 0.6 : 0), // stroke width in ~px via pixelToWorld
            color1: meta.afterburn ? (THEME.afterburn || '#ffd166') : (THEME.thrust || '#ff9933'),
            color2: THEME.hud || '#ffffff' // inner hot
        });
    };

    const update = (dt) => {
        for (let i = puffs.length - 1; i >= 0; i--) {
            const p = puffs[i];
            p.t -= dt;
            if (p.t <= 0) { puffs.splice(i, 1); continue; }
            // fade + shrink a touch
            p.w *= 0.96;
            // very slight trail lengthen while fading
            p.b[0] += (p.b[0] - p.a[0]) * 0.02;
            p.b[1] += (p.b[1] - p.a[1]) * 0.02;
        }
    };

    const draw = () => {
        for (const p of puffs) {
            const w = Math.max(pixelToWorld(p.w), pixelToWorld(0.6));
            neonLine(sk, { x: p.b[0], y: p.b[1] }, { x: p.a[0], y: p.a[1] }, p.color1, pixelToWorld, w);
            neonLine(sk, { x: p.b[0], y: p.b[1] }, { x: p.a[0], y: p.a[1] }, p.color2, pixelToWorld, Math.max(pixelToWorld(p.w * 0.5), pixelToWorld(0.5)));
        }
    };

    return { emit, update, draw };
};
