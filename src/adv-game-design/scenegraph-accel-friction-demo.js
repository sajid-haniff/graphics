// src/adv-game-design/scenegraph-accel-friction-demo.js
// More fun + colorful version with KEYBOARD controls:
//  G: toggle gradient bg
//  C: cycle color palettes (recolor balls)
//  + / - : add / remove a ball
//  B: toggle confetti bursts
//  F: toggle friction after first impact
//  A: toggle per-ball acceleration
//  P: pause/resume
//  R: reset scene

import { createScenegraph } from "./library/scenegraph";

export const createScenegraphAccelFrictionDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {
    // Make world == device pixels
    const win = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg  = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);

    // -------------------------- Helpers --------------------------
    const rand = (a, b) => a + Math.random() * (b - a);
    const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const allPalettes = [
        [sk.color(255,99,71), sk.color(255,215,0), sk.color(0,191,255)],
        [sk.color(186,85,211), sk.color(50,205,50), sk.color(255,140,0)],
        [sk.color(240), sk.color(0,200,255), sk.color(255,105,180)],
        [sk.color(135,206,235), sk.color(255,182,193), sk.color(255,250,205)]
    ];
    let paletteIdx = 0;

    // Confetti particle factory (returns { node, vx, vy, life })
    const makeParticle = (x, y, baseCol) => {
        const d = rand(3, 6);
        const node = sg.circle(d, baseCol, null, 0);
        node.x = x; node.y = y; node.alpha = 0.9;
        const vx = rand(-2.5, 2.5), vy = rand(-2.5, 2.5);
        return { node, vx, vy, life: rand(0.4, 0.8) };
    };

    // Ball factory
    const makeBall = (x, y, diam, palette) => {
        const fill = choice(palette);
        const node = sg.circle(diam, fill, sk.color(20), 2);
        node.x = x; node.y = y; node.shadow = true;

        return {
            node,
            diam,
            // kinematics
            vx: rand(-2, 2),
            vy: rand(-2, 2),
            ax: rand(-0.25, 0.25),
            ay: rand(-0.25, 0.25),
            fx: 1.0,
            fy: 1.0,
            palette,
            bounce() {
                node._style = node._style || {};
                node._style.fill = choice(this.palette);
            }
        };
    };

    // -------------------------- Scene ---------------------------
    const particles = [];
    const balls = [];
    const spawnBall = () => {
        const palette = allPalettes[paletteIdx];
        const diam = choice([20, 24, 28, 32]);
        const b = makeBall(rand(32, CANVAS_WIDTH - 64), rand(32, CANVAS_HEIGHT - 64), diam, palette);
        balls.push(b); sg.root.add(b.node);
    };
    const removeBall = () => {
        const b = balls.pop();
        if (!b) return;
        const parent = b.node.parent; if (parent) parent.removeChild(b.node);
    };

    // Seed
    for (let i = 0; i < 7; i++) spawnBall();

    // Bounds
    const minX = 0, minY = 0, maxX = CANVAS_WIDTH, maxY = CANVAS_HEIGHT;

    // Options / state
    let t = 0;
    let showGradient = true;
    let enableBursts = true;
    let frictionEnabled = true;   // whether we enable friction after first hit
    let accelEnabled = true;
    let paused = false;

    // Utilities shared by display() and key handler
    const recolorAll = () => {
        const pal = allPalettes[paletteIdx];
        balls.forEach(b => { b.palette = pal; b.bounce(); });
    };

    const resetScene = () => {
        // remove balls
        while (balls.length) removeBall();
        // remove particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const parent = p.node.parent; if (parent) parent.removeChild(p.node);
            particles.pop();
        }
        // spawn fresh
        for (let i = 0; i < 7; i++) spawnBall();
    };

    // -------------------------- Loop ----------------------------
    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        },
        display() {
            if (!paused) t += 0.01;

            // Device-space animated gradient background
            sk.resetMatrix();
            if (showGradient) {
                for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
                    const k = (y / CANVAS_HEIGHT);
                    const r = 20 + 35 * Math.sin(t + k * 6.283);
                    const g = 40 + 60 * Math.sin(t * 0.7 + k * 6.283 + 2.0);
                    const b = 60 + 80 * Math.sin(t * 1.3 + k * 6.283 + 4.0);
                    sk.noStroke(); sk.fill(sk.color( Math.max(0, Math.min(255, r+140)), Math.max(0, Math.min(255, g+80)), Math.max(0, Math.min(255, b+80)) ));
                    sk.rect(0, y, CANVAS_WIDTH, 4);
                }
            } else {
                sk.background(18);
            }

            if (!paused) {
                // ---------------- Physics & impacts ----------------
                balls.forEach(b => {
                    // accel / friction gates
                    if (accelEnabled) { b.vx += b.ax; b.vy += b.ay; }
                    b.vx *= b.fx; b.vy *= b.fy;
                    // integrate
                    b.node.x += b.vx; b.node.y += b.vy;

                    // bounces
                    let hit = false;
                    if (b.node.x < minX) { b.node.x = minX; b.vx = -b.vx; hit = true; }
                    if (b.node.x + b.diam > maxX) { b.node.x = maxX - b.diam; b.vx = -b.vx; hit = true; }
                    if (b.node.y < minY) { b.node.y = minY; b.vy = -b.vy; hit = true; }
                    if (b.node.y + b.diam > maxY) { b.node.y = maxY - b.diam; b.vy = -b.vy; hit = true; }

                    if (hit) {
                        if (frictionEnabled) { b.fx = 0.985; b.fy = 0.985; }
                        if (accelEnabled) { b.ax = 0; b.ay = 0; }
                        b.bounce();
                        if (enableBursts) {
                            const cx = b.node.x + b.diam * 0.5;
                            const cy = b.node.y + b.diam * 0.5;
                            for (let i = 0; i < 10; i++) {
                                const p = makeParticle(cx, cy, choice(b.palette));
                                particles.push(p); sg.root.add(p.node);
                            }
                        }
                    }
                });

                // Update particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.node.x += p.vx; p.node.y += p.vy;
                    p.vy += 0.05; // slight gravity
                    p.node.alpha *= 0.92;
                    p.life -= 1/60;
                    if (p.life <= 0 || p.node.alpha <= 0.03) {
                        const parent = p.node.parent; if (parent) parent.removeChild(p.node);
                        particles.splice(i, 1);
                    }
                }
            }

            // ---------------- Render world ----------------
            sg.render();

            // HUD
            sk.resetMatrix();
            sk.noStroke(); sk.fill(255); sk.textSize(12);
            sk.text("G grad  C palette  +/- balls  B confetti  F friction  A accel  P pause  R reset", 8, 18);
        },
        // Expose a key handler so the loader can forward events: index.js calls sketch.keyPressed?.(sk.key)
        keyPressed(k) {
            const key = k || sk.key; // prefer forwarded char, fallback to p5's
            if (key === 'g' || key === 'G') {
                showGradient = !showGradient;
            } else if (key === 'c' || key === 'C') {
                paletteIdx = (paletteIdx + 1) % allPalettes.length; recolorAll();
            } else if (key === '+' || key === '=') {
                spawnBall();
            } else if (key === '-') {
                removeBall();
            } else if (key === 'b' || key === 'B') {
                enableBursts = !enableBursts;
            } else if (key === 'f' || key === 'F') {
                frictionEnabled = !frictionEnabled;
            } else if (key === 'a' || key === 'A') {
                accelEnabled = !accelEnabled;
            } else if (key === 'p' || key === 'P') {
                paused = !paused;
            } else if (key === 'r' || key === 'R') {
                // full reset
                resetScene();
            }
            return false; // prevent default
        }
    };
};

export default createScenegraphAccelFrictionDemo;