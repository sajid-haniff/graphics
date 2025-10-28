// /src/demos/arcade/ship.js
import { V } from '../../lib/esm/V';
import { neonPoly } from './neon';
import { createBullet } from './bullet';

export const createShip = (sk, THEME, pixelToWorld, win, bullets, bursts, isGameOver, onDeath, sfx) => {
    // ---------------- State ----------------
    const pos = V.create(0, 0);
    const vel = V.create(0, 0);
    let rotDeg = 0;

    // ---------------- Tuning ----------------
    const ROT_SPEED = 4;        // deg/frame
    const THRUST    = 0.03;     // world units/frame^2
    const DAMPING   = 0.985;    // inertia

    // Bullets
    const BULLET_SPEED = 0.5;
    const BULLET_LIFE  = 60;
    const FIRE_COOLDOWN_MS = 220;
    let lastFireMs = 0;

    // Invulnerability after death
    let invuln = 0;
    const INVULN_TIME = 90;

    // ---------------- Geometry (canonical Y-up; tip points +Y) ----------------
    // Body outline (no flame)
    const SHIP_POINTS_BODY = [
        { x:  0.0,  y:  1.0 },
        { x:  0.5,  y: -0.5 },
        { x:  0.0,  y: -0.2 },
        { x: -0.5,  y: -0.5 }
    ];

    // Thrust flame shape (centered on -Y axis, sits behind ship)
    // Drawn only when thrusting; separate color.
    const THRUST_POINTS = [
        { x:   0.00, y: -0.55 },
        { x:   0.18, y: -0.95 },
        { x:   0.00, y: -1.25 },
        { x:  -0.18, y: -0.95 },
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
        // Small safety so muzzle is clearly outside ship radius
        const SAFE_OFFSET = SHIP_HIT_RADIUS + 0.25 + 0.05; // shipR + bulletR + ε
        const muzzle = V.add(pos, V.scale(dir, SAFE_OFFSET));

        bullets.push(createBullet(sk, muzzle, dir, THEME, pixelToWorld, win, BULLET_SPEED, BULLET_LIFE));
        sfx?.play('fire'); // 🔊 only when actually fired
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
            // Simple fade-out: mute immediately
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

        // Body
        const bodyPts = SHIP_POINTS_BODY.map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE }));
        neonPoly(sk, bodyPts, THEME.ship, pixelToWorld, 1.6, true);

        // Thrust flame (only while thrusting) — bright orange
        if (thrusting) {
            const flamePts = THRUST_POINTS.map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE }));
            const flameColor = THEME.thrust || '#ff9933'; // 🔶 bright orange fallback
            // Slightly thicker to look hot/glowy
            neonPoly(sk, flamePts, flameColor, pixelToWorld, 2.0, true);
        }

        sk.pop();
    };

    const radius = () => SHIP_HIT_RADIUS;
    const invulnerable = () => invuln > 0;
    const position = () => pos;

    return { update, draw, pos: position, radius, invulnerable, explode };
};
