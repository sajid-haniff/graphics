import { neonLine } from './neon';

export const drawGradientBG = (sk, CANVAS_WIDTH, CANVAS_HEIGHT, THEME) => {
    sk.resetMatrix(); // device space
    const steps = 64;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const c = sk.lerpColor(sk.color(THEME.bgTop), sk.color(THEME.bgBot), t);
        sk.stroke(c);
        sk.line(0, t * CANVAS_HEIGHT, CANVAS_WIDTH, t * CANVAS_HEIGHT);
    }
};

// Draw in world space (call after world matrix)
export const drawLaserGrid = (sk, win, THEME, pixelToWorld) => {
    const y0 = win.bottom + 0.5;
    const y1 = 0;
    const rowStep = 1.0;
    const colCount = 16;

    for (let y = y0; y <= y1; y += rowStep) {
        neonLine(sk, win.left, y, win.right, y, THEME.bullet, pixelToWorld, 1.0);
    }
    for (let c = 0; c <= colCount; c++) {
        const t = c / colCount;
        const xB = sk.lerp(win.left, win.right, t);
        const xT = sk.lerp(win.left * 0.2, win.right * 0.2, t);
        neonLine(sk, xB, y0, xT, y1, THEME.bullet, pixelToWorld, 1.0);
    }
};
