// src/adv-game-design/scenegraph-fractal-ui-demo.js
// Fractal playground with scenegraph UI:
//  - Mandelbrot / Julia toggle
//  - Zoom with mouse wheel
//  - Pan with arrow keys / WASD
//  - Scenegraph buttons + keyboard + pointer

import { createScenegraph } from "./library/scenegraph";
import { createKeyboard } from "./library/scenegraph-keyboard";
import { makeInteractive, updateButtons } from "./library/scenegraph-interactive";
import { createPointer } from "./library/scenegraph-pointer";

export const createScenegraphFractalUIDemo = (
    sk,
    CANVAS_WIDTH = 900,
    CANVAS_HEIGHT = 600
) => {
    // World == device pixels (Y-up); scenegraph handles COMPOSITE.
    const worldWin = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg       = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);

    // Keyboard actions
    const keyboard = createKeyboard(sk, {
        panLeft:      [sk.LEFT_ARROW,  "a"],
        panRight:     [sk.RIGHT_ARROW, "d"],
        panUp:        [sk.UP_ARROW,    "w"],
        panDown:      [sk.DOWN_ARROW,  "s"],
        zoomIn:       ["="],   // usually Shift + '=' key
        zoomOut:      ["-"],
        toggleFractal:["f"],
        resetView:    ["r"],
    });

    // Scenegraph-aware pointer (screen → world)
    const pointer = createPointer(sk, sg);

    // Fractal parameters
    let fractalType = "mandelbrot"; // "mandelbrot" | "julia"

    // Complex plane center and scale (half-width in complex units)
    let centerX = -0.5;
    let centerY = 0.0;
    let scale   = 2.0;      // larger = zoomed out

    // Julia parameter c = (cx, cy)
    let juliaCx = -0.8;
    let juliaCy = 0.156;

    const maxIter = 200;

    // Fractal image buffer + redraw flag
    let fractalImg  = null;
    let needsRedraw = true;

    const resetView = () => {
        fractalType = "mandelbrot";
        centerX = -0.5;
        centerY = 0.0;
        scale   = 2.0;
        juliaCx = -0.8;
        juliaCy = 0.156;
        needsRedraw = true;
    };

    const toggleFractal = () => {
        fractalType = fractalType === "mandelbrot" ? "julia" : "mandelbrot";
        needsRedraw = true;
    };

    const zoomAtCenter = (factor) => {
        scale *= factor;
        needsRedraw = true;
    };

    const panBy = (dxPixels, dyPixels) => {
        // Convert pixel pan to complex-plane pan
        const aspect = CANVAS_HEIGHT / CANVAS_WIDTH;
        const dx = (dxPixels / CANVAS_WIDTH) * 2 * scale;
        const dy = (dyPixels / CANVAS_HEIGHT) * 2 * scale * aspect;
        centerX += dx;
        centerY += dy;
        needsRedraw = true;
    };

    const updateFromKeyboard = (dt) => {
        const panSpeed = 0.75 * scale;  // scale-dependent pan
        const zoomSpeed = 0.85;         // multiplicative per second-ish

        let dx = 0;
        let dy = 0;

        if (keyboard.isDown("panLeft"))  dx -= panSpeed * dt;
        if (keyboard.isDown("panRight")) dx += panSpeed * dt;
        if (keyboard.isDown("panUp"))    dy += panSpeed * dt; // world is Y-up
        if (keyboard.isDown("panDown"))  dy -= panSpeed * dt;

        if (dx !== 0 || dy !== 0) {
            panBy(dx, dy);
        }

        if (keyboard.isDown("zoomIn")) {
            zoomAtCenter(1 - (1 - zoomSpeed) * dt * 60); // gentle
        }
        if (keyboard.isDown("zoomOut")) {
            zoomAtCenter(1 + (1 - zoomSpeed) * dt * 60);
        }
    };

    // Fractal computation
    const computeFractal = () => {
        if (!fractalImg) {
            fractalImg = sk.createImage(CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        fractalImg.loadPixels();
        const w = fractalImg.width;
        const h = fractalImg.height;
        const aspect = h / w;

        for (let py = 0; py < h; py += 1) {
            const yNorm = (py / h) - 0.5;
            const baseIm = centerY + yNorm * 2 * scale * aspect;

            for (let px = 0; px < w; px += 1) {
                const xNorm = (px / w) - 0.5;
                const baseRe = centerX + xNorm * 2 * scale;

                let zRe, zIm, cRe, cIm;

                if (fractalType === "mandelbrot") {
                    cRe = baseRe;
                    cIm = baseIm;
                    zRe = 0;
                    zIm = 0;
                } else {
                    // Julia: z starts at point, c is fixed
                    cRe = juliaCx;
                    cIm = juliaCy;
                    zRe = baseRe;
                    zIm = baseIm;
                }

                let iter = 0;
                let zr2 = 0;
                let zi2 = 0;

                while (iter < maxIter && zr2 + zi2 <= 4) {
                    zr2 = zRe * zRe;
                    zi2 = zIm * zIm;

                    const newRe = zr2 - zi2 + cRe;
                    const newIm = 2 * zRe * zIm + cIm;

                    zRe = newRe;
                    zIm = newIm;
                    iter += 1;
                }

                let r, g, b;
                if (iter === maxIter) {
                    r = 0; g = 0; b = 0;
                } else {
                    const t = iter / maxIter;
                    // Smooth-ish polynomial palette (nice "HDR-like" glow)
                    r = 9   * (1 - t) * t * t * t * 255;
                    g = 15  * (1 - t) * (1 - t) * t * t * 255;
                    b = 8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255;
                }

                const idx = 4 * (py * w + px);
                fractalImg.pixels[idx + 0] = r;
                fractalImg.pixels[idx + 1] = g;
                fractalImg.pixels[idx + 2] = b;
                fractalImg.pixels[idx + 3] = 255;
            }
        }

        fractalImg.updatePixels();
    };

    // UI: scenegraph rectangle buttons + labels
    const buildUI = () => {
        const buttonWidth  = 160;
        const buttonHeight = 40;
        const margin       = 12;

        const makeButton = (label, x, y, onTap) => {
            const baseFill   = sk.color(0, 0, 0, 180);
            const hoverFill  = sk.color(40, 40, 80, 220);
            const pressFill  = sk.color(120, 180, 255, 255);

            const btn = sg.rectangle(buttonWidth, buttonHeight, baseFill, sk.color(255), 1);
            btn.x = x;
            btn.y = y;
            btn.pivotX = 0;
            btn.pivotY = 0;
            btn.layer  = 2;
            sg.root.add(btn);

            const labelNode = sg.text(label, 14, "monospace", sk.color(255));
            labelNode.x = x + 12;
            labelNode.y = y + 10;
            labelNode.pivotX = 0;
            labelNode.pivotY = 0;
            labelNode.layer  = 3;
            sg.root.add(labelNode);

            makeInteractive(btn);

            btn.over = () => {
                if (btn._style) btn._style.fill = hoverFill;
            };
            btn.out = () => {
                if (btn._style) btn._style.fill = baseFill;
            };
            btn.press = () => {
                if (btn._style) btn._style.fill = pressFill;
            };
            btn.release = () => {
                if (btn._style) btn._style.fill = hoverFill;
            };
            btn.tap = () => {
                if (onTap) onTap();
            };

            return btn;
        };

        const y = margin;
        let x = margin;

        makeButton("Fractal: [F] toggle", x, y, () => toggleFractal());
        x += buttonWidth + 10;

        makeButton("Reset [R]", x, y, () => resetView());
        x += buttonWidth + 10;

        makeButton("Zoom +/-  (wheel)", x, y, () => {});
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);

            fractalImg = sk.createImage(CANVAS_WIDTH, CANVAS_HEIGHT);
            buildUI();
            resetView();
        },

        display() {
            const dt = 1 / 60; // simple fixed-step feel

            updateFromKeyboard(dt);

            if (needsRedraw) {
                computeFractal();
                needsRedraw = false;
            }

            // Device-space: draw fractal background
            sk.resetMatrix();
            if (fractalImg) {
                sk.image(fractalImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }

            // World-space: update pointer & interactive UI
            pointer.update();
            updateButtons(pointer);

            // World-space: draw UI via scenegraph
            sg.render();

            // Device-space HUD text
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(14);
            sk.textAlign(sk.LEFT, sk.BOTTOM);
            sk.text(
                `Type: ${fractalType.toUpperCase()}  |  WASD/Arrows: pan, +/-: zoom, F: toggle, R: reset`,
                10,
                CANVAS_HEIGHT - 10
            );
        },

        mouseWheel(event) {
            // Scroll up = zoom in, down = zoom out
            const direction = event.delta > 0 ? 1 : -1;
            const factor = direction > 0 ? 1.1 : 0.9;
            zoomAtCenter(factor);
            return false; // prevent page scroll
        },

        keyPressed() {
            // One-shot actions using keyCode
            if (keyboard.matches("toggleFractal", sk.keyCode)) {
                toggleFractal();
            }
            if (keyboard.matches("resetView", sk.keyCode)) {
                resetView();
            }
        }
    };
};

export default createScenegraphFractalUIDemo;
