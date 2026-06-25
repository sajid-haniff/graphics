// ============================================================================
// lunar-lander-demo.js — Jupiter Lander homage
// Factory: createLunarLanderArcadeDemo(sk, W, H) → { setup, display, keyPressed }
//
// Pattern mirrors asteroids-demo.js throughout:
//   - world/COMPOSITE built the same way (no createGraphicsContext2)
//   - input via sk.keyIsDown() directly, never scenegraph-keyboard
//   - lander state is a plain local object, not a scenegraph body
//   - dt = Math.min(sk.deltaTime / 1000, 0.05) every frame, no fixed-step assumption
//   - rendering via neonPoly / neonLine from arcade/neon.js
//   - camera shake from arcade/camera-shake.js
// ============================================================================

import { M2D } from '../../lib/esm/M2D';
import { createHowlerSFX } from '../../lib/esm/sfx-howler';

import { neonPoly, neonLine, neonDot } from '../arcade/neon';
import { createCameraShake } from '../arcade/camera-shake';

import { LUNAR_SFX_FILES } from './lunar-lander-sfx-map';
import {
    step,
    effectiveThrottle,
    classifyTouchdown,
    FUEL_START,
    V_SAFE_Y, V_SAFE_X, THETA_SAFE, OMEGA_SAFE,
} from './lander-dynamics';
import { generateTerrain, getVisibleTerrain, heightAt, findPadUnder } from './terrain';
import { createLunarStarfield } from './starfield';
import { createLanderExplosion } from './lander-explosion';
import { createLunarParticles } from './lunar-particles';
import {
    getColorProfile,
    getNextColorProfile,
    resolvePadTier,
    getPulse,
} from './color-profiles';
import { getPlanetProfile, getNextPlanetProfile } from './planet-profiles';
import { createEnvironmentEffects } from './environment-effects';

// ---------- Lander geometry — Y-up local coords, theta=0 = nose up (+Y) ----------
// Scale factor: 1 world unit ≈ 1 m at the chosen win, so the lander is ~2 m tall.

const S = 1.1;  // lander scale in world units

const BODY_PTS = [
    { x:  0.00, y:  0.72 * S },  // nose
    { x:  0.38 * S, y:  0.28 * S },  // shoulder right
    { x:  0.44 * S, y: -0.32 * S },  // hip right
    { x:  0.00, y: -0.50 * S },  // base centre
    { x: -0.44 * S, y: -0.32 * S },  // hip left
    { x: -0.38 * S, y:  0.28 * S },  // shoulder left
];

// Landing legs — open polylines, drawn with neonLine
const LEG_L = [
    { x: -0.44 * S, y: -0.32 * S },
    { x: -0.78 * S, y: -0.82 * S },
];
const LEG_R = [
    { x:  0.44 * S, y: -0.32 * S },
    { x:  0.78 * S, y: -0.82 * S },
];

// Foot level: lowest point of the leg tips in local Y (used for ground contact)
const FOOT_Y = -0.82 * S;
const MIN_SHIP_PIXELS = 22;
const MAX_RENDER_SCALE = 1.8;
const SHIP_HEIGHT_WORLD =
    Math.max(...BODY_PTS.map(p => p.y)) -
    Math.min(FOOT_Y, ...BODY_PTS.map(p => p.y));

// Flame nozzle base edges (local coords, below the body base)
const NOZZLE_L = { x: -0.16 * S, y: -0.50 * S };
const NOZZLE_R = { x:  0.16 * S, y: -0.50 * S };

// Rotate a local {x,y} point by theta around origin in the same convention as
// thrustDir(theta): local +Y nose -> [sin(theta), cos(theta)]. Positive theta
// therefore points the nose right in world space.
const rotPt = (p, theta) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    return { x: p.x * c + p.y * s, y: -p.x * s + p.y * c };
};

// Map a local polygon into world space
const toWorld = (pts, cx, cy, theta) =>
    pts.map(p => { const r = rotPt(p, theta); return { x: r.x + cx, y: r.y + cy }; });

const scalePt = (p, s) => ({ x: p.x * s, y: p.y * s });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const lcg = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const SPAWN_PROFILES = [
    { name: 'EASY',      vy: -2.5, vxRange: 0.0, fuel: 100, altitude: 75 },
    { name: 'NORMAL',    vy: -3.5, vxRange: 0.5, fuel: 95,  altitude: 95 },
    { name: 'HARD',      vy: -5.0, vxRange: 1.0, fuel: 85,  altitude: 110 },
    { name: 'CHALLENGE', vy: -7.0, vxRange: 2.0, fuel: 75,  altitude: 125 },
];

