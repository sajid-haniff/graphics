import { createGraphicsContext2 } from '../../graphics_context2';
import { buildWorldToDevice, mul2D, makePixelToWorld } from './utils';
import { PALETTES } from './palettes';
import { drawGradientBG, drawLaserGrid } from './background';
import { drawHUD } from './hud';
import { createAsteroid, spawnField } from './asteroid';
import { createShip } from './ship';
import { createBurst } from './burst';

export const createAsteroidsDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 480) => {
    // World (Y-up) — do not change; rendering uses a composite that flips Y.
    const win = { left: -10, right: 10, bottom: -10, top: 10 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // Composite world->device (reflect Y, then device scale, then world->NDC)
    let WORLD_TO_DEVICE = [1, 0, 0, 1, 0, 0];
    let pixelToWorld = () => 1;

    // Theme (neon palette)
    let THEME = PALETTES[0];

    // Game state
    let score = 0;
    let lives = 3;
    let wave = 1;
    let gameOver = false;

    // Entities
    const asteroids = [];
    const bullets = [];
    const bursts = [];

    // Helpers for spawning/splitting (use local closures to avoid import cycles)
    const scoreForRadius = (r) => (r >= 1.6 ? 20 : (r >= 1.0 ? 50 : 100));

    const splitAsteroid = (a) => {
        const newR = a.radius * 0.5;
        score += scoreForRadius(a.radius);
        bursts.push(createBurst(sk, a.position.x, a.position.y, THEME.burst, pixelToWorld));

        if (newR < 0.6) return;
        const baseSpeed = Math.max(a.velocity.mag(), 0.045);
        const spread = 22;

        const rot = (vx, vy, deg) => {
            const rad = sk.radians(deg);
            return { x: vx * Math.cos(rad) - vy * Math.sin(rad), y: vx * Math.sin(rad) + vy * Math.cos(rad) };
        };

        const v1 = rot(a.velocity.x, a.velocity.y, +spread);
        const v2 = rot(a.velocity.x, a.velocity.y, -spread);

        const m1 = Math.hypot(v1.x, v1.y) || 1;
        const m2 = Math.hypot(v2.x, v2.y) || 1;

        const s1 = baseSpeed * (0.9 + Math.random() * 0.3);
        const s2 = baseSpeed * (0.9 + Math.random() * 0.3);

        asteroids.push(createAsteroid(sk, a.position.x, a.position.y, newR, (v1.x / m1) * s1, (v1.y / m1) * s1, THEME, pixelToWorld, win));
        asteroids.push(createAsteroid(sk, a.position.x, a.position.y, newR, (v2.x / m2) * s2, (v2.y / m2) * s2, THEME, pixelToWorld, win));
    };

    // Ship
    const ship = createShip(sk, THEME, pixelToWorld, win, bullets, bursts, () => gameOver, () => {
        lives -= 1;
        if (lives <= 0) gameOver = true;
    });

    const resetGame = () => {
        score = 0;
        lives = 3;
        wave = 1;
        gameOver = false;
        asteroids.length = 0;
        bullets.length = 0;
        bursts.length = 0;
        THEME = PALETTES[Math.floor(Math.random() * PALETTES.length)];
        spawnField(sk, asteroids, 4, THEME, pixelToWorld, win);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            const REFLECT = [1, 0, 0, -1, 0, CANVAS_HEIGHT];
            const DEVICE  = [CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0];
            const WORLD   = [sx, 0, 0, sy, tx, ty];
            WORLD_TO_DEVICE = buildWorldToDevice(mul2D(mul2D(REFLECT, DEVICE), WORLD));

            // pixelToWorld depends on the composite
            pixelToWorld = makePixelToWorld(WORLD_TO_DEVICE);

            resetGame();

            sk.keyPressed = () => {
                if (sk.key === 'r' || sk.key === 'R') resetGame();
            };
        },

        display() {
            // Background (device space)
            sk.background(0);
            drawGradientBG(sk, CANVAS_WIDTH, CANVAS_HEIGHT, THEME);

            // World transform
            sk.resetMatrix();
            sk.applyMatrix(
                WORLD_TO_DEVICE[0], WORLD_TO_DEVICE[1],
                WORLD_TO_DEVICE[2], WORLD_TO_DEVICE[3],
                WORLD_TO_DEVICE[4], WORLD_TO_DEVICE[5]
            );

            // Laser grid (world space, optional)
            drawLaserGrid(sk, win, THEME, pixelToWorld);

            // Update entities
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

            // Bullet ↔ asteroid collisions
            const bulletR = pixelToWorld(3);
            for (let bi = bullets.length - 1; bi >= 0; bi--) {
                const b = bullets[bi];
                let hit = false;
                for (let ai = asteroids.length - 1; ai >= 0 && !hit; ai--) {
                    const a = asteroids[ai];
                    const dx = b.position.x - a.position.x;
                    const dy = b.position.y - a.position.y;
                    const rr = a.radius + bulletR;
                    if (dx*dx + dy*dy <= rr*rr) {
                        bullets.splice(bi, 1);
                        const parent = asteroids.splice(ai, 1)[0];
                        splitAsteroid(parent);
                        hit = true;
                    }
                }
            }

            // Wave progression + theme rotate
            if (!gameOver && asteroids.length === 0) {
                wave += 1;
                const idx = (PALETTES.findIndex(p => p === THEME) + 1) % PALETTES.length;
                THEME = PALETTES[idx];
                spawnField(sk, asteroids, 3 + wave, THEME, pixelToWorld, win);
            }

            // Draw
            for (let i = 0; i < asteroids.length; i++) asteroids[i].draw();
            for (let i = 0; i < bursts.length; i++) bursts[i].draw();
            for (let i = 0; i < bullets.length; i++) bullets[i].draw();
            ship.draw(thrusting);

            // HUD (device space)
            drawHUD(sk, CANVAS_WIDTH, CANVAS_HEIGHT, score, lives, wave, gameOver, THEME);
        }
    };
};
