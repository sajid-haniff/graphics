// src/adv-game-design/library/scenegraph-pointer.js
// Pointer helper for the scenegraph stack.
// - Uses sg.COMPOSITE to map screen (device) -> world (Y-up).
// - No event binding: you call pointer.update() each frame from your demo.

import { M2D } from "../../lib/esm/M2D";

export const createPointer = (sk, scenegraph) => {
    const { COMPOSITE } = scenegraph;

    // Invert COMPOSITE to get DEVICE -> WORLD transform
    const INV = M2D.invert(COMPOSITE);
    const a = INV[0], b = INV[1], c = INV[2], d = INV[3], e = INV[4], f = INV[5];

    const screenToWorld = (sx, sy) => {
        // mat2d: [a,b,c,d,e,f] with x' = a*x + c*y + e, y' = b*x + d*y + f
        const wx = a * sx + c * sy + e;
        const wy = b * sx + d * sy + f;
        return [wx, wy];
    };

    const pointer = {
        x: 0,
        y: 0,
        isDown: false,
        isUp: true,
        tapped: false,

        _prevDown: false,

        update() {
            // Device-space mouse from p5
            const mx = sk.mouseX;
            const my = sk.mouseY;

            const [wx, wy] = screenToWorld(mx, my);
            pointer.x = wx;
            pointer.y = wy;

            const down = !!sk.mouseIsPressed;
            pointer.isDown = down;
            pointer.isUp   = !down;

            // "Tapped" = went from down to up
            pointer.tapped = !down && pointer._prevDown;
            pointer._prevDown = down;
        },

        // Simple AABB hit test in world space.
        // Uses node.gx/gy and width/height just like display.js did.
        hitTestSprite(node) {
            if (!node) return false;
            const left   = node.gx;
            const right  = node.gx + node.width;
            const bottom = node.gy;
            const top    = node.gy + node.height;
            return (
                pointer.x >= left && pointer.x <= right &&
                pointer.y >= bottom && pointer.y <= top
            );
        }
    };

    return pointer;
};

