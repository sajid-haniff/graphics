// src/adv-game-design/demos/scenegraph-transform-demo.js

import { createScenegraph } from "./library/scenegraph";

export const createScenegraphTransformDemo = (
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 480
) => {
    // World window: a nice centered view
    const worldWin = { left: -10, right: 10, bottom: -7.5, top: 7.5 };

    const sg = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);
    const { root, rectangle, circle, group } = sg;

    // ------------------------------------------------------------
    // Hierarchy:
    //   root (scenegraph root)
    //     ↳ rig (moves as a unit)
    //          ↳ base
    //               ↳ arm
    //                    ↳ forearm
    //                          ↳ hand
    // Each node has its own rotation; children inherit parent transforms.
    // ------------------------------------------------------------

    const rig = group();
    rig.x = 0;
    rig.y = 0;
    root.addChild(rig);

    // Base joint (at world origin)
    const base = group();
    rig.addChild(base);

    const baseVisual = rectangle(4, 0.6, sk.color(220, 80, 80), 0, 0);
    baseVisual.pivotX = 0;   // rotate around left end
    baseVisual.pivotY = 0.5;
    base.addChild(baseVisual);

    // First arm segment, attached at end of base
    const arm = group();
    arm.x = 4;               // end of base segment
    base.addChild(arm);

    const armVisual = rectangle(3, 0.5, sk.color(80, 180, 220), 0, 0);
    armVisual.pivotX = 0;    // rotate around its left end
    armVisual.pivotY = 0.5;
    arm.addChild(armVisual);

    // Second arm segment (forearm), attached at end of arm
    const forearm = group();
    forearm.x = 3;           // end of arm segment
    arm.addChild(forearm);

    const forearmVisual = rectangle(2, 0.4, sk.color(90, 220, 120), 0, 0);
    forearmVisual.pivotX = 0;
    forearmVisual.pivotY = 0.5;
    forearm.addChild(forearmVisual);

    // Hand (circle) at end of forearm
    const hand = group();
    hand.x = 2;              // end of forearm
    forearm.addChild(hand);

    const handVisual = circle(0.8, sk.color(255, 230, 80), 0, 0);
    hand.addChild(handVisual);

    // Small axes helpers so you can see each local frame
    const makeAxes = (size = 0.75) => {
        const g = group();

        const xAxis = rectangle(size, 0.06, sk.color(255, 0, 0), null, 0);
        xAxis.pivotX = 0;
        xAxis.pivotY = 0.5;
        g.addChild(xAxis);

        const yAxis = rectangle(size, 0.06, sk.color(0, 255, 0), null, 0);
        yAxis.pivotX = 0;
        yAxis.pivotY = 0.5;
        yAxis.rotation = sk.HALF_PI; // 90° CCW in world Y-up
        g.addChild(yAxis);

        return g;
    };

    base.addChild(makeAxes(1.5));
    arm.addChild(makeAxes(1.0));
    forearm.addChild(makeAxes(0.75));
    hand.addChild(makeAxes(0.5));

    let t = 0;

    return {
        setup: () => {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        },

        display: () => {
            t += 0.02;

            // Animate each joint at a different speed so you can see hierarchy clearly
            base.rotation     = 0.5 * t;   // slow sweep
            arm.rotation      = -1.0 * t;  // opposite direction
            forearm.rotation  = 1.7 * t;
            hand.rotation     = -2.5 * t;

            sk.background(10);

            // World-space render (Y-up) via scenegraph
            sg.render();

            // Simple HUD in device space to label things
            sk.resetMatrix();
            sk.fill(255);
            sk.noStroke();
            sk.textSize(14);
            sk.text("Scenegraph transform hierarchy demo", 10, 20);
            sk.text("base → arm → forearm → hand (nested rotations & translations)", 10, 40);
        }
    };
};

export default createScenegraphTransformDemo;
