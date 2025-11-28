// src/adv-game-design/scenegraph-demo.js
// Factory demo that plugs into your demo loader pattern.
// Uses the scenegraph to draw a small animated world pass + device-space HUD.

import { createScenegraph } from "./library/scenegraph";

export const createScenegraphDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 600) => {
    // World window (Y-up)
    const win = { left: -10, right: 10, bottom: -7.5, top: 7.5 };

    // Bind scenegraph
    const sg = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);

    // Build scene -------------------------------------------------
    const axes = sg.group();
    const xAxis = sg.line(-9, 0, 9, 0, sk.color(200), 2);
    const yAxis = sg.line(0, -6.5, 0, 6.5, sk.color(200), 2);
    axes.add(xAxis, yAxis);

    const grid = sg.grid(8, 5, 2.5, 2.5, true, 0, 0, () => {
        const dot = sg.circle(0.3, sk.color(240), sk.color(60), 1);
        dot.alpha = 0.6; return dot;
    });
    grid.x = -10; grid.y = -7.5; grid.layer = 0;

    const box = sg.rectangle(4, 3, sk.color(50), sk.color(255), 2);
    box.x = -2; box.y = -1.5; box.layer = 1; box.shadow = true; box.rotation = 0.2;

    const orb = sg.circle(1.5, sk.color(0, 200, 255), null, 0);
    orb.x = 2; orb.y = 1; orb.layer = 2;

    const label = sg.text("scenegraph", 18, "sans-serif", sk.color(255));
    label.x = -3; label.y = 3.5; label.pivotX = 0; label.pivotY = 0.5;

    sg.root.add(axes, grid, box, orb, label);

    // Animation ---------------------------------------------------
    let t = 0;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(12);
            sk.noStroke();
        },
        display() {
            t += 0.016;
            box.rotation += 0.01;
            orb.y = 2 + sk.sin(t) * 1.0;



            // Clear device-space, then render world
            sk.background(12);
            sg.render();

            // HUD (device-space)
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(14);
            sk.text("Scenegraph demo", 10, 20);
        }
    };
};

export default createScenegraphDemo;