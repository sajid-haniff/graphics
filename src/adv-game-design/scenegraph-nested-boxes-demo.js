// src/adv-game-design/scenegraph-nested-boxes-demo.js
// Nested-box scenegraph demo mirroring the HTML example:
// - Deep hierarchy (blue -> gold -> gray -> pink)
// - Independent local transforms (rotation/scale/alpha) that compose
// - Sibling layering test (red/yellowGreen/violet with layer change)
// - HUD shows pink's global position

import { createScenegraph } from "./library/scenegraph";

export const createScenegraphNestedBoxesDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 600) => {
    // Choose a world window that gives comfortable units
    const win = { left: -12, right: 12, bottom: -9, top: 9 };
    const sg  = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);

    // Helper to make a colored rectangle node of given world size
    const box = (w, h, fill, stroke = null, sw = 0) => sg.rectangle(w, h, fill, stroke, sw);

    // --- Hierarchy: blue -> gold -> gray -> pink ------------------------------
    const blue = box(6, 6, sk.color(0, 120, 255));
    blue.x = -5; blue.y = -2.5;           // world position analogous to (64,54) in pixel world
    blue.scaleX = 1.5;                     // non-uniform scale like the HTML demo
    blue.alpha  = 0.5;                     // parent alpha propagates
    blue.shadow = true;                    // to emphasize parent

    const gold = box(4, 4, sk.color(255, 205, 0));
    gold.x = 1; gold.y = 1;                // local to blue
    blue.addChild(gold);

    const gray = box(3, 3, sk.color(140));
    gray.x = 0.5; gray.y = 0.5;
    gray.alpha = 0.5;
    gold.addChild(gray);

    const pink = box(1.5, 1.5, sk.color(255, 105, 180));
    pink.x = 0.5; pink.y = 0.5;
    gray.addChild(pink);

    // Animate toggles (mirroring commented animation lines in HTML demo)
    const anim = { blue: true, gold: false, gray: true, pink: false };

    // --- Sibling boxes for layering test -------------------------------------
    const red    = box(4, 4, sk.color(220, 30, 30), sk.color(0), 2);    red.x = 6;  red.y = -1;
    const yellow = box(4, 4, sk.color(154, 205, 50), sk.color(0), 2);   yellow.x = 5.2; yellow.y = -0.2;
    const violet = box(4, 4, sk.color(148, 0, 211), sk.color(0), 2);    violet.x = 4.4; violet.y = 0.6;

    // Place on same layer, then raise red above others to verify ordering
    red.layer = 1; yellow.layer = 0; violet.layer = 0;

    // Reference axes
    const axes = sg.group();
    axes.add(sg.line(-11, 0, 11, 0, sk.color(180), 1), sg.line(0, -8, 0, 8, sk.color(180), 1));

    // Background grid
    const grid = sg.grid(12, 8, 2, 2, true, 0, 0, () => {
        const d = sg.circle(0.2, sk.color(235), sk.color(70), 1); d.alpha = 0.5; return d;
    });
    grid.x = -12; grid.y = -9; grid.layer = -1;

    // Assemble root
    sg.root.add(grid, axes, blue, red, yellow, violet);

    let t = 0;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(18);
            sk.noStroke();
            // Initial rotations like HTML demo
            blue.rotation = 0.8;
            gray.rotation = 0.3;
        },
        display() {
            t += 0.016;

            // Optional independent animations (verify propagation)
            if (anim.blue)  blue.rotation += 0.010;
            if (anim.gold)  gold.rotation -= 0.020;
            if (anim.gray)  gray.rotation += 0.015;
            if (anim.pink)  pink.rotation += 0.030;

            sk.background(18);
            sg.render();

            // HUD (device space): show pink's global position and layer ordering
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(13);
            const gx = pink.gx.toFixed(2), gy = pink.gy.toFixed(2);
            sk.text(`pink.g = (${gx}, ${gy})  blue.scaleX=${blue.scaleX.toFixed(2)}  alpha chain OK`, 10, 22);
            sk.text(`Layer test → red.layer=${red.layer} (should draw above yellow/violet)`, 10, 40);
            sk.text(`Toggle anim: B/G/Gr/P`, 10, 58);
        }
    };
};

export default createScenegraphNestedBoxesDemo;
