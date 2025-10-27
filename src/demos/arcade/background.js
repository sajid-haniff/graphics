// ============================================================================
// Background and world-grid rendering (safe color handling)
// ============================================================================

// Vertical linear gradient from c1 (top) to c2 (bottom)
export const drawGradientBG = (sk, W, H, c1, c2) => {
    const col1 = (typeof c1 === 'string' || Array.isArray(c1)) ? sk.color(c1) : c1;
    const col2 = (typeof c2 === 'string' || Array.isArray(c2)) ? sk.color(c2) : c2;

    sk.push();
    sk.noStroke();
    const steps = Math.max(1, Math.min(256, Math.floor(H)));
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = sk.lerp(sk.red(col1),   sk.red(col2),   t);
        const g = sk.lerp(sk.green(col1), sk.green(col2), t);
        const b = sk.lerp(sk.blue(col1),  sk.blue(col2),  t);
        sk.fill(r, g, b);
        const y = (i / steps) * H;
        const h = H / steps + 1;
        sk.rect(0, y, W, h);
    }
    sk.pop();
};

// World-space laser grid, Y-up (call after applying COMPOSITE)
export const drawLaserGrid = (sk, win, pixelToWorld) => {
    const step = 2; // world units between grid lines
    const lw = pixelToWorld(1);
    sk.push();
    sk.stroke(0, 255, 255, 40);
    sk.strokeWeight(lw);
    sk.noFill();

    for (let x = Math.ceil(win.left/step)*step; x <= win.right; x += step) {
        sk.line(x, win.bottom, x, win.top);
    }
    for (let y = Math.ceil(win.bottom/step)*step; y <= win.top; y += step) {
        sk.line(win.left, y, win.right, y);
    }

    // Axes
    sk.stroke(255, 100);
    sk.line(win.left, 0, win.right, 0);
    sk.line(0, win.bottom, 0, win.top);

    sk.pop();
};
