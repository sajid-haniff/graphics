// /src/demo/arcade/asteroids-demo.js
// Adds Quadtree broad-phase: createQuadtree → insert → retrieve → precise checks.

import { createGraphicsContext2 } from '../../graphics_context2';
import { V } from '../../lib/esm/V';
import { M2D } from '../../lib/esm/M2D';

import { createHowlerSFX } from '../../lib/esm/sfx-howler';
import { SFX_FILES } from './sfx-map';

import { makePixelToWorld, colorA } from './utils';
import { drawGradientBG, drawLaserGrid } from './background';
import { PALETTES } from './palettes';

import { createAsteroid, spawnField } from './asteroid';
import { createBurst } from './burst';
import { createBullet } from './bullet';
import { createShip } from './ship';

// 🔳 Quadtree
import { createQuadtree, intersects, drawQuadtree } from '../../lib/esm/quadtree';

export const createAsteroidsDemo = (sk, CANVAS_WIDTH = 1024, CANVAS_HEIGHT = 768) => {
    let SFX = null;

    // ---- World (Y-up) & View ----
    const win  = { left: -10, right: 10, bottom: -10, top: 10 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // ---- Composite (reflect Y → device → world) ----
    const REFLECT = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE  = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD   = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const WORLD_TO_DEVICE = M2D.multiply(M2D.multiply(REFLECT, DEVICE), WORLD);

    const pixelToWorld = makePixelToWorld(WORLD_TO_DEVICE);

    // ---- Theme ----
    const THEME = PALETTES[Math.floor(Math.random() * PALETTES.length)];

    // ---- Game state ----
    let score = 0, lives = 3, wave = 1, gameOver = false;

    // ---- Entities ----
    const asteroids = [];
    const bullets = [];
    const bursts  = [];
    let ship;

    // ---- Quadtree setup ----
    // Tree bounds from world window (Y-up friendly; quadtree doesn’t care).
    const QT_BOUNDS = { x: win.left, y: win.bottom, width: win.right - win.left, height: win.top - win.bottom };
    const qt = createQuadtree(QT_BOUNDS, 8, 6);
    const TMP = []; // reusable buffer for retrieve()
    let showQT = false;

    // ---- Scoring curve ----
    const scoreForRadius = (r) => (r >= 1.6 ? 20 : (r >= 1.0 ? 50 : 100));

    // ---- AABB helpers (world space) ----
    const aabbCircle = (cx, cy, r) => ({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 });
    const aabbAsteroid = (a) => aabbCircle(a.position[0], a.position[1], a.radius);
    const aabbBullet   = (b, r) => aabbCircle(b.position[0], b.position[1], r);
    const aabbShip     = (s) => aabbCircle(s.pos()[0], s.pos()[1], s.radius());

    // ---- Asteroid split (with SFX) ----
    const splitAsteroid = (a) => {
        const newR = a.radius * 0.5;

        // Score + VFX
        score += scoreForRadius(a.radius);
        bursts.push(createBurst(sk, a.position, THEME.burst, pixelToWorld));
        SFX?.playRandom(['explode1','explode2','explode3'], { volume: 0.8 });

        // Stop if tiny
        if (newR < 0.6) return;

        // Momentum → fragments
        const baseSpeed = Math.max(V.length(a.velocity), 0.045);
        const spreadRad = sk.radians(22);

        const v1 = V.scale(V.normalize(V.rotate(a.velocity, +spreadRad)), baseSpeed * (0.9 + Math.random() * 0.3));
        const v2 = V.scale(V.normalize(V.rotate(a.velocity, -spreadRad)), baseSpeed * (0.9 + Math.random() * 0.3));

        asteroids.push(createAsteroid(sk, V.clone(a.position), newR, v1, THEME, pixelToWorld, win));
        asteroids.push(createAsteroid(sk, V.clone(a.position), newR, v2, THEME, pixelToWorld, win));
    };

    // ---- Reset / spawn ----
    const resetGame = () => {
        score = 0; lives = 3; wave = 1; gameOver = false;
        asteroids.length = 0; bullets.length = 0; bursts.length = 0;
        spawnField(sk, asteroids, 4, THEME, pixelToWorld, win);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

            // Audio FIRST so it exists for early booms
            SFX = createHowlerSFX('./assets/');
            SFX.loadMap(SFX_FILES);
            SFX.resumeOnFirstGesture();
            SFX.on();

            resetGame();

            ship = createShip(
                sk, THEME, pixelToWorld, win, bullets, bursts,
                () => gameOver,
                () => { lives -= 1; if (lives <= 0) gameOver = true; },
                SFX
            );

            sk.keyPressed = () => {
                if (sk.key === 'r' || sk.key === 'R') resetGame();
                if (sk.key === 'q' || sk.key === 'Q') showQT = !showQT; // toggle quadtree debug
            };
        },

        display() {
            // Device-space background
            sk.background(0);
            drawGradientBG(sk, CANVAS_WIDTH, CANVAS_HEIGHT, THEME);

            // World-space (apply composite)
            sk.resetMatrix();
            sk.applyMatrix(...M2D.toArgs(WORLD_TO_DEVICE));

            drawLaserGrid(sk, win, THEME, pixelToWorld);

            // Update
            const thrusting = ship.update();
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].update();
                if (bullets[i].dead()) bullets.splice(i, 1);
            }
            for (let i = 0; i < asteroids.length; i++) asteroids[i].update();
            for (let i = bursts.length - 1; i >= 0; i--) {
                bursts[i].update();
                if (bursts[i].dead()) bursts.splice(i, 1);
            }

            // ----------------------------
            // QUADTREE BROAD-PHASE
            // ----------------------------
            qt.clear();

            // Insert targets (asteroids) into tree
            for (let i = 0; i < asteroids.length; i++) {
                asteroids[i]._aabb = aabbAsteroid(asteroids[i]); // cache for debug if needed
                qt.insert(asteroids[i]._aabb);
                // Store back-reference to entity for retrieval narrowing
                asteroids[i]._ref = asteroids[i];
            }

            // Bullet ↔ asteroid via QT → candidates → precise circle
            const bulletR = pixelToWorld(3);
            for (let bi = bullets.length - 1; bi >= 0; bi--) {
                const b = bullets[bi];
                const bAABB = aabbBullet(b, bulletR);

                TMP.length = 0;
                const candidates = qt.retrieve(bAABB, TMP);
                let hitIndex = -1;

                for (let ci = 0; ci < candidates.length; ci++) {
                    const aabb = candidates[ci];
                    // quick reject by AABB
                    if (!intersects(bAABB, aabb)) continue;

                    // map aabb → actual asteroid entity (we cached same object)
                    const a = aabb.__entity || aabb._ref || asteroids.find(x => x._aabb === aabb) || null;
                    if (!a) continue;

                    // precise circle vs circle
                    const dx = b.position[0] - a.position[0];
                    const dy = b.position[1] - a.position[1];
                    const rr = a.radius + bulletR;
                    if (dx * dx + dy * dy <= rr * rr) {
                        hitIndex = asteroids.indexOf(a);
                        break;
                    }
                }

                if (hitIndex >= 0) {
                    bullets.splice(bi, 1);
                    const parent = asteroids.splice(hitIndex, 1)[0];
                    splitAsteroid(parent);
                }
            }

            // Ship ↔ asteroid via QT
            if (!ship.invulnerable() && !gameOver) {
                const sAABB = aabbShip(ship);
                TMP.length = 0;
                const candidates = qt.retrieve(sAABB, TMP);
                const spos = ship.pos();
                const sr = ship.radius();

                let collided = false;
                for (let ci = 0; ci < candidates.length && !collided; ci++) {
                    const aabb = candidates[ci];
                    if (!intersects(sAABB, aabb)) continue;
                    const a = aabb.__entity || aabb._ref || asteroids.find(x => x._aabb === aabb) || null;
                    if (!a) continue;

                    const dx = spos[0] - a.position[0];
                    const dy = spos[1] - a.position[1];
                    const rr = sr + a.radius;
                    if (dx * dx + dy * dy <= rr * rr) {
                        ship.explode();
                        collided = true;
                    }
                }
            }

            // Waves
            if (!gameOver && asteroids.length === 0) {
                wave += 1;
                spawnField(sk, asteroids, 3 + wave, THEME, pixelToWorld, win);
            }

            // Draw world
            for (let i = 0; i < asteroids.length; i++) asteroids[i].draw();
            for (let i = 0; i < bursts.length; i++)   bursts[i].draw();
            for (let i = 0; i < bullets.length; i++)  bullets[i].draw();
            ship.draw(thrusting);

            // Optional quadtree debug
            if (showQT) drawQuadtree(sk, qt, pixelToWorld(1), '#00FF88');

            // HUD (device-space)
            sk.resetMatrix();
            sk.fill(THEME.hud);
            sk.noStroke();
            sk.textAlign(sk.LEFT, sk.TOP);
            sk.textSize(16);
            sk.text(`Score: ${score}`, 12, 10);
            sk.text(`Lives: ${lives}`, 12, 32);
            sk.text(`Wave: ${wave}`, 12, 54);

            if (gameOver) {
                sk.textAlign(sk.CENTER, sk.CENTER);
                sk.textSize(28);
                sk.fill(THEME.hud);
                sk.text('GAME OVER', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 18);
                sk.textSize(16);
                sk.fill(colorA(sk, THEME.hud, 200));
                sk.text('Press R to restart', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 12);
            }
        }
    };
};
