// /src/demo/arcade/ship.js
import { V } from '../../lib/esm/V';
import { neonPoly } from './neon';
import { createBullet } from './bullet';

export const createShip = (sk, THEME, pixelToWorld, win, bullets, bursts, isGameOver, onDeath, sfx) => {
    // State
    const pos = V.create(0, 0);
    const vel = V.create(0, 0);
    let rotDeg = 0;

    // Tuning
    const ROT_SPEED = 3;        // deg/frame
    const THRUST    = 0.02;     // world units/frame^2
    const DAMPING   = 0.985;    // inertia

    // Bullets
    const BULLET_SPEED = 0.5;
    const BULLET_LIFE  = 60;
    const FIRE_COOLDOWN_MS = 220;
    let lastFireMs = 0;

    // Invulnerability after death
    let invuln = 0;
    const INVULN_TIME = 90;

    // Geometry (canonical Y-up)
    const SHIP_POINTS_IDLE = [
        { x:  0.0,  y:  1.0 },
        { x:  0.5,  y: -0.5 },
        { x:  0.0,  y: -0.2 },
        { x: -0.5,  y: -0.5 }
    ];
    const SHIP_POINTS_THRUST = [
        { x:  0.0,  y:  1.0 },
        { x:  0.5,  y: -0.5 },
        { x:  0.0,  y: -0.2 },
        { x: -0.5,  y: -0.5 },
        { x:  0.0,  y: -0.8 },
        { x:  0.15, y: -0.5 },
        { x:  0.0,  y: -0.2 },
        { x: -0.15, y: -0.5 },
    ];
    const SHIP_SCALE = 1.0;
    const SHIP_HIT_RADIUS = 0.7 * SHIP_SCALE;

    const wrapCoord = (v, min, max) => (v > max ? min : (v < min ? max : v));

    // Y-up forward (note the minus due to final Y-flip in the composite)
    const forwardVec = () => {
        const a = -sk.radians(rotDeg);
        return V.create(Math.sin(a), Math.cos(a));
    };

    // ---- SFX state ----
    let thrustInst = null;
    const THRUST_VOL = 0.35;

    const fire = () => {
        const now = sk.millis();
        if (now - lastFireMs < FIRE_COOLDOWN_MS) return;

        const dir = forwardVec();
        const muzzle = V.add(pos, V.scale(dir, 0.9 * SHIP_SCALE));
        bullets.push(createBullet(sk, muzzle, dir, THEME, pixelToWorld, win, BULLET_SPEED, BULLET_LIFE));

        sfx?.play('fire');     // 🔊 play ONLY when we actually fired
        lastFireMs = now;
    };

    const explode = () => {
        onDeath && onDeath();
        sfx?.playRandom(['explode1','explode2','explode3'], { volume: 0.8 }); // 🔊 boom

        V.set(pos, 0, 0);
        V.set(vel, 0, 0);
        rotDeg = 0;
        invuln = INVULN_TIME;
    };

    const update = () => {
        if (isGameOver && isGameOver()) return false;

        // Rotation
        if (sk.keyIsDown(sk.LEFT_ARROW))  rotDeg = (rotDeg + ROT_SPEED) % 360;
        if (sk.keyIsDown(sk.RIGHT_ARROW)) rotDeg = (rotDeg - ROT_SPEED + 360) % 360;

        // Thrust + thrust loop SFX
        const thrusting = sk.keyIsDown(sk.UP_ARROW);
        if (thrusting) {
            const dir = forwardVec();
            V.set(vel, vel[0] + dir[0] * THRUST, vel[1] + dir[1] * THRUST);

            if (!thrustInst) thrustInst = sfx?.loop('thrust', { volume: 0.0 });
            thrustInst?.setVolume(THRUST_VOL);
        } else if (thrustInst) {
            // simple fade-out: set to 0; (optional: stop after a short timer)
            thrustInst.setVolume(0.0);
        }

        // Fire
        if (sk.keyIsDown(32)) fire();

        // Integrate + damping
        V.set(pos, pos[0] + vel[0], pos[1] + vel[1]);
        V.copy(vel, V.scale(vel, DAMPING));

        // Wrap world
        pos[0] = wrapCoord(pos[0], win.left,  win.right);
        pos[1] = wrapCoord(pos[1], win.bottom, win.top);

        if (invuln > 0) invuln--;

        return thrusting;
    };

    const draw = (thrusting) => {
        sk.push();
        sk.translate(pos[0], pos[1]);
        sk.rotate(sk.radians(rotDeg));
        const pts = (thrusting ? SHIP_POINTS_THRUST : SHIP_POINTS_IDLE)
            .map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE }));
        neonPoly(sk, pts, THEME.ship, pixelToWorld, 1.6, true);
        sk.pop();
    };

    const radius = () => SHIP_HIT_RADIUS;
    const invulnerable = () => invuln > 0;
    const position = () => pos;

    return { update, draw, pos: position, radius, invulnerable, explode };
};
