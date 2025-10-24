import { createGraphicsContext2 } from '../../graphics_context2';

export const createAsteroidsTest = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 480) => {
    // -------- world & view --------
    const win = { left: -10, right: 10, bottom: -10, top: 10 }; // 20x20 world, Y-up
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // ----- matrices -----
    const mul2D = (A, B) => {
        const [a1,b1,c1,d1,e1,f1] = A;
        const [a2,b2,c2,d2,e2,f2] = B;
        return [
            a1*a2 + c1*b2,
            b1*a2 + d1*b2,
            a1*c2 + c1*d2,
            b1*c2 + d1*d2,
            a1*e2 + c1*f2 + e1,
            b1*e2 + d1*f2 + f1
        ];
    };

    let WORLD_TO_DEVICE = [1,0,0,1,0,0];

    // Convert N pixels -> world units (so lines/circles stay ~Npx on screen)
    const pixelToWorld = (px) => {
        const sx = Math.hypot(WORLD_TO_DEVICE[0], WORLD_TO_DEVICE[1]);
        const sy = Math.hypot(WORLD_TO_DEVICE[2], WORLD_TO_DEVICE[3]);
        const s  = (sx + sy) * 0.5;
        return px / s;
    };

    // -------- helpers --------
    const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));
    const randRange = (lo, hi) => lo + Math.random() * (hi - lo);
    const rotateVec = (vx, vy, deg) => {
        const a = sk.radians(deg);
        return { x: vx * Math.cos(a) - vy * Math.sin(a), y: vx * Math.sin(a) + vy * Math.cos(a) };
    };

    // -------- colors / scoring / waves --------
    const COLOR = '#0F0';
    let score = 0;
    let lives = 3;
    let wave = 1;
    let gameOver = false;

    const scoreForRadius = (r) => {
        // world radii: large ~2, medium ~1, small ~0.5
        if (r >= 1.6) return 20;
        if (r >= 1.0) return 50;
        return 100;
    };

    // -------- canonical ship geometry (Y-up, tip points +Y) --------
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
        { x:  0.0,  y: -0.8 }, // small flame
        { x:  0.15, y: -0.5 },
        { x:  0.0,  y: -0.2 },
        { x: -0.15, y: -0.5 },
    ];
    const SHIP_SCALE = 1.0;
    const SHIP_HIT_RADIUS = 0.7 * SHIP_SCALE;

    // -------- entities --------
    const bullets = [];
    const asteroids = [];
    const bursts = [];

    // -------- bursts (nice radial lines) --------
    const spawnBurst = (x, y, color = COLOR, rays = 24, speed = 0.5, life = 30) => {
        const radiusPerTick = speed;
        bursts.push({
            pos: sk.createVector(x, y),
            t: 0,
            life,
            draw() {
                const r1 = this.t * radiusPerTick;
                const r2 = r1 + 0.6;
                sk.push();
                sk.translate(this.pos.x, this.pos.y);
                sk.noFill();
                sk.stroke(color);
                sk.strokeWeight(pixelToWorld(1.25));
                sk.beginShape();
                for (let i = 0; i < rays; i++) {
                    const a = (i / rays) * sk.TWO_PI;
                    const x1 = -Math.sin(a) * r1, y1 = -Math.cos(a) * r1;
                    const x2 = -Math.sin(a) * r2, y2 = -Math.cos(a) * r2;
                    sk.vertex(x1, y1);
                    sk.vertex(x2, y2);
                }
                sk.endShape();
                sk.pop();
            },
            update() { this.t++; },
            dead() { return this.t > this.life; }
        });
    };

    // -------- asteroids --------
    const createAsteroid = (x, y, radius, vx, vy) => {
        const verts = (() => {
            const count = Math.max(8, Math.floor(radius * 7)); // more sides if bigger
            const pts = [];
            for (let i = 0; i < count; i++) {
                const t = (i / count) * sk.TWO_PI;
                const r = radius * (1 + randRange(-0.28, 0.28));
                pts.push({ x: -Math.sin(t) * r, y: -Math.cos(t) * r }); // Y-up
            }
            return pts;
        })();

        const pos = sk.createVector(x, y);
        const vel = sk.createVector(vx, vy);
        let angleDeg = randRange(0, 360);
        const spinDeg = randRange(-1.2, 1.2); // rotation speed

        return {
            radius,
            position: pos,
            velocity: vel,
            verts,
            update() {
                pos.add(vel);
                angleDeg = (angleDeg + spinDeg + 360) % 360;
                pos.x = wrap(pos.x, win.left, win.right);
                pos.y = wrap(pos.y, win.bottom, win.top);
            },
            draw() {
                sk.push();
                sk.translate(pos.x, pos.y);
                sk.rotate(sk.radians(angleDeg));
                sk.noFill();
                sk.stroke(COLOR);
                sk.strokeWeight(pixelToWorld(1.5));
                sk.beginShape();
                for (let i = 0; i < verts.length; i++) {
                    const p = verts[i];
                    sk.vertex(p.x, p.y);
                }
                sk.endShape(sk.CLOSE);
                sk.pop();
            }
        };
    };

    const spawnField = (count) => {
        for (let i = 0; i < count; i++) {
            const r = randRange(1.6, 2.4);
            // keep initial spawn away from center where ship starts
            let x, y;
            do {
                x = randRange(win.left + r, win.right - r);
                y = randRange(win.bottom + r, win.top - r);
            } while (Math.hypot(x - 0, y - 0) < 5); // 5 world units clearance

            const base = randRange(0.02, 0.06);
            const dir = rotateVec(base, 0, randRange(0, 360));
            asteroids.push(createAsteroid(x, y, r, dir.x, dir.y));
        }
    };

    const splitAsteroid = (a) => {
        const newR = a.radius * 0.5;
        score += scoreForRadius(a.radius);
        spawnBurst(a.position.x, a.position.y, COLOR, 24, 0.6, 24);

        if (newR < 0.6) return; // too small to split further

        const baseSpeed = Math.max(a.velocity.mag(), 0.045);
        const spread = 22; // degrees
        const v1 = rotateVec(a.velocity.x, a.velocity.y, +spread);
        const v2 = rotateVec(a.velocity.x, a.velocity.y, -spread);

        const m1 = Math.hypot(v1.x, v1.y) || 1;
        const m2 = Math.hypot(v2.x, v2.y) || 1;
        const s1 = baseSpeed * randRange(0.9, 1.2);
        const s2 = baseSpeed * randRange(0.9, 1.2);

        asteroids.push(createAsteroid(a.position.x, a.position.y, newR, (v1.x / m1) * s1, (v1.y / m1) * s1));
        asteroids.push(createAsteroid(a.position.x, a.position.y, newR, (v2.x / m2) * s2, (v2.y / m2) * s2));
    };

    // -------- ship --------
    const ship = (() => {
        const pos = sk.createVector(0, 0);
        const vel = sk.createVector(0, 0);
        let rotDeg = 0;

        const ROT_SPEED = 3;       // deg/frame
        const THRUST    = 0.02;    // world units/frame^2
        const DAMPING   = 0.985;

        // bullets
        const BULLET_SPEED = 0.5;
        const BULLET_LIFE  = 60;
        const FIRE_COOLDOWN_MS = 220;
        let lastFireMs = 0;

        // safety/invulnerability after death
        let invuln = 0;      // frames remaining
        const INVULN_TIME = 90;

        const forwardVec = () => {
            // 🔑 Negative because we flip Y in world->device
            const a = sk.radians(-rotDeg);
            return sk.createVector(sk.sin(a), sk.cos(a));
        };

        const fire = () => {
            const now = sk.millis();
            if (now - lastFireMs < FIRE_COOLDOWN_MS) return;

            const dir = forwardVec();
            const start = sk.createVector(pos.x + dir.x * (0.9 * SHIP_SCALE), pos.y + dir.y * (0.9 * SHIP_SCALE));

            bullets.push({
                position: start,
                velocity: sk.createVector(dir.x * BULLET_SPEED, dir.y * BULLET_SPEED),
                life: BULLET_LIFE,
                update() {
                    this.position.add(this.velocity);
                    this.life -= 1;
                    this.position.x = wrap(this.position.x, win.left, win.right);
                    this.position.y = wrap(this.position.y, win.bottom, win.top);
                },
                draw() {
                    sk.push();
                    sk.translate(this.position.x, this.position.y);
                    sk.noStroke();
                    sk.fill('#FFF');
                    sk.circle(0, 0, pixelToWorld(6)); // ~6px diameter
                    sk.pop();
                },
                dead() { return this.life <= 0; }
            });

            lastFireMs = now;
        };

        const explode = () => {
            lives -= 1;
            spawnBurst(pos.x, pos.y, '#F44', 36, 0.7, 30);
            // reset to center with invuln and zero speed
            pos.set(0, 0);
            vel.set(0, 0);
            rotDeg = 0;
            invuln = INVULN_TIME;
            if (lives <= 0) gameOver = true;
        };

        const update = () => {
            if (gameOver) return;

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

            // collisions with asteroids (circle vs circle)
            if (invuln > 0) invuln--;
            if (invuln <= 0) {
                for (let i = 0; i < asteroids.length; i++) {
                    const a = asteroids[i];
                    const dx = pos.x - a.position.x;
                    const dy = pos.y - a.position.y;
                    const rr = SHIP_HIT_RADIUS + a.radius;
                    if (dx*dx + dy*dy <= rr*rr) {
                        explode();
                        break;
                    }
                }
            }

            return thrusting;
        };

        const draw = (thrusting) => {
            sk.push();
            sk.translate(pos.x, pos.y);
            sk.rotate(sk.radians(rotDeg));
            sk.noFill();
            // blink while invulnerable
            const alpha = (invuln > 0 && (Math.floor(invuln / 6) % 2 === 0)) ? 60 : 255;
            sk.stroke(COLOR);
            sk.strokeWeight(pixelToWorld(1.6));
            sk.beginShape();
            const pts = thrusting ? SHIP_POINTS_THRUST : SHIP_POINTS_IDLE;
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                sk.vertex(p.x * SHIP_SCALE, p.y * SHIP_SCALE);
            }
            sk.endShape(sk.CLOSE);

            // optional hit radius debug:
            // sk.circle(0, 0, SHIP_HIT_RADIUS * 2);

            sk.pop();
        };

        return { update, draw };
    })();

    // -------- HUD (drawn in device pixels) --------
    const drawHUD = () => {
        sk.resetMatrix(); // back to device coords (y-down)
        sk.fill(255);
        sk.noStroke();
        sk.textAlign(sk.LEFT, sk.TOP);
        sk.textSize(16);
        sk.text(`Score: ${score}`, 12, 10);
        sk.text(`Lives: ${lives}`, 12, 32);
        sk.text(`Wave: ${wave}`, 12, 54);

        if (gameOver) {
            sk.textAlign(sk.CENTER, sk.CENTER);
            sk.textSize(28);
            sk.fill(255);
            sk.text('GAME OVER', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 18);
            sk.textSize(16);
            sk.fill(200);
            sk.text('Press R to restart', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 12);
        }
    };

    const resetGame = () => {
        score = 0;
        lives = 3;
        wave = 1;
        gameOver = false;
        bullets.length = 0;
        asteroids.length = 0;
        bursts.length = 0;
        spawnField(4);
    };

    // -------- lifecycle --------
    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

            // build composite (reflect Y, then device, then world->NDC)
            const REFLECT = [1, 0, 0, -1, 0, CANVAS_HEIGHT];
            const DEVICE  = [CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0];
            const WORLD   = [sx, 0, 0, sy, tx, ty];
            WORLD_TO_DEVICE = mul2D(mul2D(REFLECT, DEVICE), WORLD);

            resetGame();

            // restart key
            sk.keyPressed = () => {
                if (sk.key === 'r' || sk.key === 'R') {
                    resetGame();
                }
            };
        },

        display() {
            sk.background(0);

            // World pass
            sk.resetMatrix();
            sk.applyMatrix(
                WORLD_TO_DEVICE[0], WORLD_TO_DEVICE[1],
                WORLD_TO_DEVICE[2], WORLD_TO_DEVICE[3],
                WORLD_TO_DEVICE[4], WORLD_TO_DEVICE[5]
            );

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
                        // Remove bullet and asteroid, split asteroid
                        bullets.splice(bi, 1);
                        const parent = asteroids.splice(ai, 1)[0];
                        splitAsteroid(parent);
                        hit = true;
                    }
                }
            }

            // Wave progression
            if (!gameOver && asteroids.length === 0) {
                wave += 1;
                spawnField(3 + wave); // slightly ramp difficulty
            }

            // Draw
            for (let i = 0; i < asteroids.length; i++) asteroids[i].draw();
            for (let i = 0; i < bursts.length; i++) bursts[i].draw();
            for (let i = 0; i < bullets.length; i++) bullets[i].draw();
            ship.draw(thrusting);

            // HUD overlay (device space)
            drawHUD();
        }
    };
};
