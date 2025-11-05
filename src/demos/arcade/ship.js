// /src/demos/arcade/ship.js
import { V } from '../../lib/esm/V';
import { neonPoly } from './neon';
import { createBullet } from './bullet';
import { createExhaust } from './exhaust';

export const createShip = (
    sk, THEME, pixelToWorld, win,
    bullets, bursts, isGameOver, onDeath, sfx,
    exhaust = null // explicit optional param: pass shared exhaust or we create one
) => {
    // ---------------- State ----------------
    const pos = V.create(0, 0);
    const vel = V.create(0, 0);
    let rotDeg = 0;
    let rotVel = 0;          // deg/frame (angular velocity)
    let invuln = 0;

    // If no exhaust provided, make one; expose via returned object.
    const ex = (exhaust && exhaust.emit) ? exhaust : createExhaust(sk, THEME, pixelToWorld);

    // ---------------- Feel ----------------
    const ANG_TORQUE  = 0.55;     // deg/frame^2
    const ANG_DAMPING = 0.92;     // angular friction
    const ANG_MAX     = 6.5;

    const BASE_THRUST   = 0.018;
    const THR_RISE      = 0.08;
    const THR_FALL      = 0.15;
    const DAMPING       = 0.988;
    const AIR_DRAG_K    = 0.0008;
    const SOFT_CAP      = 0.85;

    // Afterburner
    const AB_MULT       = 1.65;
    const AB_UP         = 0.016;
    const AB_DOWN       = 0.010;
    const AB_MAX        = 1.0;
    let heat            = 0;
    let abLocked        = false;

    // Boost (double tap Up)
    const BOOST_IMPULSE   = 0.48;
    const BOOST_WINDOW_MS = 240;
    let lastUpTap = -9999;
    let boostingFrames = 0;
    const BOOST_VFX_FRAMES = 10;

    // Brake
    const BRAKE_FACTOR  = 0.90;
    const BRAKE_PUSH    = 0.02;

    // Bullets
    const BULLET_SPEED     = 0.5;
    const BULLET_LIFE      = 60;
    const FIRE_COOLDOWN_MS = 220;
    let lastFireMs = 0;

    // Invuln
    const INVULN_TIME = 90;

    // Geometry (Y-up)
    const SHIP_POINTS_BODY = [
        { x:  0.0,  y:  1.0 },
        { x:  0.5,  y: -0.5 },
        { x:  0.0,  y: -0.2 },
        { x: -0.5,  y: -0.5 }
    ];

    const THRUST_POINTS_BASE = [
        { x:   0.00, y: -0.55 },
        { x:   0.16, y: -0.95 },
        { x:   0.00, y: -1.10 },
        { x:  -0.16, y: -0.95 },
    ];

    const SHIP_SCALE = 1.0;
    const SHIP_HIT_RADIUS = 0.7 * SHIP_SCALE;

    const wrapCoord = (v, min, max) => (v > max ? min : (v < min ? max : v));

    // Forward (Y-up, composite does final Y-flip)
    const forwardVec = () => {
        const a = -sk.radians(rotDeg);
        return V.create(Math.sin(a), Math.cos(a));
    };

    // SFX
    let thrustInst = null;
    const THRUST_VOL = 0.35;

    // Throttle state
    let throttle = 0; // 0..1
    let prevThrustHeld = false;

    const keyDown = (code) => sk.keyIsDown ? sk.keyIsDown(code) : false;

    const fire = () => {
        const now = sk.millis();
        if (now - lastFireMs < FIRE_COOLDOWN_MS) return;

        const dir = forwardVec();
        const SAFE_OFFSET = SHIP_HIT_RADIUS + 0.25 + 0.05;
        const muzzle = V.add(pos, V.scale(dir, SAFE_OFFSET));

        bullets.push(createBullet(sk, muzzle, dir, THEME, pixelToWorld, win, BULLET_SPEED, BULLET_LIFE));
        sfx?.play('fire');
        lastFireMs = now;
    };

    const explode = () => {
        onDeath && onDeath();
        sfx?.playRandom(['explode1','explode2','explode3'], { volume: 0.8 });
        V.set(pos, 0, 0);
        V.set(vel, 0, 0);
        rotDeg = 0; rotVel = 0;
        invuln = INVULN_TIME;
        heat = 0; abLocked = false;
    };

    const update = () => {
        if (isGameOver && isGameOver()) return false;

        // Rotation with torque/damping
        const left  = keyDown(sk.LEFT_ARROW);
        const right = keyDown(sk.RIGHT_ARROW);
        if (left)  rotVel = Math.min( ANG_MAX, rotVel + ANG_TORQUE);
        if (right) rotVel = Math.max(-ANG_MAX, rotVel - ANG_TORQUE);
        if (!(left || right)) rotVel *= ANG_DAMPING;
        rotDeg = (rotDeg + rotVel + 360) % 360;

        // Thrust keys
        const thrustHeld = keyDown(sk.UP_ARROW);
        const brakeHeld  = keyDown(sk.DOWN_ARROW);
        const shiftHeld  = keyDown(16); // Shift

        // Boost detect
        if (thrustHeld && !prevThrustHeld) {
            const now = sk.millis();
            if (now - lastUpTap <= BOOST_WINDOW_MS) {
                const dir = forwardVec();
                vel[0] += dir[0] * BOOST_IMPULSE;
                vel[1] += dir[1] * BOOST_IMPULSE;
                boostingFrames = BOOST_VFX_FRAMES;
                sfx?.play('sfire');
            }
            lastUpTap = now;
        }
        prevThrustHeld = thrustHeld;

        // Throttle ease
        const target = thrustHeld ? 1 : 0;
        const rate   = thrustHeld ? THR_RISE : THR_FALL;
        throttle += (target - throttle) * rate;
        if (throttle < 0.0001) throttle = 0;

        // Afterburner heat/lock
        let thrustMul = 1;
        const canAB = shiftHeld && thrustHeld && !abLocked;
        if (canAB) {
            thrustMul = AB_MULT;
            heat = Math.min(AB_MAX, heat + AB_UP);
            if (heat >= AB_MAX) abLocked = true;
        } else {
            heat = Math.max(0, heat - AB_DOWN);
            if (heat <= 0.25) abLocked = false;
        }

        // Apply thrust
        if (throttle > 0) {
            const dir = forwardVec();
            const f = BASE_THRUST * throttle * thrustMul;
            vel[0] += dir[0] * f;
            vel[1] += dir[1] * f;

            if (!thrustInst) thrustInst = sfx?.loop('thrust', { volume: 0.0 });
            thrustInst?.setVolume(THRUST_VOL * (0.8 + 0.2 * (thrustMul > 1 ? 1 : throttle)));
        } else if (thrustInst) {
            thrustInst.setVolume(0.0);
        }

        // Brake
        if (brakeHeld) {
            vel[0] *= BRAKE_FACTOR;
            vel[1] *= BRAKE_FACTOR;
            const sp = Math.hypot(vel[0], vel[1]);
            if (sp > 1e-6) {
                vel[0] -= (vel[0] / sp) * BRAKE_PUSH;
                vel[1] -= (vel[1] / sp) * BRAKE_PUSH;
            }
        }

        // Soft cap speed
        const spd = Math.hypot(vel[0], vel[1]);
        if (spd > SOFT_CAP) {
            const s = SOFT_CAP + (spd - SOFT_CAP) * 0.90;
            vel[0] *= (s / spd);
            vel[1] *= (s / spd);
        }

        // Exhaust emission (intensity from throttle/boost/afterburner/brake)
        const dir = forwardVec();
        const intensity = Math.min(1, (throttle * 0.7) + (boostingFrames > 0 ? 0.5 : 0) + (heat > 0.6 ? 0.35 : 0));
        ex?.emit(pos, dir, intensity, { afterburn: heat > 0.6, brake: brakeHeld, speed: spd });

        // Integrate + drags
        pos[0] += vel[0]; pos[1] += vel[1];
        vel[0] *= DAMPING; vel[1] *= DAMPING;
        vel[0] -= vel[0] * Math.abs(vel[0]) * AIR_DRAG_K;
        vel[1] -= vel[1] * Math.abs(vel[1]) * AIR_DRAG_K;

        // Wrap
        pos[0] = wrapCoord(pos[0], win.left,  win.right);
        pos[1] = wrapCoord(pos[1], win.bottom, win.top);

        // Fire
        if (sk.keyIsDown(32)) fire();

        if (invuln > 0) invuln--;

        return thrustHeld || boostingFrames > 0 || (throttle > 0.02);
    };

    const draw = (thrusting) => {
        sk.push();
        sk.translate(pos[0], pos[1]);
        sk.rotate(sk.radians(rotDeg));

        // Body
        const bodyPts = SHIP_POINTS_BODY.map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE }));
        neonPoly(sk, bodyPts, THEME.ship, pixelToWorld, 1.6, true);

        // Flame
        if (thrusting) {
            const lenMul = 1 + throttle * 0.9 + (boostingFrames > 0 ? 0.8 : 0) + (heat > 0.6 ? 0.35 : 0);
            const flamePts = THRUST_POINTS_BASE.map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE * lenMul }));
            let flameColor = THEME.thrust || '#ff9933';
            if (heat > 0.6 || boostingFrames > 0) flameColor = THEME.afterburn || '#ffd166';
            neonPoly(sk, flamePts, flameColor, pixelToWorld, 2.0 + 0.4 * throttle, true);
        }

        sk.pop();
    };

    const radius = () => SHIP_HIT_RADIUS;
    const invulnerable = () => invuln > 0;
    const position = () => pos;

    return { update, draw, pos: position, radius, invulnerable, explode, exhaust: ex };
};
