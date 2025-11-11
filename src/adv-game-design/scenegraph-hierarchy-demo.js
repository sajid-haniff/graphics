// src/adv-game-design/scenegraph-hierarchy-demo.js
// Hierarchical transform verification demo: deep nesting with independent motion.
// - World is Y-up via scenegraph renderer
// - Each node animates differently so you can visually verify propagation

import { createScenegraph } from "./library/scenegraph";

export const createScenegraphHierarchyDemo = (sk, CANVAS_WIDTH = 900, CANVAS_HEIGHT = 600) => {
    const win = { left: -14, right: 14, bottom: -9, top: 9 };
    const sg = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);

    // Background grid (reference)
    const bg = sg.grid(12, 8, 2.5, 2.5, true, 0, 0, () => {
        const d = sg.circle(0.25, sk.color(235), sk.color(70), 1); d.alpha = 0.5; return d;
    });
    bg.x = -15; bg.y = -10; bg.layer = 0;

    // Axes (reference)
    const axes = sg.group();
    axes.add(sg.line(-13, 0, 13, 0, sk.color(180), 2), sg.line(0, -8.5, 0, 8.5, sk.color(180), 2));

    // --- RIG 1: Robot arm (3 segments) ---------------------------------------
    // Base at origin; each segment pivots around its local base.
    const base = sg.group();
    base.x = -6; base.y = -3; // world position

    const baseVisual = sg.rectangle(2.2, 1.0, sk.color(40), sk.color(255), 2);
    baseVisual.pivotX = 0.5; baseVisual.pivotY = 0.5; baseVisual.shadow = true;
    base.add(baseVisual);

    const seg1 = sg.group();
    seg1.x = 0; seg1.y = 0.5; // attach at center top of base
    const seg1Bar = sg.rectangle(6, 0.6, sk.color(90), sk.color(255), 2);
    seg1Bar.pivotX = 0.0; seg1Bar.pivotY = 0.5; // rotate around left end
    seg1.add(seg1Bar);

    const seg2 = sg.group();
    seg2.x = 6; seg2.y = 0; // attach to seg1's far end
    const seg2Bar = sg.rectangle(4.5, 0.5, sk.color(120), sk.color(255), 2);
    seg2Bar.pivotX = 0.0; seg2Bar.pivotY = 0.5;
    seg2.add(seg2Bar);

    const endEffector = sg.group();
    endEffector.x = 4.5; endEffector.y = 0; // tip of seg2
    const claw = sg.circle(0.9, sk.color(0, 200, 255), sk.color(255), 2);
    endEffector.add(claw);

    seg2.add(endEffector);
    seg1.add(seg2);
    base.add(seg1);

    // --- RIG 2: Solar system (sun → planet → moon) ---------------------------
    const system = sg.group();
    system.x = 5; system.y = 2; // world position

    const sun = sg.circle(2.0, sk.color(255, 170, 0), sk.color(255), 2);
    sun.pivotX = 0.5; sun.pivotY = 0.5; sun.shadow = true;

    const planetOrbit = sg.group();
    planetOrbit.x = 0; planetOrbit.y = 0; // center on sun

    const planet = sg.circle(1.1, sk.color(0, 150, 255), sk.color(255), 2);
    planet.x = 6; planet.y = 0; // radial distance

    const moonOrbit = sg.group();
    moonOrbit.x = planet.x; moonOrbit.y = planet.y;

    const moon = sg.circle(0.5, sk.color(220), sk.color(255), 1);
    moon.x = 2; moon.y = 0;

    moonOrbit.add(moon);
    planetOrbit.add(planet, moonOrbit);
    system.add(sun, planetOrbit);

    // Label group to verify nested pivots
    const labelRoot = sg.group();
    labelRoot.x = -10; labelRoot.y = 7.2;
    const title = sg.text("Hierarchy verification", 16, "sans-serif", sk.color(255));
    title.pivotX = 0; title.pivotY = 0.5;
    const subtitle = sg.text("(each node animates independently)", 12, "sans-serif", sk.color(200));
    subtitle.pivotX = 0; subtitle.pivotY = 0.5; subtitle.y = -1.0;
    labelRoot.add(title, subtitle);

    // Assemble scene
    sg.root.add(bg, axes, base, system, labelRoot);

    // --- Animation state ------------------------------------------------------
    let t = 0;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(14);
        },
        display() {
            t += 0.016;

            // Robot arm: independent rotations
            base.rotation = 0.2 * sk.sin(t * 0.8);
            seg1.rotation = 0.8 * sk.sin(t * 1.2);
            seg2.rotation = 1.1 * sk.sin(t * 1.6);
            endEffector.rotation = 2.5 * sk.sin(t * 2.0); // spin the claw

            // Solar system: hierarchical orbits
            planetOrbit.rotation += 0.01; // planet around sun
            moonOrbit.rotation += 0.04;   // moon around planet
            sun.rotation = 0.005 * sk.sin(t); // subtle wobble

            // Also jiggle planet radius slightly (local motion inside orbit group)
            planet.x = 6 + 0.3 * sk.sin(t * 2.0);

            sk.background(14);
            sg.render();

            // HUD (device-space)
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(13);
            sk.text("Hierarchy demo: verify parent→child transforms (arm + solar system)", 10, 22);
        }
    };
};

export default createScenegraphHierarchyDemo;
