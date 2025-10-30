// /src/demos/arcade/ship.js
import { V } from '../../lib/esm/V';
import { neonPoly } from './neon';
import { createBullet } from './bullet';

export const createShip = (sk, THEME, pixelToWorld, win, bullets, bursts, isGameOver, onDeath, sfx) => {
    // ---------------- State ----------------
    const pos = V.create(0, 0);
    const vel = V.create(0, 0);
    let rotDeg = 0;
    let rotVel = 0;          // deg/frame (angular velocity)
    let invuln = 0;

    // ---------------- Constants (feel) ----------------
    // Angular
    const ANG_TORQUE  = 0.45;     // deg/frame^2 when holding L/R
    const ANG_DAMPING = 0.92;     // angular friction per frame
    const ANG_MAX     = 6.5;      // clamp spin speed (deg/frame)

    // Linear thrust
    const BASE_THRUST     = 0.018;     // wu/frame^2 @ full throttle
    const THROTTLE_RISE   = 0.08;      // per-frame ease toward 1 when held
    const THROTTLE_FALL   = 0.15;      // per-frame ease toward 0 when released
    const DAMPING         = 0.988;     // mild space drag to keep it playable
    const AIR_DRAG_K      = 0.0008;    // tiny quadratic drag ~ v^2
    const SOFT_CAP        = 0.85;      // “tanh”-like soft cap target speed (wu/frame)

    // Afterburner (Shift+Up)
    const AB_MULT         = 1.65;      // extra thrust
    const AB_HEAT_UP      = 0.016;     // heat per frame while burning
    const AB_HEAT_DOWN    = 0.010;     // heat cooldown per frame
    const AB_OVERHEAT     = 1.0;       // clamp; locks burner until cool
    let   heat            = 0;         // 0..1
    let   abLocked        = false;

    // Tap-Boost (double-tap Up)
    const BOOST_IMPULSE   = 0.48;      // instantaneous wu/frame push
    const BOOST_WINDOW_MS = 240;       // double-tap window
    let lastUpTap = -9999;
    let boostingFrames = 0;            // short visual flare
    const BOOST_VFX_FRAMES = 10;

    // Brake (Down)
    const BRAKE_FACTOR    = 0.10;      // per-frame scale
    const BRAKE_PUSH      = 0.02;      // tiny retro impulse opposite velocity

    // Bullets (unchanged)
    const BULLET_SPEED    = 0.5;
    const BULLET_LIFE     = 60;
    const FIRE_COOLDOWN_MS = 220;
    let lastFireMs = 0;

    // Invulnerability after death
    const INVULN_TIME = 90;

    // ---------------- Geometry (Y-up) ----------------
    const SHIP_POINTS_BODY = [
        { x:  0.0,  y:  1.0 },
        { x:  0.5,  y: -0.5 },
        { x:  0.0,  y: -0.2 },
        { x: -0.5,  y: -0.5 }
    ];

    // Flame centered on -Y axis, extends backward
    const THRUST_POINTS_BASE = [
        { x:   0.00, y: -0.55 },
        { x:   0.16, y: -0.95 },
        { x:   0.00, y: -1.10 },
        { x:  -0.16, y: -0.95 },
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

    // ---- Throttle state ----
    let throttle = 0;       // 0..1 (eases with hold/release)

    // ---------------- Controls helpers ----------------
    const keyDown = (code) => sk.keyIsDown ? sk.keyIsDown(code) : false;

    const fire = () => {
        const now = sk.millis();
        if (now - lastFireMs < FIRE_COOLDOWN_MS) return;

        const dir = forwardVec();
        // Muzzle offset outside ship radius
        const SAFE_OFFSET = SHIP_HIT_RADIUS + 0.25 + 0.05; // shipR + bulletR + ε
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
        rotDeg = 0;
        rotVel = 0;
        invuln = INVULN_TIME;
        heat = 0; abLocked = false;
    };

    // ---------------- Update ----------------
    let prevThrustHeld = false;

    const update = () => {
        if (isGameOver && isGameOver()) return false;

        // Rotation → angular velocity with torque & damping
        const left  = keyDown(sk.LEFT_ARROW);
        const right = keyDown(sk.RIGHT_ARROW);
        if (left)  rotVel = Math.min( ANG_MAX, rotVel + ANG_TORQUE);
        if (right) rotVel = Math.max(-ANG_MAX, rotVel - ANG_TORQUE);
        if (!(left || right)) rotVel *= ANG_DAMPING;
        rotDeg = (rotDeg + rotVel + 360) % 360;

        // Thrust keys
        const thrustHeld = keyDown(sk.UP_ARROW);
        const brakeHeld  = keyDown(sk.DOWN_ARROW);
        const shiftHeld  = keyDown(16); // SHIFT

        // Double-tap detection for Boost
        if (thrustHeld && !prevThrustHeld) {
            const now = sk.millis();
            if (now - lastUpTap <= BOOST_WINDOW_MS) {
                // impulse forward
                const dir = forwardVec();
                vel[0] += dir[0] * BOOST_IMPULSE;
                vel[1] += dir[1] * BOOST_IMPULSE;
                boostingFrames = BOOST_VFX_FRAMES;
                sfx?.play('sfire'); // a sharp click fits great here
            }
            lastUpTap = now;
        }
        prevThrustHeld = thrustHeld;

        // Throttle easing (smooth power application)
        const to = thrustHeld ? 1 : 0;
        const rate = thrustHeld ? THROTTLE_RISE : THROTTLE_FALL;
        throttle += (to - throttle) * rate;
        if (throttle < 0.0001) throttle = 0;

        // Afterburner (hotter thrust with heat/overheat)
        let thrustMul = 1;
        const canAfterburn = shiftHeld && thrustHeld && !abLocked;
        if (canAfterburn) {
            thrustMul = AB_MULT;
            heat = Math.min(AB_OVERHEAT, heat + AB_HEAT_UP);
            if (heat >= AB_OVERHEAT) abLocked = true;
        } else {
            heat = Math.max(0, heat - AB_HEAT_DOWN);
            if (heat <= 0.25) abLocked = false; // unlock once cooled enough
        }

        // Apply thrust force
        if (throttle > 0) {
            const dir = forwardVec();
            const f = BASE_THRUST * throttle * thrustMul;
            vel[0] += dir[0] * f;
            vel[1] += dir[1] * f;

            if (!thrustInst) thrustInst = sfx?.loop('thrust', { volume: 0.0 });
            // subtle pump with afterburner
            thrustInst?.setVolume(THRUST_VOL * (0.8 + 0.2 * (thrustMul > 1 ? 1 : throttle)));
        } else if (thrustInst) {
            thrustInst.setVolume(0.0);
        }

        // Brake (Down): damp velocity strongly + tiny retro impulse
        if (brakeHeld) {
            vel[0] *= BRAKE_FACTOR;
            vel[1] *= BRAKE_FACTOR;
            const spd = Math.hypot(vel[0], vel[1]);
            if (spd > 1e-6) {
                vel[0] -= (vel[0] / spd) * BRAKE_PUSH;
                vel[1] -= (vel[1] / spd) * BRAKE_PUSH;
            }
        }

        // Soft speed cap (smoothly resists high speeds)
        const spd = Math.hypot(vel[0], vel[1]);
        if (spd > SOFT_CAP) {
            // scale down a touch toward cap
            const s = SOFT_CAP + (spd - SOFT_CAP) * 0.90; // keep most of extra, but not all
            vel[0] = vel[0] * (s / spd);
            vel[1] = vel[1] * (s / spd);
        }

        // Integrate + mild drags
        pos[0] += vel[0];
        pos[1] += vel[1];

        // Linear damping
        vel[0] *= DAMPING;
        vel[1] *= DAMPING;

        // Quadratic drag (tiny; stabilizes ultra-high speeds)
        vel[0] -= vel[0] * Math.abs(vel[0]) * AIR_DRAG_K;
        vel[1] -= vel[1] * Math.abs(vel[1]) * AIR_DRAG_K;

        // Wrap world
        pos[0] = wrapCoord(pos[0], win.left,  win.right);
        pos[1] = wrapCoord(pos[1], win.bottom, win.top);

        // Fire
        if (sk.keyIsDown(32)) fire();

        if (invuln > 0) invuln--;

        return thrustHeld || boostingFrames > 0 || (throttle > 0.02);
    };

    // ---------------- Draw ----------------
    const draw = (thrusting) => {
        sk.push();
        sk.translate(pos[0], pos[1]);
        sk.rotate(sk.radians(rotDeg));

        // Body
        const bodyPts = SHIP_POINTS_BODY.map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE }));
        neonPoly(sk, bodyPts, THEME.ship, pixelToWorld, 1.6, true);

        // Flame: scale with throttle; color swaps on afterburner/boost
        if (thrusting) {
            // dynamic length & width factor
            const lenMul = 1 + throttle * 0.9 + (boostingFrames > 0 ? 0.8 : 0) + (heat > 0.6 ? 0.35 : 0);
            const flamePts = THRUST_POINTS_BASE.map(p => ({ x: p.x * SHIP_SCALE, y: p.y * SHIP_SCALE * lenMul }));

            let flameColor = THEME.thrust || '#ff9933';         // normal orange
            if (heat > 0.6 || boostingFrames > 0) flameColor = THEME.afterburn || '#ffd166'; // hotter
            neonPoly(sk, flamePts, flameColor, pixelToWorld, 2.0 + 0.4 * throttle, true);
        }

        sk.pop();

        if (boostingFrames > 0) boostingFrames--;
    };

    // ---------------- API ----------------
    const radius = () => SHIP_HIT_RADIUS;
    const invulnerable = () => invuln > 0;
    const position = () => pos;

    return { update, draw, pos: position, radius, invulnerable, explode };
};
