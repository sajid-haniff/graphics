// /src/demo/arcade/asteroids-demo.js
// Main composer: sets up world->device (M2D), spawns entities, runs update/draw, collisions, waves.
// Uses V for vectors, M2D for affine, preserves inverted-Y via composite (ship forward uses -rotDeg inside ship).

import { createGraphicsContext2 } from '../../graphics_context2';
import { V } from '../../lib/esm/V';
import { M2D } from '../../lib/esm/M2D';

import { makePixelToWorld, wrap, randRange, colorA } from './utils';
import { drawGradientBG, drawLaserGrid } from './background';
import { neonDot } from './neon';
import { PALETTES } from './palettes';

import { createAsteroid, spawnField } from './asteroid';
import { createBurst } from './burst';
import { createBullet } from './bullet';
import { createShip } from './ship';

export const createAsteroidsDemo = (sk, CANVAS_WIDTH = 1024, CANVAS_HEIGHT = 768) => {
    // ---- World (Y-up) & View ----
    const win = { left: -10, right: 10, bottom: -10, top: 10 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // ---- Build composite world->device (reflect Y then device scale then world->NDC) ----
    const REFLECT = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE  = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD   = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const WORLD_TO_DEVICE = M2D.multiply(M2D.multiply(REFLECT, DEVICE), WORLD);

    // Pixel-to-world helper (consistent stroke sizes)
    const pixelToWorld = makePixelToWorld(WORLD_TO_DEVICE);

    // ---- Theme (keep constant during this refactor step) ----
    const THEME = PALETTES[Math.floor(Math.random() * PALETTES.length)];

    // ---- Game state ----
    let score = 0;
    let lives = 3;
    let wave = 1;
    let gameOver = false;

    // ---- Entities ----
    const asteroids = [];
    const bullets = [];
    const bursts = [];

    // ---- Ship ----
    const ship = createShip(sk, THEME, pixelToWorld, win, bullets, bursts, () => gameOver, () => {
        lives -= 1;
        if (lives <= 0) gameOver = true;
    });

    // ---- Scoring curve ----
    const scoreForRadius = (r) => (r >= 1.6 ? 20 : (r >= 1.0 ? 50 : 100));

    // ---- Asteroid split helper (uses V) ----
    // ---- Asteroid split helper (uses V.rotate / V.length) ----
    const splitAsteroid = (a) => {
        const newR = a.radius * 0.5;

        // 1) Score + VFX
        score += scoreForRadius(a.radius);
        bursts.push(createBurst(sk, a.position, THEME.burst, pixelToWorld));

        // 2) Stop if fragments would be too small
        if (newR < 0.6) return;

        // 3) Derive child velocities from parent momentum (Y-up)
        const baseSpeed = Math.max(V.length(a.velocity), 0.045);
        const spreadDeg = 22;
        const spreadRad = sk.radians(spreadDeg);

        // Rotate parent velocity by ±spread (returns new vectors)
        const v1 = V.rotate(a.velocity, +spreadRad);
        const v2 = V.rotate(a.velocity, -spreadRad);

        // Normalize and scale with slight variance; keep a speed floor
        const s1 = baseSpeed * (0.9 + Math.random() * 0.3);
        const s2 = baseSpeed * (0.9 + Math.random() * 0.3);
        const child1Vel = V.scale(V.normalize(v1), s1);
        const child2Vel = V.scale(V.normalize(v2), s2);

        // 4) Spawn children at parent position
        asteroids.push(createAsteroid(sk, V.clone(a.position), newR, child1Vel, THEME, pixelToWorld, win));
        asteroids.push(createAsteroid(sk, V.clone(a.position), newR, child2Vel, THEME, pixelToWorld, win));
    };


    // ---- Reset / spawn ----
    const resetGame = () => {
        score = 0;
        lives = 3;
        wave = 1;
        gameOver = false;
        asteroids.length = 0;
        bullets.length = 0;
        bursts.length = 0;
        spawnField(sk, asteroids, 4, THEME, pixelToWorld, win);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            resetGame();

            sk.keyPressed = () => {
                if (sk.key === 'r' || sk.key === 'R') resetGame();
            };
        },

        display() {
            // Device-space background
            sk.background(0);
            drawGradientBG(sk, CANVAS_WIDTH, CANVAS_HEIGHT, THEME);

            // Apply world transform (includes inverted Y)
            sk.resetMatrix();
            const args = M2D.toArgs(WORLD_TO_DEVICE);
            sk.applyMatrix(args[0], args[1], args[2], args[3], args[4], args[5]);

            // Optional world-space grid
            drawLaserGrid(sk, win, THEME, pixelToWorld);

            // Update ship
            const thrusting = ship.update();

            // Update bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].update();
                if (bullets[i].dead()) bullets.splice(i, 1);
            }

            // Update asteroids
            for (let i = 0; i < asteroids.length; i++) asteroids[i].update();

            // Update bursts
            for (let i = bursts.length - 1; i >= 0; i--) {
                bursts[i].update();
                if (bursts[i].dead()) bursts.splice(i, 1);
            }

            // Bullet ↔ asteroid collisions (circle vs circle approx)
            const bulletR = pixelToWorld(3);
            for (let bi = bullets.length - 1; bi >= 0; bi--) {
                const b = bullets[bi];
                let hit = false;
                for (let ai = asteroids.length - 1; ai >= 0 && !hit; ai--) {
                    const a = asteroids[ai];
                    const dx = b.position[0] - a.position[0];
                    const dy = b.position[1] - a.position[1];
                    const rr = a.radius + bulletR;
                    if (dx*dx + dy*dy <= rr*rr) {
                        bullets.splice(bi, 1);
                        const parent = asteroids.splice(ai, 1)[0];
                        splitAsteroid(parent);
                        hit = true;
                    }
                }
            }

            // Ship ↔ asteroid collisions (if not invulnerable)
            if (!ship.invulnerable()) {
                const spos = ship.pos();
                const sr = ship.radius();
                for (let i = 0; i < asteroids.length; i++) {
                    const a = asteroids[i];
                    const dx = spos[0] - a.position[0];
                    const dy = spos[1] - a.position[1];
                    const rr = sr + a.radius;
                    if (dx*dx + dy*dy <= rr*rr) {
                        ship.explode();
                        break;
                    }
                }
            }

            // Waves (theme constant in this step)
            if (!gameOver && asteroids.length === 0) {
                wave += 1;
                spawnField(sk, asteroids, 3 + wave, THEME, pixelToWorld, win);
            }

            // Draw in world space
            for (let i = 0; i < asteroids.length; i++) asteroids[i].draw();
            for (let i = 0; i < bursts.length; i++) bursts[i].draw();
            for (let i = 0; i < bullets.length; i++) bullets[i].draw();
            ship.draw(thrusting);

            // HUD (device space)
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
