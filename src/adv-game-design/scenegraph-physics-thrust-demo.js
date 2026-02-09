// src/adv-game-design/scenegraph-physics-asteroid-ship-demo.js
// Fast "Asteroids-style" ship:
//  - Smooth turning with angular damping
//  - Strong thrust, light linear damping
//  - Screen wrap
//  - Uses scenegraph + scenegraph-physics + scenegraph-keyboard

import { createScenegraph } from "./library/scenegraph";
import {
    attachBody,
    updatePhysics,
    applyForwardForce,
    applyQuadraticDrag
} from "./library/scenegraph-physics";
import { createKeyboard } from "./library/scenegraph-keyboard";
import { V } from "../lib/esm/V";

export const createScenegraphPhysicsThrustDemo = (
    sk,
    CANVAS_WIDTH = 800,
    CANVAS_HEIGHT = 600
) => {
    // World == device for this demo (Y-up handled inside scenegraph)
    const worldWin = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg       = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);

    const keyboard = createKeyboard(sk, {
        turnLeft:  [sk.LEFT_ARROW,  "a"],
        turnRight: [sk.RIGHT_ARROW, "d"],
        thrust:    [sk.UP_ARROW,    "w"],
        brake:     [sk.DOWN_ARROW,  "s"]
    });

    // ------------------------------------------------------------
    // Ship node (simple rocket shape)
    // ------------------------------------------------------------
    const ship = sg.rectangle(32, 48, sk.color(0, 200, 255), sk.color(255), 2);
    ship.x = CANVAS_WIDTH * 0.5;
    ship.y = CANVAS_HEIGHT * 0.5;
    ship.pivotX = 0.5;
    ship.pivotY = 0.5;
    sg.root.add(ship);

    const nose = sg.circle(10, sk.color(255, 255, 0));
    nose.x = ship.width * 0.5 - 5;  // horizontally centered
    nose.y = ship.height - 10;      // near the front/tip
    ship.addChild(nose);


    // ------------------------------------------------------------
    // Physics body
    // ------------------------------------------------------------
    const shipBody = attachBody(ship, {
        mass: 1,
        // Very light damping so it feels fast and drifty
        linearDamping: 0.998,
        angularDamping: 0.98,
        maxSpeed: 1200,      // pixels / second
        gravity: [0, 0]      // space, no gravity
    });

    const bounds = {
        left: 0,
        right: CANVAS_WIDTH,
        bottom: 0,
        top: CANVAS_HEIGHT
    };

    const wrapBody = (body, bounds, margin = 32) => {
        const p = body.position;
        let px = p[0];
        let py = p[1];

        const n = body.node;
        const halfW = (n.width || 0) * (n.scaleX || 1) * 0.5;
        const halfH = (n.height || 0) * (n.scaleY || 1) * 0.5;

        if (px < bounds.left - halfW - margin) {
            px = bounds.right + halfW + margin;
        } else if (px > bounds.right + halfW + margin) {
            px = bounds.left - halfW - margin;
        }

        if (py < bounds.bottom - halfH - margin) {
            py = bounds.top + halfH + margin;
        } else if (py > bounds.top + halfH + margin) {
            py = bounds.bottom - halfH - margin;
        }

        body.position = V.create(px, py);
    };

    // Tunable parameters for "feel"
    const thrustForce   = 5500;   // strong & snappy
    const brakeForce    = 2500;
    const turnAccel     = 7.5;    // rad/s^2 when key held
    const dragCoeff     = 0.002;   // tiny quadratic drag just to keep it sane

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);
        },

        display() {
            // Explicit dt in seconds, clamped
            const dt = Math.min(sk.deltaTime / 1000, 0.05);

            // ------------------------------------------------
            // INPUT → forces & angular velocity
            // ------------------------------------------------
            let turn = 0;
            if (keyboard.isDown("turnLeft"))  turn += 1;
            if (keyboard.isDown("turnRight")) turn -= 1;

            // Turn with angular acceleration (keeps some inertia)
            if (turn !== 0) {
                shipBody.angularVelocity += turn * turnAccel * dt;
            }

            // Thrust / brake along forward direction (Y-up world)
            if (keyboard.isDown("thrust")) {
                applyForwardForce(shipBody, thrustForce);
            }
            if (keyboard.isDown("brake")) {
                applyForwardForce(shipBody, -brakeForce);
            }

            // Tiny quadratic drag for high-speed stability
            applyQuadraticDrag(shipBody, dragCoeff);

            // ------------------------------------------------
            // PHYSICS STEP & WRAP
            // ------------------------------------------------
            updatePhysics(dt);
            wrapBody(shipBody, bounds, 40);

            // ------------------------------------------------
            // RENDER
            // ------------------------------------------------
            sk.background(5, 5, 15);

            // World-space: scenegraph (Y-up)
            sg.render();

            // HUD (device space)
            const speed = V.length(shipBody.velocity);
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(14);
            sk.textAlign(sk.LEFT, sk.TOP);
            sk.text(
                "Asteroid Ship Physics Demo\n" +
                "Controls: A/D or ←/→ turn, W/S or ↑/↓ thrust/brake\n" +
                `Speed: ${speed.toFixed(1)} px/s`,
                10,
                10
            );
        }
    };
};

export default createScenegraphPhysicsThrustDemo;