// ---------- Factory ----------
export const createLunarLanderArcadeDemo = (sk, W = 1024, H = 768) => {

    // ---------- World bounds + camera-space COMPOSITE ----------
    const win = { left: -120, right: 120, bottom: -70, top: 90 };
    const DEVICE    = M2D.fromValues(W,  0, 0, H,  0,  0);
    const REFLECT_Y = M2D.fromValues(1,  0, 0, -1, 0,  H);
    const ASPECT    = W / H;

    const makeComposite = (visibleWin) => {
        // WORLD maps the current camera window into normalised [0,1] viewport.
        const sw = 1 / (visibleWin.right  - visibleWin.left);
        const sh = 1 / (visibleWin.top    - visibleWin.bottom);
        const tw = -visibleWin.left   * sw;
        const th = -visibleWin.bottom * sh;
        const WORLD = M2D.fromValues(sw, 0, 0, sh, tw, th);
        return M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);
    };

    const cameraWin = (camera) => {
        const halfW = camera.halfH * ASPECT;
        return {
            left:   camera.center[0] - halfW,
            right:  camera.center[0] + halfW,
            bottom: camera.center[1] - camera.halfH,
            top:    camera.center[1] + camera.halfH,
        };
    };

    const clampCamera = (camera) => {
        const worldHalfH = (win.top - win.bottom) * 0.5;
        const worldHalfW = (win.right - win.left) * 0.5;
        const maxHalfHForWidth = worldHalfW / ASPECT;
        camera.halfH = Math.min(camera.halfH, worldHalfH, maxHalfHForWidth);
        camera.targetHalfH = Math.min(camera.targetHalfH, worldHalfH, maxHalfHForWidth);

        camera.center[1] = clamp(camera.center[1], win.bottom + camera.halfH, win.top - camera.halfH);
        return camera;
    };

    const createCamera = (s) => clampCamera({
        center: [s.pos[0], s.pos[1] - 22.0],
        halfH:  72.0,
        targetHalfH: 72.0,
    });

    const updateCamera = (camera, s, dt) => {
        const groundY = terrain ? heightAt(terrain, s.pos[0]) : win.bottom;
        const altitude = Math.max(0, s.pos[1] - groundY);
        const speed = Math.hypot(s.vel[0], s.vel[1]);
        const speedZoom = clamp(speed * 0.8, 0, 8);

        let targetHalfH;
        let yBias;
        if (altitude > 45) {
            targetHalfH = clamp(65 + speedZoom + (altitude - 45) * 0.12, 65, 85);
            yBias = 0.45;
        } else if (altitude < 18) {
            targetHalfH = clamp(24 + altitude * 0.35 + speedZoom * 0.35, 24, 38);
            yBias = 0.20;
        } else {
            const t = (altitude - 18) / 27;
            targetHalfH = clamp(42 + t * 23 + speedZoom * 0.45, 42, 65);
            yBias = 0.32;
        }
        camera.targetHalfH = targetHalfH;

        // Camera framing trades off scale and control: high altitude favours
        // gorge context, while low altitude favours precision near pads.
        const lookDown = camera.targetHalfH * yBias;
        const leadX = clamp(s.vel[0] * 1.25, -camera.targetHalfH * 0.7, camera.targetHalfH * 0.7);
        const targetCenter = [
            s.pos[0] + leadX,
            s.pos[1] - lookDown,
        ];

        const posAlpha = 1 - Math.exp(-3.2 * dt);
        const zoomAlpha = 1 - Math.exp(-2.2 * dt);
        camera.center[0] += (targetCenter[0] - camera.center[0]) * posAlpha;
        camera.center[1] += (targetCenter[1] - camera.center[1]) * posAlpha;
        camera.halfH += (camera.targetHalfH - camera.halfH) * zoomAlpha;

        return clampCamera(camera);
    };

    const landerRenderScale = (visibleWin) => {
        const visibleWorldHeight = visibleWin.top - visibleWin.bottom;
        const shipPixels = SHIP_HEIGHT_WORLD / visibleWorldHeight * H;
        if (shipPixels >= MIN_SHIP_PIXELS) return 1;
        return Math.min(MAX_RENDER_SCALE, MIN_SHIP_PIXELS / shipPixels);
    };

    const setColorProfile = (profile) => {
        colorProfile = profile;
    };

    const setPlanetProfile = (profile) => {
        planetProfile = profile;
        setColorProfile(getColorProfile(profile.visualProfileId));
        environmentEffects?.resetTransient();
    };

    // pixelToWorld(px) → world units — used for strokeWeight parity with neon helpers
    let pixelToWorld = M2D.makePixelToWorld(makeComposite(win));

    // ---------- Systems ----------
    let SFX   = null;
    let shake = null;
    let starfield = null;
    let environmentEffects = null;
    let roundSeed = 0;
    let roundNumber = 0;
    let colorProfile = getColorProfile('vectorLunar');
    let planetProfile = getPlanetProfile('moon');

    // ---------- Game state ----------
    let terrain     = null;
    let state       = null;   // lander dynamics state (see lander-dynamics.js)
    let camera      = null;
    let explosion   = null;
    let particles   = null;
    let phase       = 'playing';   // 'playing' | 'landed' | 'crashed' | 'gameover'
    let score       = 0;
    let hiScore     = 0;
    let lives       = 3;
    let resetTimer  = 0;          // seconds until auto-respawn
    let engineInst  = null;       // looping engine-sound handle
    let flameLen    = 0;          // 0..1 — smoothed flame length for rendering
    let lastThrottle = 0;         // actual effective throttle used for audio/HUD/flame
    let boosterCooldown = 0;      // seconds until next booster-sfx chirp is allowed
    let profileIdx = 1;           // NORMAL by default
    let eventCounter = 0;

    // Score constants
    const BASE_SCORE        = 1000;
    const FUEL_BONUS_PER    = 8;      // per remaining fuel unit
    const PRECISION_BONUS   = 500;    // full precision (centre of pad)
    const SOFTNESS_BONUS    = 300;    // full softness (vy = 0, perfectly vertical)

    // Delay between crash/land and next life/gameover screen
    const RESET_DELAY       = 3.0;

    // ---- Spawn helpers ----
    const chooseSpawnX = (rand, profile) => {
        const baseLeft = win.left;
        const baseRight = win.right;
        const pads = terrain.pads || [];
        const candidates = [];
        const scored = [];

        const addCandidate = (x, kind = 'terrain') => {
            const margin = profile.altitude * 0.25;
            const cx = clamp(x, baseLeft + margin, baseRight - margin);
            const groundY = heightAt(terrain, cx);
            const topPenalty = Math.max(0, groundY + profile.altitude - (win.top - 8));
            scored.push({
                x: cx,
                kind,
                score: topPenalty * 20 + rand(),
            });
        };

        if (pads.length >= 2) {
            const sorted = [...pads].sort((a, b) => a.x1 - b.x1);
            for (let i = 0; i < sorted.length - 1; i++) {
                candidates.push((sorted[i].x2 + sorted[i + 1].x1) * 0.5);
            }
        }
        for (const pad of pads) {
            if (pad.multiplier >= 2) candidates.push((pad.x1 + pad.x2) * 0.5 + (rand() - 0.5) * 24);
        }

        let lowX = 0, lowY = Infinity, highX = 0, highY = -Infinity;
        for (let i = 0; i <= 24; i++) {
            const x = baseLeft + (baseRight - baseLeft) * i / 24;
            const y = heightAt(terrain, x);
            if (y < lowY) { lowY = y; lowX = x; }
            if (y > highY) { highY = y; highX = x; }
        }
        candidates.push(lowX + (rand() - 0.5) * 28);
        candidates.push(highX + (rand() - 0.5) * 20);
        candidates.push((lowX + highX) * 0.5);

        for (const x of candidates) addCandidate(x);
        scored.sort((a, b) => a.score - b.score);
        const pickCount = Math.min(scored.length, profile.name === 'EASY' ? 5 : 3);
        return (scored[Math.floor(rand() * pickCount)] || { x: 0 }).x;
    };

    const spawnState = () => {
        const profile = SPAWN_PROFILES[profileIdx];
        const rand = lcg((roundSeed ^ Math.imul(roundNumber + 1, 0x9e3779b9) ^ (profileIdx << 16)) >>> 0);
        const spawnX = chooseSpawnX(rand, profile);
        const groundY = heightAt(terrain, spawnX);
        const spawnY = groundY + profile.altitude;
        const vx = profile.vxRange === 0 ? 0 : (rand() * 2 - 1) * profile.vxRange;

        return {
            pos:   [spawnX, spawnY],
            vel:   [vx, profile.vy],
            theta: 0,
            omega: 0,
            fuel:  Math.min(FUEL_START, profile.fuel),
        };
    };

    const startRound = (newSeed = true) => {
        if (newSeed || !terrain) {
            const seed = (Math.random() * 0xffffffff) >>> 0;
            roundSeed = seed;
            roundNumber = 0;
            terrain = generateTerrain(seed, win);
            starfield = createLunarStarfield(seed ^ 0x7a17c9d3, 220);
            environmentEffects = createEnvironmentEffects(seed ^ 0x6d2b79f5);
        } else {
            roundNumber += 1;
        }
        particles = createLunarParticles(roundSeed ^ Math.imul(roundNumber + 1, 0x4d3a9f17));
        state       = spawnState();
        phase       = 'playing';
        resetTimer  = 0;
        flameLen    = 0;
        lastThrottle = 0;
        explosion   = null;
        eventCounter = 0;
        boosterCooldown = 0;
        camera      = createCamera(state);
    };

    // ---------- Setup ----------
    const setup = () => {
        sk.createCanvas(W, H);
        sk.frameRate?.(60);

        // Prevent space-bar from scrolling the page while playing
        const canvas = sk._renderer?.canvas || sk.canvas;
        if (canvas) {
            canvas.tabIndex = 0;
            canvas.focus();
            canvas.addEventListener('keydown',
                (e) => { if (e.code === 'Space') e.preventDefault(); },
                { passive: false }
            );
        }

        SFX = createHowlerSFX('/lunar-lander-audio/');
        SFX.loadMap(LUNAR_SFX_FILES);
        SFX.resumeOnFirstGesture();

        shake = createCameraShake(sk);

        startRound(true);
    };

    // ---------- Input ----------
    const readInput = () => {
        const kd = (c) => !!(sk.keyIsDown && sk.keyIsDown(c));
        return {
            thrust:   kd(sk.UP_ARROW) || kd(32),
            rotLeft:  kd(sk.LEFT_ARROW),
            rotRight: kd(sk.RIGHT_ARROW),
        };
    };

    // ---------- Score calculation on safe landing ----------
    const calcScore = (s, pad) => {
        const fuelBonus = Math.round(s.fuel * FUEL_BONUS_PER);

        // Precision: 1.0 at pad centre, 0.0 at pad edge
        const padCentre  = (pad.x1 + pad.x2) * 0.5;
        const padHalfW   = (pad.x2 - pad.x1) * 0.5;
        const distCenter = Math.abs(s.pos[0] - padCentre);
        const precBonus  = Math.round(
            Math.max(0, 1 - distCenter / padHalfW) * PRECISION_BONUS * pad.multiplier
        );

        // Softness: 1.0 at vy=0 and theta=0, 0.0 at thresholds
        const vyFraction = Math.max(0, 1 - Math.abs(s.vel[1]) / V_SAFE_Y);
        const angFraction = Math.max(0, 1 - Math.abs(s.theta) / THETA_SAFE);
        const softBonus  = Math.round(vyFraction * angFraction * SOFTNESS_BONUS * pad.multiplier);

        return (BASE_SCORE + fuelBonus + precBonus + softBonus) * pad.multiplier;
    };

    const nozzleWorld = (s, renderScale = 1) => {
        const nozzle = rotPt(scalePt({ x: 0, y: FOOT_Y * 0.54 }, renderScale), s.theta);
        return { x: s.pos[0] + nozzle.x, y: s.pos[1] + nozzle.y };
    };

    const padColor = (pad) => {
        const tier = resolvePadTier(pad);
        return colorProfile.pads[tier] || colorProfile.pads.standard;
    };

    const nearestPad = (pads, s = state) => {
        if (!s || !pads || pads.length === 0) return null;
        let best = null;
        let bestD = Infinity;
        for (const pad of pads) {
            const cx = (pad.x1 + pad.x2) * 0.5;
            const dx = Math.max(Math.abs(s.pos[0] - cx) - (pad.x2 - pad.x1) * 0.5, 0);
            const dy = Math.max(s.pos[1] - pad.y, 0) * 0.20;
            const d = dx + dy;
            if (d < bestD) {
                bestD = d;
                best = pad;
            }
        }
        return best;
    };

    const padApproachStrength = (pad, s = state) => {
        if (!pad || !s) return 0;
        const padCenter = (pad.x1 + pad.x2) * 0.5;
        const padHalfW = (pad.x2 - pad.x1) * 0.5;
        const xProximity = clamp(1 - Math.abs(s.pos[0] - padCenter) / (padHalfW + 14), 0, 1);
        const altitude = Math.max(0, s.pos[1] - pad.y + FOOT_Y);
        const yProximity = clamp(1 - altitude / 42, 0, 1);
        const speedOk = clamp(1 - Math.max(0, Math.abs(s.vel[1]) - V_SAFE_Y) / 5, 0, 1);
        const driftOk = clamp(1 - Math.max(0, Math.abs(s.vel[0]) - V_SAFE_X) / 4, 0, 1);
        const leanOk = clamp(1 - Math.max(0, Math.abs(s.theta) - THETA_SAFE) / 0.65, 0, 1);
        const descending = s.vel[1] < 0 ? 1 : 0.55;
        return xProximity * yProximity * (0.35 + 0.65 * speedOk * driftOk * leanOk) * descending;
    };

    // ---------- Update ----------
    const update = (dt) => {
        if (phase !== 'playing') {
            lastThrottle = 0;
            explosion?.update(dt);
            particles?.update(dt);
            if (explosion?.done()) explosion = null;
            resetTimer -= dt;
            if (resetTimer <= 0) {
                if (lives > 0) startRound(phase === 'landed');
                else           phase = 'gameover';
            }
            shake?.update(dt);
            return;
        }

        const input = readInput();
        const actualThrottle = effectiveThrottle(state, input);
        lastThrottle = actualThrottle;

        // Engine loop sound
        if (actualThrottle > 0) {
            if (!engineInst) engineInst = SFX?.loop('engine', { volume: 0.30 });
        } else {
            if (engineInst) { engineInst.stop?.(); engineInst = null; }
        }

        // Booster chirp on RCS input (rate-limited so it doesn't flood)
        if ((input.rotLeft || input.rotRight) && boosterCooldown <= 0) {
            SFX?.play('booster');
            boosterCooldown = 0.18;
        }
        boosterCooldown = Math.max(0, boosterCooldown - dt);

        // Integrate ODE
        state = step(state, input, dt, planetProfile);

        // Flame rendering uses the actual throttle. It shuts off immediately
        // when fuel is empty or the key is released; particles may only fade out.
        flameLen = actualThrottle > 0
            ? flameLen + (actualThrottle - flameLen) * Math.min(1, dt * 18)
            : 0;

        const nose = { x: Math.sin(state.theta), y: Math.cos(state.theta) };
        const exhaustDir = { x: -nose.x, y: -nose.y };
        const nozzle = nozzleWorld(state);
        if (actualThrottle > 0) particles?.emitPlume(nozzle, exhaustDir, actualThrottle, dt);

        // ---------- Ground contact ----------
        // Contact point: foot tips in world space (rotate FOOT_Y by theta then offset by pos)
        const footLocal = { x: 0, y: FOOT_Y };
        const footRot   = rotPt(footLocal, state.theta);
        const footWorldY = state.pos[1] + footRot.y;
        const groundY    = heightAt(terrain, state.pos[0]);
        const footAltitude = footWorldY - groundY;

        if (actualThrottle > 0 && footAltitude < 13) {
            const dustStrength = clamp(1 - Math.max(0, footAltitude) / 13, 0, 1);
            particles?.emitDust({ x: state.pos[0], y: groundY + 0.12 }, exhaustDir, dustStrength, dt);
        }

        const localPad = findPadUnder(terrain, state.pos[0]);
        particles?.emitPadPulse(localPad, resolvePadTier(localPad), padApproachStrength(localPad), dt);
        particles?.update(dt);

        if (footWorldY <= groundY) {
            const impactState = state;
            // Snap lander so feet rest exactly on surface
            const overlap = groundY - footWorldY;
            state = {
                ...state,
                pos: [state.pos[0], state.pos[1] + overlap],
                vel: [0, 0],
                omega: 0,
            };

            if (engineInst) { engineInst.stop?.(); engineInst = null; }
            lastThrottle = 0;

            const pad     = findPadUnder(terrain, state.pos[0]);
            const verdict = classifyTouchdown(state, pad);

            if (verdict === 'safe') {
                const earned = Math.round(calcScore(state, pad));
                score  += earned;
                hiScore = Math.max(hiScore, score);
                phase   = 'landed';

                SFX?.playRandom(['landing1', 'landing2']);

                // High-precision bonus stinger
                const padCentre = (pad.x1 + pad.x2) * 0.5;
                const padHalfW  = (pad.x2 - pad.x1) * 0.5;
                if (Math.abs(state.pos[0] - padCentre) < padHalfW * 0.25 &&
                    Math.abs(state.vel[1]) < V_SAFE_Y * 0.4) {
                    SFX?.playRandom(['confetti1', 'confetti2']);
                }

                // TODO(Decision F): baby.mp3 — trigger condition TBD; wire up once confirmed.

                particles?.emitLandingDust({ x: state.pos[0], y: groundY + 0.12 }, pad.x2 - pad.x1);
                shake?.kick(4, 0.18);
            } else {
                lives -= 1;
                phase  = 'crashed';
                SFX?.playRandom(['crash1', 'crash2']);
                const boomSeed = (roundSeed ^ Math.imul(roundNumber + 1, 0x9e3779b9) ^
                    Math.imul(++eventCounter, 0x85ebca6b) ^
                    ((state.pos[0] * 1000) | 0) ^
                    ((state.pos[1] * 1000) | 0)) >>> 0;
                explosion = createLanderExplosion(boomSeed >>> 0, {
                    ...impactState,
                    pos: state.pos,
                }, {
                    bodyPts: BODY_PTS,
                    legL: LEG_L,
                    legR: LEG_R,
                });
                particles?.flash(1);
                shake?.kick(28, 0.75);
            }

            resetTimer = RESET_DELAY;
        }

        shake?.update(dt);
    };

    // ---------- Rendering ----------

    const drawPadGlow = (visibleTerrain) => {
        if (!state) return;
        const now = (sk.millis?.() || 0) / 1000;
        const bloom = colorProfile.bloom || 1;
        sk.push();
        sk.noStroke();
        for (const pad of visibleTerrain.pads) {
            const strength = padApproachStrength(pad);
            const tier = resolvePadTier(pad);
            const valuePulse = pad.multiplier > 1
                ? 0.25 * getPulse({ time: now, frequency: 0.75, phase: pad.multiplier })
                : 0;
            const glow = Math.max(strength, valuePulse);
            if (glow <= 0.02) continue;
            const col = sk.color(padColor(pad));
            const w = pad.x2 - pad.x1;
            const bloomH = 1.0 + glow * 5.2;
            const danger = strength > 0.15 && state &&
                (Math.abs(state.vel[1]) > V_SAFE_Y || Math.abs(state.vel[0]) > V_SAFE_X || Math.abs(state.theta) > THETA_SAFE);
            const haloCol = sk.color(danger ? colorProfile.pads.warningHalo : colorProfile.pads[tier]);
            sk.fill(sk.red(haloCol), sk.green(haloCol), sk.blue(haloCol), (20 + 56 * glow) * bloom);
            sk.rect(pad.x1 - w * 0.16 * glow, pad.y - bloomH * 0.28,
                    w * (1 + 0.32 * glow), bloomH);
            sk.fill(sk.red(col), sk.green(col), sk.blue(col), 38 + 82 * glow);
            sk.rect(pad.x1, pad.y - pixelToWorld(4.5), w, pixelToWorld(9.0));
        }
        sk.pop();
    };

    const drawTerrain = (visibleTerrain) => {
        const { vertices, pads } = visibleTerrain;
        // Craggy terrain polyline
        sk.noFill();
        sk.stroke(colorProfile.terrain.line);
        sk.strokeWeight(pixelToWorld(1.8));
        sk.beginShape();
        for (const v of vertices) sk.vertex(v.x, v.y);
        sk.endShape();

        // Landing pads
        for (const pad of pads) {
            const col = padColor(pad);
            neonLine(sk, { x: pad.x1, y: pad.y }, { x: pad.x2, y: pad.y },
                     col, pixelToWorld, 2.5);
            neonDot(sk, { x: pad.x1, y: pad.y }, col, pixelToWorld, 4);
            neonDot(sk, { x: pad.x2, y: pad.y }, col, pixelToWorld, 4);
        }
    };

    const drawEngineLight = () => {
        if (!state || lastThrottle <= 0) return;
        const n = nozzleWorld(state);
        const bloom = colorProfile.bloom || 1;
        const flicker = 0.78 + 0.22 * Math.sin((sk.millis?.() || 0) * 0.034 + roundSeed * 0.001);
        const r = pixelToWorld((48 + 16 * flicker) * Math.min(1.4, bloom));
        const light = colorProfile.effects.engineLight;
        const core = colorProfile.effects.engineLightCore;
        sk.push();
        sk.noStroke();
        sk.fill(light[0], light[1], light[2], 34 * flicker * bloom);
        sk.ellipse(n.x, n.y, r, r);
        sk.fill(core[0], core[1], core[2], 42 * flicker);
        sk.ellipse(n.x, n.y, r * 0.42, r * 0.42);
        sk.pop();
    };

    const drawLander = (renderScale = 1) => {
        const { pos, theta } = state;
        const [cx, cy] = pos;
        const bodyPts = BODY_PTS.map(p => scalePt(p, renderScale));
        const legL = LEG_L.map(p => scalePt(p, renderScale));
        const legR = LEG_R.map(p => scalePt(p, renderScale));

        // Body hull
        neonPoly(sk, toWorld(bodyPts, cx, cy, theta), colorProfile.ship.outline, pixelToWorld, 1.5, true);

        // Landing legs
        const [lL0, lL1] = toWorld(legL, cx, cy, theta);
        const [lR0, lR1] = toWorld(legR, cx, cy, theta);
        neonLine(sk, lL0, lL1, colorProfile.ship.outline, pixelToWorld, 1.2);
        neonLine(sk, lR0, lR1, colorProfile.ship.outline, pixelToWorld, 1.2);

        // Flame jet (when thrusting)
        if (lastThrottle > 0 && flameLen > 0.02) {
            const jitter   = Math.sin((sk.millis?.() || 0) * 0.045 + roundNumber) * 0.05 * S * renderScale;
            const jetDepth = flameLen * 1.6 * S * renderScale;
            const tipLocal = { x: jitter, y: FOOT_Y * 0.5 * renderScale - jetDepth };

            const nL  = rotPt(scalePt(NOZZLE_L, renderScale), theta);
            const nR  = rotPt(scalePt(NOZZLE_R, renderScale), theta);
            const tip = rotPt(tipLocal,  theta);

            const wNL  = { x: nL.x  + cx, y: nL.y  + cy };
            const wNR  = { x: nR.x  + cx, y: nR.y  + cy };
            const wTip = { x: tip.x + cx, y: tip.y + cy };

            // Outer glow pass
            neonPoly(sk, [wNL, wTip, wNR], colorProfile.effects.flame,     pixelToWorld, 3.0, false);
            // Bright core
            neonPoly(sk, [wNL, wTip, wNR], colorProfile.effects.flameCore, pixelToWorld, 1.2, false);
        }
    };

    const drawWorldFlash = () => {
        const a = Math.max(particles?.flashAlpha?.() || 0, explosion?.flashAlpha?.() || 0);
        if (a <= 0) return;
        sk.resetMatrix();
        sk.noStroke();
        const flash = colorProfile.effects.flash;
        sk.fill(flash[0], flash[1], flash[2], 55 * a * (colorProfile.bloom || 1));
        sk.rect(0, 0, W, H);
    };

    const drawPadLabels = (COMPOSITE, visibleTerrain) => {
        sk.resetMatrix();
        sk.noStroke();
        sk.textFont('monospace');
        sk.textAlign(sk.CENTER, sk.BOTTOM);
        sk.textSize(11);
        for (const pad of visibleTerrain.pads) {
            const p = M2D.transformPoint(COMPOSITE, [(pad.x1 + pad.x2) * 0.5, pad.y + 1.8]);
            sk.fill(padColor(pad));
            sk.text(pad.label, p[0], p[1]);
        }
        sk.textAlign(sk.LEFT, sk.BASELINE);
    };

    const drawHUD = (visibleTerrain) => {
        sk.resetMatrix();
        sk.noStroke();
        sk.textFont('monospace');

        const altAboveGround = state
            ? Math.max(0, state.pos[1] - heightAt(terrain, state.pos[0]) - (-FOOT_Y)).toFixed(1)
            : '—';
        const vy   = state ? state.vel[1].toFixed(2) : '—';
        const vx   = state ? state.vel[0].toFixed(2) : '—';
        const fuel = state ? Math.round(state.fuel / FUEL_START * 100) : 0;
        const ang  = state ? (state.theta * 180 / Math.PI).toFixed(1) : '—';
        const throt = lastThrottle > 0 ? '100%' : '  0%';
        const profileName = SPAWN_PROFILES[profileIdx].name;
        const targetPad = nearestPad(visibleTerrain?.pads || []);
        const padText = targetPad
            ? `${targetPad.label} ${targetPad.difficulty}`
            : 'NONE';
        const warning = (() => {
            if (!state) return 'NO SIGNAL';
            if (state.fuel <= 0) return 'OUT OF FUEL';
            if (Math.abs(state.vel[1]) > V_SAFE_Y) return 'DESCENT RATE';
            if (Math.abs(state.vel[0]) > V_SAFE_X) return 'LATERAL DRIFT';
            if (Math.abs(state.theta) > THETA_SAFE) return 'LEAN';
            if (!findPadUnder(terrain, state.pos[0]) && Number(altAboveGround) < 16) return 'NO PAD';
            return 'NOMINAL';
        })();

        sk.textSize(13);
        sk.fill(colorProfile.hud.text);
        sk.text(`SCORE ${score}   HI ${hiScore}   LIVES ${'♦'.repeat(Math.max(0, lives))}`, 10, 20);
        sk.text(`ALT ${altAboveGround}m   VY ${vy}m/s   VX ${vx}m/s`, 10, 38);
        sk.text(`FUEL ${fuel}%   THROTTLE ${throt}   TILT ${ang}°`, 10, 56);
        sk.text(`PROFILE ${profileName}   PAD ${padText}   WARN ${warning}`, 10, 74);
        sk.text(`PLANET ${planetProfile.name}   VISUAL ${colorProfile.name}`, 10, 92);
        sk.text(`↑ Thrust   ← → Rotate   [R] Reset   [D] Difficulty   [C] Color   [P] Planet`, 10, 110);

        // Fuel bar — right side
        const barW = 120, barH = 9, bx = W - barW - 12, by = 12;
        sk.fill(...colorProfile.hud.panel);
        sk.rect(bx, by, barW, barH, 2);
        const barFill = fuel > 25 ? colorProfile.hud.fuel : colorProfile.hud.fuelLow;
        sk.fill(barFill);
        sk.rect(bx, by, barW * fuel / 100, barH, 2);
        sk.fill(colorProfile.hud.text);
        sk.textSize(11);
        sk.text('FUEL', bx - 34, by + barH - 1);

        // Phase overlay
        if (phase === 'landed') {
            sk.textSize(38);
            sk.fill(colorProfile.hud.ok);
            sk.textAlign(sk.CENTER, sk.CENTER);
            sk.text('SAFE LANDING', W / 2, H / 2 - 24);
            sk.textSize(18);
            sk.fill(colorProfile.hud.text);
            sk.text(`+${score} pts`, W / 2, H / 2 + 18);
            sk.textAlign(sk.LEFT, sk.BASELINE);
        } else if (phase === 'crashed') {
            sk.textSize(42);
            sk.fill(colorProfile.hud.danger);
            sk.textAlign(sk.CENTER, sk.CENTER);
            sk.text('CRASHED', W / 2, H / 2 - 10);
            if (lives > 0) {
                sk.textSize(16);
                sk.fill(colorProfile.hud.text);
                sk.text(`${lives} lives remaining`, W / 2, H / 2 + 30);
            }
            sk.textAlign(sk.LEFT, sk.BASELINE);
        } else if (phase === 'gameover') {
            sk.textSize(42);
            sk.fill(colorProfile.hud.danger);
            sk.textAlign(sk.CENTER, sk.CENTER);
            sk.text('GAME OVER', W / 2, H / 2 - 10);
            sk.textSize(16);
            sk.fill(colorProfile.hud.text);
            sk.text(`Final score: ${score}   Hi: ${hiScore}   [R] to restart`, W / 2, H / 2 + 30);
            sk.textAlign(sk.LEFT, sk.BASELINE);
        }

        // Safe-landing indicator overlays on HUD gauges (coloured thresholds)
        const vyNum  = state ? Math.abs(state.vel[1]) : 999;
        const vxNum  = state ? Math.abs(state.vel[0]) : 999;
        const angNum = state ? Math.abs(state.theta)  : 999;
        const vyOk   = vyNum  <= V_SAFE_Y;
        const vxOk   = vxNum  <= V_SAFE_X;
        const angOk  = angNum <= THETA_SAFE;
        const dot = (ok, x, y) => {
            sk.fill(ok ? colorProfile.hud.ok : colorProfile.hud.danger);
            sk.ellipse(x, y, 7, 7);
        };
        dot(vyOk,  W - 12, 38);
        dot(vxOk,  W - 12, 56);
        dot(angOk, W - 12, 74);
    };

    // ---------- Display — called by index.js every frame ----------
    const display = () => {
        const dt = Math.min(
            (typeof sk.deltaTime === 'number' ? sk.deltaTime : 16.667) / 1000,
            0.05
        );

        update(dt);
        if (state) updateCamera(camera, state, dt);
        starfield?.update(dt);

        const visibleWin = cameraWin(camera);
        const COMPOSITE = makeComposite(visibleWin);
        pixelToWorld = M2D.makePixelToWorld(COMPOSITE);
        const visibleTerrain = getVisibleTerrain(terrain, visibleWin);
        environmentEffects?.update(dt, planetProfile, visibleWin);

        sk.background(colorProfile.world.background);
        starfield?.display(sk, camera, W, H, colorProfile);
        environmentEffects?.displayDevice(sk, planetProfile, colorProfile, W, H);

        const [dx, dy] = shake ? shake.offset() : [0, 0];
        sk.resetMatrix();
        sk.translate(dx, dy);
        sk.applyMatrix(...M2D.toArgs(COMPOSITE));

        drawPadGlow(visibleTerrain);
        particles?.display(sk, pixelToWorld, colorProfile);
        drawTerrain(visibleTerrain);
        environmentEffects?.displayWorld(sk, planetProfile, colorProfile, pixelToWorld);
        drawEngineLight();
        if (explosion) explosion.display(sk, pixelToWorld, colorProfile);
        if (state && phase !== 'crashed') drawLander(landerRenderScale(visibleWin));
        drawPadLabels(COMPOSITE, visibleTerrain);
        drawWorldFlash();

        // HUD is always in device space
        drawHUD(visibleTerrain);
    };

    // ---------- Key events ----------
    const keyPressed = () => {
        const k = sk.key?.toLowerCase?.();
        if (k === 'r') {
            if (engineInst) { engineInst.stop?.(); engineInst = null; }
            lives  = 3;
            score  = 0;
            phase  = 'playing';
            startRound(true);
        } else if (k === 'd') {
            profileIdx = (profileIdx + 1) % SPAWN_PROFILES.length;
            if (engineInst) { engineInst.stop?.(); engineInst = null; }
            lives  = 3;
            score  = 0;
            phase  = 'playing';
            startRound(false);
        } else if (k === 'c') {
            setColorProfile(getNextColorProfile(colorProfile.id));
        } else if (k === 'p') {
            setPlanetProfile(getNextPlanetProfile(planetProfile.id));
        }
    };

    return { setup, display, keyPressed };
};
