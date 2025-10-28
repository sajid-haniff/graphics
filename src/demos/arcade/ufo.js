// UFO: classic saucer with jittery path + targeted fire
// - big vs small variants (speed / fire rate / bullet speed)
// - sfx: 'lsaucer' / 'ssaucer', 'sfire'
// - shape is canonical Y-up; draw with neonPoly

import { V } from '../../lib/esm/V';
import { randRange } from './utils';
import { neonPoly } from './neon';

export const createUFO = (sk, THEME, pixelToWorld, win, getShip, sfx) => {
    // Variant
    const SMALL = Math.random() < 0.45; // smaller is faster & deadlier
    const RADIUS = SMALL ? 1.2 : 1.8;

    // Start side + initial heading
    const fromLeft = Math.random() < 0.5;
    const x0 = fromLeft ? win.left - RADIUS * 1.5 : win.right + RADIUS * 1.5;
    const y0 = randRange(win.bottom + 3, win.top - 3);

    // State
    const pos = V.create(x0, y0);
    const baseV = SMALL ? 0.18 : 0.12;         // horizontal speed (wu/frame)
    const v = V.create(fromLeft ? baseV : -baseV, 0);
    let t = 0;                                 // for vertical wiggle
    const wiggleAmp = SMALL ? 1.2 : 0.8;
    const wiggleFreq = SMALL ? 0.035 : 0.025;

    // Fire cadence
    let cooldown = 0;
    const FIRE_COOLDOWN = SMALL ? 36 : 58;     // frames
    const BULLET_SPEED  = SMALL ? 0.72 : 0.55; // wu/frame

    // Outline (tiny saucer, Y-up)
    const verts = [
        { x:  1.0, y:  0.1 }, { x:  0.5, y:  0.4 }, { x: -0.5, y:  0.4 }, { x: -1.0, y:  0.1 },
        { x: -1.3, y: -0.1 }, { x: -0.8, y: -0.35 },{ x:  0.8, y: -0.35 },{ x:  1.3, y: -0.1 }
    ].map(p => ({ x: p.x * RADIUS, y: p.y * RADIUS }));

    // SFX loop
    const loopInst = sfx?.loop(SMALL ? 'ssaucer' : 'lsaucer', { volume: 0.3 });

    const update = () => {
        // Horizontal drift
        V.set(pos, pos[0] + v[0], pos[1] + v[1]);

        // Vertical wiggle
        t += wiggleFreq;
        pos[1] += Math.sin(t) * (wiggleAmp * 0.06);

        // Offscreen cleanup
        if (fromLeft ? pos[0] > win.right + RADIUS * 2 : pos[0] < win.left - RADIUS * 2) {
            stop();
            return false;
        }

        if (cooldown > 0) cooldown--;
        return true;
    };

    // Provide a fire() that returns a bullet spec or null
    // Caller creates & manages bullet instances.
    const tryFire = () => {
        if (cooldown > 0) return null;

        // Aim at ship if we have one; else random spray
        const ship = getShip?.();
        let dir;
        if (ship && ship.pos) {
            const sp = ship.pos();
            const dx = sp[0] - pos[0];
            const dy = sp[1] - pos[1];
            const len = Math.hypot(dx, dy) || 1;
            dir = V.create(dx / len, dy / len);
        } else {
            const a = sk.radians(randRange(0, 360));
            dir = V.create(Math.cos(a), Math.sin(a));
        }

        cooldown = FIRE_COOLDOWN;
        sfx?.play('sfire');
        return {
            origin: V.clone(pos),
            dir,
            speed: BULLET_SPEED,
            life: 120, // frames
        };
    };

    const draw = () => {
        sk.push();
        sk.translate(pos[0], pos[1]);
        neonPoly(sk, verts, THEME.ufo || '#7ef', pixelToWorld, 1.8, true);
        // dome line
        sk.noFill();
        sk.stroke(255);
        sk.strokeWeight(pixelToWorld(0.8));
        sk.line(-0.6 * RADIUS, 0, 0.6 * RADIUS, 0);
        sk.pop();
    };

    const stop = () => { loopInst?.stop?.(); };

    const radius   = () => RADIUS * 0.9;
    const position = pos;

    return { update, draw, tryFire, stop, position, radius, verts };
};
