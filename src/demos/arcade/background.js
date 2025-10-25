// /src/demo/arcade/background.js
// Background rendering utilities:
// - drawGradientBG: device-space vertical gradient (call before applying world matrix)
// - drawLaserGrid: world-space retro grid (call after applying world matrix)

import { neonLine } from './neon';

// Device-space gradient background.
// Call with device coordinates active (i.e., BEFORE applying world matrix).
export const drawGradientBG = (sk, CANVAS_WIDTH, CANVAS_HEIGHT, THEME) => {
    sk.resetMatrix(); // ensure device space (y-down)
    const steps = 64;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const c = sk.lerpColor(sk.color(THEME.bgTop), sk.color(THEME.bgBot), t);
        sk.stroke(c);
        sk.line(0, t * CANVAS_HEIGHT, CANVAS_WIDTH, t * CANVAS_HEIGHT);
    }
};

// World-space laser grid.
// Call AFTER applying the world→device matrix (Y is flipped by your composite).
export const drawLaserGrid = (sk, win, THEME, pixelToWorld) => {
    const y0 = win.bottom + 0.5;
    const y1 = 0;                // “horizon”
    const rowStep = 1.0;
    const colCount = 16;

    // horizontal rows
    for (let y = y0; y <= y1; y += rowStep) {
        neonLine(sk, win.left, y, win.right, y, THEME.bullet, pixelToWorld, 1.0);
    }

    // faux-perspective verticals
    for (let c = 0; c <= colCount; c++) {
        const t = c / colCount;
        const xB = sk.lerp(win.left, win.right, t);
        const xT = sk.lerp(win.left * 0.2, win.right * 0.2, t); // squeeze near horizon
        neonLine(sk, xB, y0, xT, y1, THEME.bullet, pixelToWorld, 1.0);
    }
};
