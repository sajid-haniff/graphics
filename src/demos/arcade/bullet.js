// /src/demo/arcade/bullet.js
// Bullet entity (V + neon).
// - World space is Y-up. Rendering flip handled by the composite matrix in the demo.
// - Uses V for position/velocity.
// - Pixel-consistent glow via pixelToWorld.

import { V } from '../../lib/esm/V';
import { wrap } from './utils';
import { neonDot } from './neon';

/**
 * createBullet
 * @param {object} sk            p5 instance (sk)
 * @param {vec2}   startPosV     V vec2 (Float32Array[2]) starting position (world Y-up)
 * @param {vec2}   dirV          V vec2 normalized direction (use -rotDeg when built)
 * @param {object} THEME         palette object (uses THEME.bullet)
 * @param {fn}     pixelToWorld  (px:number)=>worldUnits:number
 * @param {object} win           world bounds {left,right,bottom,top}
 * @param {number} speed         world units per frame (default 0.5)
 * @param {number} life          lifetime in frames (default 60)
 */
export const createBullet = (
    sk,
    startPosV,
    dirV,
    THEME,
    pixelToWorld,
    win,
    speed = 0.5,
    life = 60
) => {
    const position = V.clone(startPosV);
    const velocity = V.scale(dirV, speed);
    let frames = life;

    const update = () => {
        // pos += vel
        V.set(position, position[0] + velocity[0], position[1] + velocity[1]);

        // wrap world
        position[0] = wrap(position[0], win.left, win.right);
        position[1] = wrap(position[1], win.bottom, win.top);

        frames -= 1;
    };

    const draw = () => {
        sk.push();
        sk.translate(position[0], position[1]);
        neonDot(sk, 3, THEME.bullet, pixelToWorld); // ~6px diameter glow
        sk.pop();
    };

    const dead = () => frames <= 0;

    return { position, update, draw, dead };
};
