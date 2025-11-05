// ============================================================================
// Asteroids demo — Quadtree + CameraShake + Exhaust + Starfield + UFO + Swarm
// Factory/closure style; p5 api via `sk`; world is Y-up.
// ============================================================================

import { createGraphicsContext2 } from '../../graphics_context2';
import { V } from '../../lib/esm/V';
import { M2D } from '../../lib/esm/M2D';

import { createHowlerSFX } from '../../lib/esm/sfx-howler';
import { SFX_FILES } from './sfx-map';

import { makePixelToWorld, circleOverlaps, makeWorldBounds } from './utils';
import { drawGradientBG, drawLaserGrid } from './background';
import { PALETTES } from './palettes';

import { createAsteroid, spawnField } from './asteroid';
import { createBurst } from './burst';
import { createQuadtree } from '../../lib/esm/quadtree';
import { createShip } from './ship';

// New systems / enemies
import { createCameraShake } from './camera-shake';
import { createExhaust } from './exhaust';
import { createStarfield } from './starfield';
import { createUFO } from './ufo';
import { createSwarm } from './swarm';
import { createBullet } from './bullet';

export const createAsteroidsDemo = (sk, CANVAS_WIDTH = 1024, CANVAS_HEIGHT = 768) => {
    // ---------- View + matrices ----------
    const win  = { left: -30, right: 30, bottom: -18, top: 18 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const COMPOSITE = M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);

    const pixelToWorld = makePixelToWorld(COMPOSITE);
    const worldToPixel = (wu) => wu / pixelToWorld(1);

    // ---------- Helpers ----------
    const toXY = (p) => (Array.isArray(p) || typeof p?.length === 'number') ? [p[0], p[1]] : [p.x, p.y];
    const scoreForRadius = (r) => (r >= 2.4 ? 20 : r >= 1.2 ? 50 : 100);
    const pickTheme = (name = 'Synthwave') => {
        const p = PALETTES.find(x => x.name.toLowerCase() === name.toLowerCase()) || PALETTES[0];
        return { bg1: p.bgTop, bg2: p.bgBot, ship: p.ship, asteroid: p.asteroid, bullet: p.bullet, burst: p.burst, hud: p.hud, afterburn: p.burst, thrust: p.burst };
    };

    // ---------- Game state ----------
    //const THEME = pickTheme('Synthwave');
    const THEME = PALETTES?.neon ?? {
        bg1: '#05070c', bg2: '#0a1030',
        asteroid: '#A0F',
        ship: '#8FE',
        bullet: '#7DF'
    };

    const bullets   = [];
    const asteroids = [];
    const bursts    = [];
    let ship        = null;
    let score       = 0;
    let paused      = false;

    // Quadtree
    const WORLD_BOUNDS = makeWorldBounds(win, 200);
    const qt = createQuadtree(WORLD_BOUNDS, { capacity: 8, maxDepth: 8 });
    let showQT = false;
    let timescale = 1.0; // '[' slows, ']' speeds (optional)

    // Audio
    let SFX = null;

    // Camera shake / exhaust / starfield
    let shake    = null;
    let exhaust  = null;
    let starfield = null;

    // Enemies
    let ufo = null;
    let nextUfoTimer = 6.0;        // seconds
    let ufoAliveTime = 0;

    let swarms = [];
    let nextSwarmTimer = 9.0;      // seconds

    // ---------- Setup ----------
    const setup = () => {
        sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        sk.frameRate?.(60);

        // focus + prevent Space scroll
        const canvas = sk._renderer?.canvas || sk.canvas;
        if (canvas) {
            canvas.tabIndex = 0;
            canvas.focus();
            canvas.addEventListener('keydown', (e) => { if (e.code === 'Space') e.preventDefault(); }, { passive: false });
        }

        // Audio
        SFX = createHowlerSFX('/assets/');
        SFX.loadMap(SFX_FILES);
        SFX.resumeOnFirstGesture();

        // Systems
        shake = createCameraShake(sk);
        exhaust = createExhaust(sk, THEME, pixelToWorld);
        starfield = createStarfield(sk, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Ship
        ship = createShip(
            sk, THEME, pixelToWorld, win,
            bullets, bursts,
            () => false,
            () => { shake?.kick(12, 0.35); },
            SFX,
            exhaust
        );

        // Asteroids
        asteroids.length = 0;
        spawnField(sk, asteroids, 10, THEME, pixelToWorld, win);
    };

    // ---------- Quadtree helpers ----------
    const insertCircle = (ent, posGetter, rGetter) => {
        if (!ent) return;
        const pos = posGetter(ent);
        const [x, y] = toXY(pos);
        const r = rGetter(ent);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
        qt.insert(ent, { cx: x, cy: y, r });
    };

    const rebuildQuadtree = () => {
        qt.clear();
        for (const a of asteroids) insertCircle(a, (e) => e.position, (e) => e.radius);
        for (const b of bullets)   insertCircle(b, (e) => e.position, (e) => e.radius);
        if (ship) insertCircle(ship, () => ship.pos(), () => ship.radius());
        if (ufo)  insertCircle(ufo,  (e) => e.position, (e) => e.radius);
        for (const sw of swarms) for (const m of sw.members) insertCircle(m, (e)=>e.pos, (e)=>e.r);
    };

    const emitAlienBullet = (originV, dirV, speedWU = 0.5, lifeFrames = 100) => {
        const b = createBullet(sk, originV, dirV, THEME, pixelToWorld, win, speedWU, lifeFrames);
        b.alien = true; // tag if you want to treat differently
        bullets.push(b);
    };

    // ---------- Update ----------
    const update = (dt) => {
        if (paused) return;

        // Asteroids
        for (const a of asteroids) a.update?.(dt);

        // Bullets
        for (const b of bullets) b.update?.(dt, win);
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            if (b.alive === false) { bullets.splice(i, 1); continue; }
            if (typeof b.ttl === 'number' && b.ttl <= 0) { bullets.splice(i, 1); continue; }
        }

        // Ship
        const thrusting = ship?.update?.() ?? false;

        // Spawns
        nextUfoTimer   -= dt;
        //nextSwarmTimer -= dt;

        if (!ufo && nextUfoTimer <= 0) {
            ufo = createUFO(sk, THEME, pixelToWorld, win, SFX, () => ship?.pos?.(), { small: Math.random() < 0.99 });
            ufoAliveTime = 0;
            nextUfoTimer = 12 + Math.random()*8;
        }
       // if (nextSwarmTimer <= 0) {
       //     swarms.push(createSwarm(sk, THEME, pixelToWorld, win, 4 + Math.floor(Math.random()*3)));
       //     nextSwarmTimer = 14 + Math.random()*10;
       // }

        // UFO
        if (ufo) {
            ufoAliveTime += dt;
            const alive = ufo.update();
            if (!alive || ufoAliveTime > 18) { ufo.destroy?.(); ufo = null; }
            else ufo.tryFire((o, d, sp, life) => emitAlienBullet(o, d, sp, life));
        }

        // Swarms
        for (const sw of swarms) sw.update(() => ship?.pos?.());
        swarms = swarms.filter(sw => sw.members.length > 0);

        // Index
        rebuildQuadtree();

        // Collisions: bullets ↔ asteroids
        const deadBullets = new Set();
        const deadAsteroids = new Set();

        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            const [bx, by] = toXY(b.position);
            const bc = { cx: bx, cy: by, r: b.radius };
            const candidates = qt.queryCircle(bc);
            for (const other of candidates) {
                if (other === b) continue;
                // skip ship / non-circular imposters
                if (!('radius' in other) || !('position' in other)) continue;
                const [ox, oy] = toXY(other.position);
                const ac = { cx: ox, cy: oy, r: other.radius };
                if (circleOverlaps(bc, ac)) {
                    // if 'other' is asteroid object (has verts), mark asteroid; otherwise might be UFO/swarm member
                    if (other.verts) {
                        deadBullets.add(b);
                        deadAsteroids.add(other);
                    }
                }
            }
        }

        if (deadBullets.size || deadAsteroids.size) {
            if (deadBullets.size) {
                const keep = [];
                for (const b of bullets) if (!deadBullets.has(b)) keep.push(b);
                bullets.splice(0, bullets.length, ...keep);
            }
            if (deadAsteroids.size) {
                const keepA = [];
                for (const a of asteroids) {
                    if (!deadAsteroids.has(a)) { keepA.push(a); continue; }
                    score += scoreForRadius(a.radius);
                    bursts.push(createBurst(sk, a.position, THEME, pixelToWorld));
                    SFX.playRandom?.(['explode1','explode2','explode3']);
                    shake?.kick(6, 0.18);

                    const newR = a.radius * 0.6;
                    if (newR < 0.6) continue;

                    const spread = sk.radians(22);
                    const rot = (vx, vy, ang) => { const s=Math.sin(ang), c=Math.cos(ang); return [vx*c - vy*s, vx*s + vy*c]; };
                    const vlen = Math.hypot(a.velocity[0], a.velocity[1]);
                    const baseSpeed = Math.max(vlen, 0.045);

                    const v1n = rot(a.velocity[0], a.velocity[1], +spread);
                    const v2n = rot(a.velocity[0], a.velocity[1], -spread);
                    const v1 = V.scale(V.normalize(V.create(v1n[0], v1n[1])), baseSpeed * (0.9 + Math.random()*0.3));
                    const v2 = V.scale(V.normalize(V.create(v2n[0], v2n[1])), baseSpeed * (0.9 + Math.random()*0.3));

                    keepA.push(createAsteroid(sk, V.clone(a.position), newR, v1, THEME, pixelToWorld, win));
                    keepA.push(createAsteroid(sk, V.clone(a.position), newR, v2, THEME, pixelToWorld, win));
                }
                asteroids.splice(0, asteroids.length, ...keepA);
            }
            rebuildQuadtree();
        }

        // Collisions: bullets ↔ UFO
        if (ufo) {
            const uc = { cx: ufo.position[0], cy: ufo.position[1], r: ufo.radius() };
            for (const b of bullets) {
                if (b.alien) continue;
                const bc = { cx: b.position[0], cy: b.position[1], r: b.radius };
                if (circleOverlaps(bc, uc)) {
                    bursts.push(createBurst(sk, ufo.position, THEME, pixelToWorld));
                    SFX.playRandom?.(['explode1','explode2','explode3']);
                    score += ufo.small ? 1000 : 200;
                    ufo.destroy?.(); ufo = null;
                    b.alive = false;
                    shake?.kick?.(7, 0.22);
                    break;
                }
            }
        }

        // Collisions: bullets ↔ Swarm members
        for (const sw of swarms) {
            outer:
                for (let i = 0; i < sw.members.length; i++) {
                    const m = sw.members[i];
                    const mc = { cx: m.pos[0], cy: m.pos[1], r: m.r };
                    for (const b of bullets) {
                        if (b.alien) continue;
                        const bc = { cx: b.position[0], cy: b.position[1], r: b.radius };
                        if (circleOverlaps(bc, mc)) {
                            bursts.push(createBurst(sk, m.pos, THEME, pixelToWorld));
                            SFX.playRandom?.(['explode1','explode2','explode3']);
                            score += 50;
                            b.alive = false;
                            sw.members.splice(i, 1); i--;
                            shake?.kick?.(5, 0.12);
                            continue outer;
                        }
                    }
                }
        }

        // Collisions: ship ↔ asteroids
        if (ship && !ship.invulnerable?.()) {
            const [sx, sy] = toXY(ship.pos());
            const sc = { cx: sx, cy: sy, r: ship.radius() };
            const near = qt.queryCircle(sc);
            for (const a of near) {
                if (!('radius' in a) || !('position' in a)) continue;
                const [ax, ay] = toXY(a.position);
                const ac = { cx: ax, cy: ay, r: a.radius };
                if (circleOverlaps(sc, ac)) { ship.explode?.(); break; }
            }
        }

        // Collisions: ship ↔ UFO
        if (ship && ufo && !ship.invulnerable?.()) {
            const sc = { cx: ship.pos()[0], cy: ship.pos()[1], r: ship.radius() };
            const uc = { cx: ufo.position[0], cy: ufo.position[1], r: ufo.radius() };
            if (circleOverlaps(sc, uc)) ship.explode?.();
        }

        // Collisions: ship ↔ swarm
        if (ship && !ship.invulnerable?.()) {
            const sc = { cx: ship.pos()[0], cy: ship.pos()[1], r: ship.radius() };
            for (const sw of swarms) {
                for (const m of sw.members) {
                    const mc = { cx: m.pos[0], cy: m.pos[1], r: m.r };
                    if (circleOverlaps(sc, mc)) { ship.explode?.(); break; }
                }
            }
        }

        // VFX
        for (const fx of bursts) fx.update?.(dt);

        // Exhaust
        exhaust?.update(dt);

        // Camera shake (speed-reactive)
        update._lastPos = update._lastPos || null;
        let velWU = [0, 0];
        if (ship && ship.pos) {
            const cur = ship.pos();
            if (update._lastPos) {
                velWU = [cur[0] - update._lastPos[0], cur[1] - update._lastPos[1]];
                const spdPx = Math.min(8, Math.hypot(velWU[0], velWU[1]) * 6);
                shake?.setContinuous(spdPx * 0.35);
            }
            update._lastPos = [cur[0], cur[1]];
        }

        // Starfield parallax
        starfield?.update(dt, velWU, (wu) => worldToPixel(wu));

        // Shake step
        shake?.update(dt);

        update._thrusting = thrusting;
    };

    // ---------- Display ----------
    const display = () => {
        const dt = (typeof sk.deltaTime === 'number' ? sk.deltaTime : 16.6667) / 1000;
        update(dt);

        sk.background(0);

        // Device-space gradient
        sk.resetMatrix();
        //drawGradientBG(sk, CANVAS_WIDTH, CANVAS_HEIGHT, THEME.bg1, THEME.bg2);

        // Device-space starfield with camera shake
        const [dx, dy] = shake ? shake.offset() : [0, 0];
        sk.push();
        sk.translate(dx, dy);
        starfield?.draw();
        sk.pop();

        // World-space (also shaken in device space)
        sk.resetMatrix();
        sk.translate(dx, dy);
        sk.applyMatrix(...M2D.toArgs(COMPOSITE));

        //drawLaserGrid(sk, win, pixelToWorld);

        // Asteroids
        sk.noFill();
        sk.stroke(255);
        sk.strokeWeight(pixelToWorld(1.5));
        for (const a of asteroids) a.draw?.();

        // Exhaust (under ship)
        exhaust?.draw();

        // Ship
        ship?.draw?.(update._thrusting === true);

        // Bullets
        for (const b of bullets) b.draw?.(sk);

        // Enemies
        ufo?.draw?.();
        for (const sw of swarms) sw.draw?.();

        // Quadtree debug
        if (showQT && qt.debugDraw) qt.debugDraw(sk, pixelToWorld(1));

        // HUD
        sk.resetMatrix();
        sk.fill(255);
        sk.textSize(14);
        sk.text(`Score: ${score}`, 10, 20);
        sk.text(`Bullets: ${bullets.length}  Asteroids: ${asteroids.length}`, 10, 40);
        sk.text(`QT depth: 8 cap: 8  (Q to toggle)`, 10, 60);
    };

    // ---------- Input ----------
    const keyPressed = () => {
        const k = sk.key?.toLowerCase?.();
        if (k === 'p') paused = !paused;
        if (k === 'q') showQT = !showQT;
    };

    return { setup, display, update, keyPressed };
};
