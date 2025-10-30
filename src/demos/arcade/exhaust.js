// Neon exhaust trail in world space (factory).
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

        const len  = 0.5 + intensity * 0.9 + (meta.afterburn ? 0.5 : 0) + (meta.brake ? 0.3 : 0);
        const off  = 0.55; // start just behind ship along -dir
        const life = 0.25 + 0.25 * intensity; // seconds

        const a = V.create(pos[0] - dir[0] * off, pos[1] - dir[1] * off);
        const b = V.create(a[0] - dir[0] * len,   a[1] - dir[1] * len);

        puffs.push({
            a, b, t: life,
            w: 2.2 + 1.2 * intensity + (meta.afterburn ? 0.6 : 0), // ~px via pixelToWorld
            color1: meta.afterburn ? (THEME.afterburn || '#ffd166') : (THEME.thrust || '#ff9933'),
            color2: THEME.hud || '#ffffff'
        });
    };

    const update = (dt) => {
        for (let i = puffs.length - 1; i >= 0; i--) {
            const p = puffs[i];
            p.t -= dt;
            if (p.t <= 0) { puffs.splice(i, 1); continue; }
            p.w *= 0.96;
            // gently stretch tail as it fades
            p.b[0] += (p.b[0] - p.a[0]) * 0.02;
            p.b[1] += (p.b[1] - p.a[1]) * 0.02;
        }
    };

    const draw = () => {
        for (const p of puffs) {
            const w1 = Math.max(pixelToWorld(p.w), pixelToWorld(0.6));
            neonLine(sk, { x: p.b[0], y: p.b[1] }, { x: p.a[0], y: p.a[1] }, p.color1, pixelToWorld, w1);
            const w2 = Math.max(pixelToWorld(p.w * 0.5), pixelToWorld(0.5));
            neonLine(sk, { x: p.b[0], y: p.b[1] }, { x: p.a[0], y: p.a[1] }, p.color2, pixelToWorld, w2);
        }
    };

    return { emit, update, draw };
};
