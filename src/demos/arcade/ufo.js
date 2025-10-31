// UFO modeled after the reference game's Alien (Big/Small).
// API stays the same as before so asteroids-demo.js requires no changes.
//
// Exports: createUFO(sk, THEME, pixelToWorld, win, SFX, getShipPos, { small=false }?)
//
// Notes:
// - Shape matches the repo's alien.ts points (scaled).
// - Big saucer: slower, worse aim. Small saucer: faster, better aim.
// - Horizontal pass across the field; occasional vertical jogs.
// - Fires toward ship at intervals; uses 'sfire' SFX; loops 'lsaucer'/'ssaucer'.
// - Despawns once it leaves horizontal bounds.
//
// Dependencies: V (vec2), randRange/wrap (utils), neonPoly (for vector look).
// All p5 calls via `sk`.

import { V } from '../../lib/esm/V';
import { randRange, wrap } from './utils';
import { neonPoly } from './neon';

export const createUFO = (sk, THEME, pixelToWorld, win, SFX, getShipPos, { small = true } = {}) => {
    // --- Tuning approximated to reference feel (world-units/frame) ---
    const SCALE     = small ? 0.55 : 0.95;      // small saucer is physically smaller
    const H_SPEED   = small ? 0.25 : 0.18;      // horizontal drift speed
    const V_JOG     = small ? 0.20 : 0.14;      // max vertical jog speed
    const JOG_TIME  = 1.0;                      // seconds between jog decisions
    const FIRE_TIME = small ? 0.70 : 0.80;      // seconds between shots
    const AIM_ERR   = small ? 0.06 : 0.20;      // radians of aim error (small aims better)
    const BULLET_WU = small ? 0.58 : 0.48;      // bullet speed in world units
    const RADIUS    = 1.10 * SCALE;             // collision radius

    // Reference UFO silhouette (Y-up), from alien.ts (recentered a bit)
    // Points:   [.5,-2], [1,-1], [2.5,0], [1,1], [-1,1], [-2.5,0], [-1,-1], [-.5,-2]
    const baseVerts = [
        { x:  0.5,  y: -2.0 },
        { x:  1.0,  y: -1.0 },
        { x:  2.5,  y:  0.0 },
        { x:  1.0,  y:  1.0 },
        { x: -1.0,  y:  1.0 },
        { x: -2.5,  y:  0.0 },
        { x: -1.0,  y: -1.0 },
        { x: -0.5,  y: -2.0 },
    ].map(p => ({ x: p.x * SCALE, y: p.y * SCALE }));

    // Spawn from left/right, mid-screen-ish Y
    const fromLeft = Math.random() < 0.5;
    const y0 = randRange(win.bottom + 4, win.top - 4);
    const pos = V.create(fromLeft ? win.left - 3 : win.right + 3, y0);
    const vel = V.create(fromLeft ? H_SPEED : -H_SPEED, 0);

    // Timers
    let jogTimer  = JOG_TIME * 0.5;
    let fireTimer = FIRE_TIME * 0.5;

    // Ambient saucer loop
    const loopInst = SFX?.loop?.(small ? 'ssaucer' : 'lsaucer', { volume: 0.35 });

    // Public-ish props for quadtree
    const position = pos;
    const radius = () => RADIUS;

    // --- Behavior ---
    const update = (dt = 1/60) => {
        // Horizontal drift
        pos[0] += vel[0];

        // Periodic vertical jogs (toggle target vy)
        jogTimer -= dt;
        if (jogTimer <= 0) {
            jogTimer = JOG_TIME;
            const dir = Math.random() < 0.5 ? -1 : 1;
            vel[1] = dir * randRange(0.4 * V_JOG, V_JOG);
        }

        // Apply vertical velocity + wrap vertically
        pos[1] = wrap(pos[1] + vel[1], win.bottom + 1, win.top - 1);

        // Despawn once fully out of horizontal bounds
        if (fromLeft && pos[0] > win.right + 4) return false;
        if (!fromLeft && pos[0] < win.left  - 4) return false;

        // Fire timer
        fireTimer -= dt;
        return true;
    };

    const draw = () => {
        sk.push();
        sk.translate(pos[0], pos[1]);

        // Saucer hull
        neonPoly(sk, baseVerts, THEME.asteroid, pixelToWorld, 1.4, true);

        // Cross details (to match the reference's inner lines)
        sk.noFill();
        sk.stroke(255);
        sk.strokeWeight(pixelToWorld(0.9));
        // diagonals: [1]↔[6], [2]↔[5] in the original code (indexing from 0)
        const p = baseVerts;
        sk.line(p[1].x, p[1].y, p[6].x, p[6].y);
        sk.line(p[2].x, p[2].y, p[5].x, p[5].y);

        sk.pop();
    };

    // Called from game loop with an emit callback: (originV, dirV, speedWU, lifeFrames)
    const tryFire = (emitBullet) => {
        if (fireTimer > 0) return;
        fireTimer = FIRE_TIME + randRange(-0.15, 0.15);

        // Aim at ship (with error); fallback to random if no ship
        let dir;
        const ship = getShipPos?.();
        if (ship) {
            const dx = ship[0] - pos[0];
            const dy = ship[1] - pos[1];
            const a  = Math.atan2(dy, dx);
            const err = randRange(-AIM_ERR, AIM_ERR);
            dir = [Math.cos(a + err), Math.sin(a + err)];
        } else {
            const a = sk.radians(randRange(0, 360));
            dir = [Math.cos(a), Math.sin(a)];
        }

        SFX?.play?.('sfire', { volume: 0.5 });
        emitBullet(V.create(pos[0], pos[1]), V.create(dir[0], dir[1]), BULLET_WU, 120);
    };

    const destroy = () => {
        loopInst?.stop?.();
    };

    return { position, radius, update, draw, tryFire, destroy, small };
};
