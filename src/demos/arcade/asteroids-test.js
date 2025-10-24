import { createGraphicsContext2 } from '../../graphics_context2';

export const createAsteroidsTest = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 480) => {
    // World box centered at origin
    const win = { left: -10, right: 10, bottom: -10, top: 10 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // --------- matrix utilities ----------
    const mul2D = (A, B) => {
        const [a1,b1,c1,d1,e1,f1] = A;
        const [a2,b2,c2,d2,e2,f2] = B;
        // Equivalent to sequential: apply(A); apply(B)  => I*A*B
        return [
            a1*a2 + c1*b2,
            b1*a2 + d1*b2,
            a1*c2 + c1*d2,
            b1*c2 + d1*d2,
            a1*e2 + c1*f2 + e1,
            b1*e2 + d1*f2 + f1
        ];
    };

    // Precomputed composite (built once)
    let WORLD_TO_DEVICE = [1,0,0,1,0,0];

    // convert N pixels to world units (for consistent stroke sizes / bullet size)
    const pixelToWorld = (px) => {
        const sx = Math.hypot(WORLD_TO_DEVICE[0], WORLD_TO_DEVICE[1]);
        const sy = Math.hypot(WORLD_TO_DEVICE[2], WORLD_TO_DEVICE[3]);
        const s  = (sx + sy) * 0.5; // avg pixels-per-world-unit
        return px / s;
    };

    // --------- canonical ship ----------
    const SHIP_POINTS = [
        { x: 0,    y:  1.0 }, // tip (forward / +Y)
        { x: 0.5,  y: -0.5 },
        { x: 0.0,  y: -0.2 },
        { x: -0.5, y: -0.5 }
    ];

    const SHIP_SCALE = 1.0;

    const bullets = [];
    const asteroids = [];

    // ---------- helpers ----------
    const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));
    const rotateVec = (vx, vy, deg) => {
        // CCW rotation in Y-up world space
        const a = sk.radians(deg);
        return { x: vx * Math.cos(a) - vy * Math.sin(a),
            y: vx * Math.sin(a) + vy * Math.cos(a) };
    };

    const randRange = (lo, hi) => lo + Math.random() * (hi - lo);

    // --------- asteroid factory ----------
    const createAsteroid = (x, y, radius, vx, vy) => {
        // jaggy outline
        const verts = (() => {
            const count = Math.max(8, Math.floor(radius * 6)); // more sides if larger
            const pts = [];
            for (let i = 0; i < count; i++) {
                const t = (i / count) * sk.TWO_PI;
                // base radius with jitter
                const r = radius * (1 + randRange(-0.25, 0.25));
                pts.push({ x: -Math.sin(t) * r, y: -Math.cos(t) * r }); // Y-up shape
            }
            return pts;
        })();

        const pos = sk.createVector(x, y);
        const vel = sk.createVector(vx, vy);
        let rotDeg = randRange(-1, 1);   // angular speed (deg/frame)
        let angleDeg = randRange(0, 360);

        return {
            radius,
            position: pos,
            velocity: vel,
            verts,
            dead: false,
            update() {
                pos.add(vel);
                angleDeg = (angleDeg + rotDeg + 360) % 360;

                // wrap
                pos.x = wrap(pos.x, win.left, win.right);
                pos.y = wrap(pos.y, win.bottom, win.top);
            },
            draw() {
                sk.push();
                sk.translate(pos.x, pos.y);
                sk.rotate(sk.radians(angleDeg)); // drawing rotation (Y is flipped later in matrix)
                sk.noFill();
                sk.stroke('#0F0');
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

    // spawn random field
    const spawnField = (count = 4) => {
        for (let i = 0; i < count; i++) {
            const r = randRange(1.6, 2.4);
            const x = randRange(win.left + r, win.right - r);
            const y = randRange(win.bottom + r, win.top - r);
            const v = rotateVec(randRange(0.02, 0.05), 0, randRange(0, 360));
            asteroids.push(createAsteroid(x, y, r, v.x, v.y));
        }
    };

    // split an asteroid into two children
    const splitAsteroid = (ast, children = 2) => {
        const minR = 0.6;
        const newR = ast.radius * 0.5;
        if (newR < minR) return; // too small to split further

        const baseSpeed = Math.max(ast.velocity.mag(), 0.04);
        for (let i = 0; i < children; i++) {
            const angle = (i === 0 ? 20 : -20); // spread
            const dir = rotateVec(ast.velocity.x, ast.velocity.y, angle);
            // normalize-ish and scale
            const m = Math.hypot(dir.x, dir.y) || 1;
            const speed = baseSpeed * randRange(0.9, 1.2);
            const vx = (dir.x / m) * speed;
            const vy = (dir.y / m) * speed;

            asteroids.push(createAsteroid(ast.position.x, ast.position.y, newR, vx, vy));
        }
    };

    // --------- ship (closure) ----------
    const ship = (() => {
        const pos = sk.createVector(0, 0);
        const vel = sk.createVector(0, 0);
        let rotDeg = 0;

        const ROT_SPEED = 3;       // deg/frame
        const THRUST    = 0.02;    // world units/frame^2
        const DAMPING   = 0.985;   // inertia
        const BULLET_SPEED = 0.5;  // world units/frame
        const BULLET_LIFE  = 60;   // frames
        const FIRE_COOLDOWN_MS = 300;
        let lastFireMs = 0;

        const forwardVec = () => {
            // 🔑 use -rot because of the Y-flip in world->device matrix
            const a = sk.radians(-rotDeg);
            return sk.createVector(sk.sin(a), sk.cos(a)); // forward in world space
        };

        const fire = () => {
            const now = sk.millis();
            if (now - lastFireMs < FIRE_COOLDOWN_MS) return;

            const dir = forwardVec();
            const spawnOffset = 0.9 * SHIP_SCALE; // nose
            const start = sk.createVector(
                pos.x + dir.x * spawnOffset,
                pos.y + dir.y * spawnOffset
            );

            bullets.push({
                position: start,
                velocity: sk.createVector(dir.x * BULLET_SPEED, dir.y * BULLET_SPEED),
                life: BULLET_LIFE,
                dead: false,
                update() {
                    this.position.add(this.velocity);
                    this.life -= 1;
                    const p = this.position;
                    p.x = wrap(p.x, win.left, win.right);
                    p.y = wrap(p.y, win.bottom, win.top);
                    if (this.life <= 0) this.dead = true;
                },
                draw() {
                    sk.push();
                    sk.translate(this.position.x, this.position.y);
                    sk.noStroke();
                    sk.fill('#FFF');
                    const dWorld = pixelToWorld(6); // ~6px diameter
                    sk.circle(0, 0, dWorld);
                    sk.pop();
                }
            });

            lastFireMs = now;
        };

        const update = () => {
            if (sk.keyIsDown(sk.LEFT_ARROW))  rotDeg = (rotDeg + ROT_SPEED) % 360;
            if (sk.keyIsDown(sk.RIGHT_ARROW)) rotDeg = (rotDeg - ROT_SPEED + 360) % 360;

            if (sk.keyIsDown(sk.UP_ARROW)) {
                const dir = forwardVec();          // thrust along heading
                vel.x += dir.x * THRUST;
                vel.y += dir.y * THRUST;
            }

            pos.add(vel);
            vel.mult(DAMPING);

            pos.x = wrap(pos.x, win.left, win.right);
            pos.y = wrap(pos.y, win.bottom, win.top);

            if (sk.keyIsDown(32)) fire(); // space
        };

        const draw = () => {
            sk.push();
            sk.translate(pos.x, pos.y);
            sk.rotate(sk.radians(rotDeg));       // visual rotation
            sk.noFill();
            sk.stroke('#0F0');
            sk.strokeWeight(pixelToWorld(1.5));
            sk.beginShape();
            for (let i = 0; i < SHIP_POINTS.length; i++) {
                const p = SHIP_POINTS[i];
                sk.vertex(p.x * SHIP_SCALE, p.y * SHIP_SCALE);
            }
            sk.endShape(sk.CLOSE);
            sk.pop();
        };

        // expose for ship/asteroid collision if needed later
        return { update, draw, pos, radius: 0.9 * SHIP_SCALE };
    })();

    // --------- optional: tiny debug overlay ---------
    const drawDebug = () => {
        sk.stroke(60);
        sk.noFill();
        sk.rectMode(sk.CORNERS);
        sk.rect(win.left, win.bottom, win.right, win.top);
        sk.stroke(100);
        sk.line(-1, 0, 1, 0);
        sk.line(0, -1, 0, 1);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

            // build composite exactly matching the sequential order:
            // sk.applyMatrix(1,0,0,-1,0,CANVAS_HEIGHT)           // reflect Y
            // sk.applyMatrix(CANVAS_WIDTH,0,0,CANVAS_HEIGHT,0,0) // to device
            // sk.applyMatrix(sx,0,0,sy,tx,ty)                    // world->NDC
            const REFLECT = [1, 0, 0, -1, 0, CANVAS_HEIGHT];
            const DEVICE  = [CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0];
            const WORLD   = [sx, 0, 0, sy, tx, ty];

            WORLD_TO_DEVICE = mul2D(mul2D(REFLECT, DEVICE), WORLD);

            // initial asteroids
            spawnField(4);
        },

        display() {
            sk.background(0);
            sk.resetMatrix();
            sk.applyMatrix(
                WORLD_TO_DEVICE[0], WORLD_TO_DEVICE[1],
                WORLD_TO_DEVICE[2], WORLD_TO_DEVICE[3],
                WORLD_TO_DEVICE[4], WORLD_TO_DEVICE[5]
            );

            // update
            ship.update();
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].update();
                if (bullets[i].dead) bullets.splice(i, 1);
            }
            for (let i = 0; i < asteroids.length; i++) asteroids[i].update();

            // bullet ↔ asteroid collisions (distance check)
            const bulletRadius = pixelToWorld(3); // ~3px radius
            for (let bi = bullets.length - 1; bi >= 0; bi--) {
                const b = bullets[bi];
                let hit = false;

                for (let ai = asteroids.length - 1; ai >= 0 && !hit; ai--) {
                    const a = asteroids[ai];
                    const dx = b.position.x - a.position.x;
                    const dy = b.position.y - a.position.y;
                    const dist2 = dx*dx + dy*dy;
                    const r = a.radius + bulletRadius * 1.0; // add bullet radius
                    if (dist2 <= r * r) {
                        // impact
                        bullets.splice(bi, 1);
                        hit = true;

                        // split or remove
                        const parent = asteroids.splice(ai, 1)[0];
                        splitAsteroid(parent, 2);
                    }
                }
            }

            // re-spawn field if cleared
            if (asteroids.length === 0) spawnField(4);

            // draw
            for (let i = 0; i < asteroids.length; i++) asteroids[i].draw();
            for (let i = 0; i < bullets.length; i++) bullets[i].draw();
            ship.draw();

            // debug (optional)
            // drawDebug();
        }
    };
};
