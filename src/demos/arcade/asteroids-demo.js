// ============================================================================
// Asteroids demo with Quadtree broad-phase
// SOUND FIX: use your closure-style createHowlerSFX(basePath).loadMap(SFX_FILES)
//            and resumeOnFirstGesture() to reliably unlock audio.
// Also keeps bullets firing + quadtree collisions + per-frame update.
// ============================================================================

import { createGraphicsContext2 } from '../../graphics_context2';
import { V } from '../../lib/esm/V';
import { M2D } from '../../lib/esm/M2D';

import { createHowlerSFX } from '../../lib/esm/sfx-howler';   // ← use your wrapper here
import { SFX_FILES } from './sfx-map';

import { makePixelToWorld, circleOverlaps, makeWorldBounds } from './utils';
import { drawGradientBG, drawLaserGrid } from './background';
import { PALETTES } from './palettes';

import { createAsteroid, spawnField } from './asteroid';
import { createBurst } from './burst';
import { createQuadtree } from '../../lib/esm/quadtree';
import { createShip } from './ship';

export const createAsteroidsDemo = (sk, CANVAS_WIDTH = 1024, CANVAS_HEIGHT = 768) => {
    // ---------------- View + matrices ----------------
    const win  = { left: -30, right: 30, bottom: -18, top: 18 };   // world (Y-up)
    const view = { left: 0, right: 1, bottom: 0, top: 1 };         // normalized device

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const COMPOSITE = M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);

    const pixelToWorld = makePixelToWorld(COMPOSITE);

    // ---------------- Helpers ----------------
    const toXY = (p) => (Array.isArray(p) || typeof p?.length === 'number') ? [p[0], p[1]] : [p.x, p.y];
    const scoreForRadius = (r) => (r >= 2.4 ? 20 : r >= 1.2 ? 50 : 100);

    // ---------------- Game state ----------------
    const THEME = PALETTES?.neon ?? {
        bg1:'#05070c', bg2:'#0a1030',
        asteroid: '#A0F',
        ship: '#8FE',
        bullet: '#7DF'
    };
    const bullets = [];  // ship pushes bullets here
    const asteroids = [];
    const bursts = [];
    let ship = null;
    let score = 0;
    let paused = false;

    // 🔳 Quadtree
    const WORLD_BOUNDS = makeWorldBounds(win, 200);
    const qt = createQuadtree(WORLD_BOUNDS, { capacity: 8, maxDepth: 8 });
    let showQT = false;

    // ---------------- Sound (your wrapper) ----------------
    let SFX = null;

    // ---------------- Setup ----------------
    const setup = () => {
        sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        sk.frameRate?.(60);

        // Canvas focus for keyboard + prevent page scroll on Space
        const canvas = sk._renderer?.canvas || sk.canvas;
        if (canvas) {
            canvas.tabIndex = 0;
            canvas.focus();
            canvas.addEventListener('keydown', (e) => {
                if (e.code === 'Space') e.preventDefault();
            }, { passive: false });
        }

        // Init SFX and load your map, then arm the unlock on first gesture
        SFX = createHowlerSFX('/assets/');
        SFX.loadMap(SFX_FILES);
        SFX.resumeOnFirstGesture();

        // Ship: (sk, THEME, pixelToWorld, win, bullets, bursts, isGameOver, onDeath, sfx)
        ship = createShip(
            sk, THEME, pixelToWorld, win,
            bullets, bursts,
            () => false,     // isGameOver
            () => {},        // onDeath
            SFX              // your SFX wrapper instance
        );

        // Field
        asteroids.length = 0;
        spawnField(sk, asteroids, 10, THEME, pixelToWorld, win);
    };

    // ---------------- Broad-phase helpers ----------------
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
    };

    // ---------------- Update ----------------
    const update = (dt) => {
        if (paused) return;

        // Asteroids
        for (const a of asteroids) a.update?.(dt);

        // Bullets (factory update manages movement/ttl)
        for (const b of bullets) b.update?.(dt, win);
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            if (b.alive === false) { bullets.splice(i, 1); continue; }
            if (typeof b.ttl === 'number' && b.ttl <= 0) { bullets.splice(i, 1); continue; }
        }

        // Ship handles input + firing + thrust sound; returns `thrusting`
        const thrusting = ship?.update?.() ?? false;

        // Index for collisions
        rebuildQuadtree();

        // --- Collisions: bullets ↔ asteroids (skip ship; only asteroids) ---
        const deadBullets = new Set();
        const deadAsteroids = new Set();

        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            const [bx, by] = toXY(b.position);
            const bc = { cx: bx, cy: by, r: b.radius };
            const candidates = qt.queryCircle(bc);
            for (const other of candidates) {
                if (other === b) continue;                 // itself
                if (other === ship) continue;              // skip ship
                // Only consider real asteroids (they have a procedural outline array)
                if (!other || !Array.isArray(other.verts)) continue;

                const [ox, oy] = toXY(other.position);
                const ac = { cx: ox, cy: oy, r: other.radius };
                if (circleOverlaps(bc, ac)) {
                    deadBullets.add(b);
                    deadAsteroids.add(other);
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

                    const newR = a.radius * 0.6;
                    if (newR < 0.6) continue;

                    // Split velocities
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

        // --- Collisions: ship ↔ asteroids (never bullets) ---
        if (ship && !ship.invulnerable?.()) {
            const [sx, sy] = toXY(ship.pos());
            const sc = { cx: sx, cy: sy, r: ship.radius() };

            const near = qt.queryCircle(sc);
            for (const a of near) {
                // Only asteroids in this pass
                if (!a || !Array.isArray(a.verts)) continue;

                const [ax, ay] = toXY(a.position);
                const ac = { cx: ax, cy: ay, r: a.radius };
                if (circleOverlaps(sc, ac)) {
                    ship.explode?.();
                    break;
                }
            }
        }

        // VFX
        for (const fx of bursts) fx.update?.(dt);

        update._thrusting = thrusting;
    };

    // ---------------- Display (advances sim) ----------------
    const display = () => {
        const dt = (typeof sk.deltaTime === 'number' ? sk.deltaTime : 16.6667) / 1000; // seconds
        update(dt);

        sk.background(0);

        // Device-space background
        sk.resetMatrix();
        drawGradientBG(sk, CANVAS_WIDTH, CANVAS_HEIGHT, THEME.bg1, THEME.bg2);

        // World-space begin
        sk.resetMatrix();
        sk.applyMatrix(...M2D.toArgs(COMPOSITE));

        drawLaserGrid(sk, win, pixelToWorld);

        // Asteroids
        sk.noFill();
        sk.stroke(255);
        sk.strokeWeight(pixelToWorld(1.5));
        for (const a of asteroids) a.draw?.();

        // Ship (pass thrusting flag)
        ship?.draw?.(update._thrusting === true);

        // Bullets
        for (const b of bullets) b.draw?.(sk);

        // Optional: quadtree debug
        if (showQT && qt.debugDraw) qt.debugDraw(sk, pixelToWorld(1));

        // World-space end
        sk.resetMatrix();

        // HUD
        sk.fill(255);
        sk.textSize(14);
        sk.text(`Score: ${score}`, 10, 20);
        sk.text(`Bullets: ${bullets.length}  Asteroids: ${asteroids.length}`, 10, 40);
        sk.text(`QT depth: 8 cap: 8  (Q to toggle)`, 10, 60);
    };

    // ---------------- Input ----------------
    const keyPressed = () => {
        const k = sk.key?.toLowerCase?.();
        if (k === 'p') paused = !paused;
        if (k === 'q') showQT = !showQT;
    };

    return { setup, display, update, keyPressed };
};
