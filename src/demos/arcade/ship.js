import { createBullet } from './bullet';
import { neonPoly } from './neon';

export const createShip = (sk, THEME, pixelToWorld, win, bullets, bursts, isGameOver, onDeath) => {
    const pos = sk.createVector(0, 0);
    const vel = sk.createVector(0, 0);
    let rotDeg = 0;

    const ROT_SPEED = 3;
    const THRUST    = 0.02;
    const DAMPING   = 0.985;

    const BULLET_SPEED = 0.5;
    const BULLET_LIFE  = 60;
    const FIRE_COOLDOWN_MS = 220;
    let lastFireMs = 0;

    let invuln = 0;
    const INVULN_TIME = 90;

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

    const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));

    // 🔑 Forward vector uses -rotDeg because world->device composite flips Y.
    const forwardVec = () => {
        const a = sk.radians(-rotDeg);
        return sk.createVector(sk.sin(a), sk.cos(a));
    };

    const fire = () => {
        const now = sk.millis();
        if (now - lastFireMs < FIRE_COOLDOWN_MS) return;

        const dir = forwardVec();
        const start = sk.createVector(pos.x + dir.x * (0.9 * SHIP_SCALE), pos.y + dir.y * (0.9 * SHIP_SCALE));
        bullets.push(createBullet(sk, start, dir, THEME, pixelToWorld, win, BULLET_SPEED, BULLET_LIFE));
        lastFireMs = now;
    };

    const explode = () => {
        onDeath();                       // adjust lives / gameover upstream
        pos.set(0, 0);
        vel.set(0, 0);
        rotDeg = 0;
        invuln = INVULN_TIME;
    };

    const update = () => {
        if (isGameOver()) return false;

        if (sk.keyIsDown(sk.LEFT_ARROW))  rotDeg = (rotDeg + ROT_SPEED) % 360;
        if (sk.keyIsDown(sk.RIGHT_ARROW)) rotDeg = (rotDeg - ROT_SPEED + 360) % 360;
        const thrusting = sk.keyIsDown(sk.UP_ARROW);

        if (thrusting) {
            const dir = forwardVec();
            vel.x += dir.x * THRUST;
            vel.y += dir.y * THRUST;
        }

        pos.add(vel);
        vel.mult(DAMPING);
        pos.x = wrap(pos.x, win.left, win.right);
        pos.y = wrap(pos.y, win.bottom, win.top);

        if (sk.keyIsDown(32)) fire(); // space

        // Ship↔asteroid collision is handled in demo (after we move bullets/asteroids)
        // But we keep invuln and expose radius & position if needed.
        if (invuln > 0) invuln--;

        // Inject a function to allow demo to query collision
        update.pos = pos;
        update.radius = SHIP_HIT_RADIUS;

        return thrusting;
    };

    const draw = (thrusting) => {
        sk.push();
        sk.translate(pos.x, pos.y);
        sk.rotate(sk.radians(rotDeg));
        const pts = (thrusting ? SHIP_POINTS_THRUST : SHIP_POINTS_IDLE).map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE }));
        const colorHex = THEME.ship;
        if (invuln > 0 && (Math.floor(invuln / 6) % 2 === 0)) {
            neonPoly(sk, pts, colorHex, pixelToWorld, 1.6, true);
        } else {
            neonPoly(sk, pts, colorHex, pixelToWorld, 1.6, true);
        }
        sk.pop();
    };

    // Expose minimal info for collisions from demo:
    update.getPos = () => update.pos;
    update.getRadius = () => update.radius;

    return { update, draw };
};
