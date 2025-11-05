// src/lib/esm/util/graphics.js
import { M2D } from './M2D.js';

// Build matrices once per setup. viewport = { sx, sy, tx, ty }
export const buildComposites = (CANVAS_WIDTH, CANVAS_HEIGHT, viewport) => {
    const { sx, sy, tx, ty } = viewport;

    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);

    // Efficient order: make NR first, then reflect once
    const COMPOSITE_NR = M2D.multiply(DEVICE, WORLD);           // upright world→device
    const COMPOSITE    = M2D.multiply(REFLECT_Y, COMPOSITE_NR); // Y-up world pass

    const pixelToWorld = M2D.makePixelToWorld(COMPOSITE);
    return { COMPOSITE_NR, COMPOSITE, pixelToWorld };
};

export const makeStrokePx = (pixelToWorld) => (px) => pixelToWorld(px);


// Stateless world (Y-up) apply
export const applyWorld = (sk, COMPOSITE) => {
    sk.resetMatrix();
    sk.applyMatrix(...M2D.toArgs(COMPOSITE));
};

// Cached world (Y-up) apply — avoids toArgs every frame
export const makeApplyWorld = (sk, COMPOSITE) => {
    const args = M2D.toArgs(COMPOSITE);
    return () => { sk.resetMatrix(); sk.applyMatrix(...args); };
};

// World→Device mapper (captures matrix args once for efficiency)
export const makeWorldToDevice = (COMPOSITE_like) => {
    const [a, b, c, d, e, f] = M2D.toArgs(COMPOSITE_like);
    return (x, y) => [a * x + c * y + e, b * x + d * y + f];
};

// Device-space text at a world position (upright, true pixel size).
// Uses a provided world→device mapper so call sites are very clear.
export const createDeviceTextAtWorld = (sk, worldToDevice) => {
    // opts: { px=14, color=[255], h='CENTER', v='CENTER' }
    return (txt, wx, wy, opts = {}) => {
        const { px = 14, color = [255], h = 'CENTER', v = 'CENTER' } = opts;
        const [dx, dy] = worldToDevice(wx, wy);
        const [r = 255, g = r, b = r, a = 255] = color;

        sk.push();
        sk.resetMatrix();                 // device space (upright)
        sk.noStroke();
        sk.fill(r, g, b, a);
        sk.textAlign(sk[h], sk[v]);
        sk.textSize(px);                  // exact device pixels
        sk.text(txt, dx, dy);
        sk.pop();
    };
};

// Batch device-space text (set state once, draw many labels)
export const makeDeviceTextBatch = (sk) => {
    return (setup = { px: 14, color: [255], h: 'CENTER', v: 'CENTER' }) => {
        const { px = 14, color = [255], h = 'CENTER', v = 'CENTER' } = setup;
        const [r = 255, g = r, b = r, a = 255] = color;

        sk.resetMatrix();
        sk.noStroke();
        sk.fill(r, g, b, a);
        sk.textAlign(sk[h], sk[v]);
        sk.textSize(px);

        // returns a drawer that accepts device coords and text
        return (dx, dy, txt) => sk.text(txt, dx, dy);
    };
};
