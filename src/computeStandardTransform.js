// utils/computeStandardTransform.js

// Computes a single 2D affine matrix that maps from 'win' to 'view' NDC,
// scales to canvas pixels, and flips Y to match p5.js screen coords.
//
// Returns an array [a, b, c, d, e, f] ready to pass into sk.applyMatrix(...)

export const computeStandardTransform = (win, view, canvasWidth, canvasHeight) => {
    const sx = (view.right - view.left) / (win.right - win.left);
    const sy = (view.top - view.bottom) / (win.top - win.bottom);
    const tx = view.left - sx * win.left;
    const ty = view.bottom - sy * win.bottom;

    const a = canvasWidth * sx;
    const b = 0;
    const c = 0;
    const d = -canvasHeight * sy;
    const e = canvasWidth * tx;
    const f = canvasHeight * (1 - ty);

    return [a, b, c, d, e, f];
};
