// Transformation pipeline:
//
// [ World (win) ]
//        ↓
//  (map to NDC using win + view)
//        ↓
// [ View (NDC) ]
//        ↓
// (scale to canvas pixels)
//        ↓
// [ Device Space ]
//        ↓
// (flip Y and shift origin)
//        ↓
// [ Final Screen Output ]

export const applyStandardTransform = (sk, win, view, canvasWidth, canvasHeight) => {
    const sx = (view.right - view.left) / (win.right - win.left);
    const sy = (view.top - view.bottom) / (win.top - win.bottom);
    const tx = view.left - sx * win.left;
    const ty = view.bottom - sy * win.bottom;

    const a = canvasWidth * sx;
    const d = -canvasHeight * sy;
    const e = canvasWidth * tx;
    const f = canvasHeight * (1 - ty);

    sk.applyMatrix(a, 0, 0, d, e, f);
};

