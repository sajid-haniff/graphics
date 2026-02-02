// src/adv-game-design/scenegraph-keyboard-asteroids-demo.js
// Asteroids-style keyboard demo with the simple keyboard abstraction.

import { createScenegraph } from "./library/scenegraph";
import { createKeyboard } from "./library/scenegraph-keyboard";
import { V } from "../lib/esm/V";

export const createScenegraphKeyboardAsteroidsDemo = (
    sk,
    CANVAS_WIDTH = 900,
    CANVAS_HEIGHT = 600
) => {
    // World window (Y-up)
    const win = { left: -16, right: 16, bottom: -10, top: 10 };
    const sg  = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);

    // Map actions to keys (p5 constants + chars)
    const keyboard = createKeyboard(sk, {
        rotateLeft:  [sk.LEFT_ARROW, "a"],
        rotateRight: [sk.RIGHT_ARROW, "d"],
        thrust:      [sk.UP_ARROW, "w"],
        fire:        " ", // space bar
    });

    // Ship state
    const ship = {
        pos: V.create(0, 0),
        vel: V.create(0, 0),
        angle: 0,      // radians
        radius: 0.7,
    };

    // Bullets
    const bullets = [];
    const BULLET_SPEED    = 18.0;
    const BULLET_LIFETIME = 1.6; // seconds

    const TURN_RATE = sk.radians(180); // deg/sec -> rad/sec
    const THRUST    = 10.0;
    const DRAG      = 0.9;

    let shipNode = null;

    const wrapWorld = (p) => {
        if (p[0] < win.left)   p[0] = win.right;
        if (p[0] > win.right)  p[0] = win.left;
        if (p[1] < win.bottom) p[1] = win.top;
        if (p[1] > win.top)    p[1] = win.bottom;
    };

    const spawnBullet = () => {
        const a   = -ship.angle; // world dir due to Y-flip in renderer
        const dir = V.create(Math.sin(a), Math.cos(a));

        const startPos = V.add(ship.pos, V.scale(dir, ship.radius + 0.3));
        const vel      = V.add(V.scale(dir, BULLET_SPEED), ship.vel);

        const node = sg.circle(0.25, sk.color(255), null, 0);
        node.pivotX = 0.5;
        node.pivotY = 0.5;
        node.layer  = 2;
        sg.root.add(node);

        bullets.push({ pos: startPos, vel, life: 0, node });
    };

    const buildScene = () => {
        const bg = sg.rectangle(
            win.right - win.left,
            win.top - win.bottom,
            sk.color(5, 5, 18)
        );
        bg.x = win.left;
        bg.y = win.bottom;
        bg.pivotX = 0;
        bg.pivotY = 0;
        bg.layer  = 0;
        sg.root.add(bg);

        shipNode = sg.rectangle(1.2, 1.8, sk.color(220, 240, 255));
        shipNode.pivotX = 0.5;
        shipNode.pivotY = 0.5;
        shipNode.layer  = 1;
        sg.root.add(shipNode);
    };

    const updateShip = (dt) => {
        if (keyboard.isDown("rotateLeft")) {
            ship.angle += TURN_RATE * dt;
        }
        if (keyboard.isDown("rotateRight")) {
            ship.angle -= TURN_RATE * dt;
        }

        if (keyboard.isDown("thrust")) {
            const a   = -ship.angle;
            const dir = V.create(Math.sin(a), Math.cos(a));
            const accel = V.scale(dir, THRUST * dt);
            ship.vel = V.add(ship.vel, accel);
        }

        ship.vel = V.scale(ship.vel, DRAG);
        ship.pos = V.add(ship.pos, V.scale(ship.vel, dt));
        wrapWorld(ship.pos);

        shipNode.x = ship.pos[0];
        shipNode.y = ship.pos[1];
        shipNode.rotation = ship.angle;
    };

    const updateBullets = (dt) => {
        for (let i = bullets.length - 1; i >= 0; i -= 1) {
            const b = bullets[i];
            b.life += dt;
            if (b.life > BULLET_LIFETIME) {
                if (b.node && b.node.parent) {
                    b.node.parent.removeChild(b.node);
                }
                bullets.splice(i, 1);
                continue;
            }
            b.pos = V.add(b.pos, V.scale(b.vel, dt));
            wrapWorld(b.pos);
            b.node.x = b.pos[0];
            b.node.y = b.pos[1];
        }
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);
            buildScene();
        },

        display() {
            const dt = 1 / 60;

            updateShip(dt);
            updateBullets(dt);

            sk.background(0);
            sg.render();

            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(14);
            sk.text(
                "Asteroids keyboard demo: ←/→ rotate, ↑ thrust, Space fire",
                10,
                CANVAS_HEIGHT - 16
            );
        },

        // p5 already forwards sk.key here (from index.js),
        // but we don't need the argument; we use sk.keyCode directly.
        keyPressed() {
            if (keyboard.matches("fire", sk.keyCode)) {
                spawnBullet();
            }
        }
    };
};

export default createScenegraphKeyboardAsteroidsDemo;
