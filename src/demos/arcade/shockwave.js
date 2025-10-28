// Expanding neon ring that fractures nearby asteroids.
// Factory (no classes). Uses world Y-up coords.

import { V } from '../../lib/esm/V';

export const createShockwave = (sk, centerV, THEME, pixelToWorld, opts = {}) => {
    const pos = V.clone(centerV);
    let r = 0;
    let life = opts.life ?? 36;          // frames
    const grow = opts.grow ?? 0.9;       // wu/frame

    const update = () => {
        r += grow;
        life--;
        return life > 0;
    };

    const draw = () => {
        sk.push();
        sk.noFill();

        // hot core ring
        sk.strokeWeight(pixelToWorld(2.4));
        sk.stroke(THEME.shock || '#ff7a33');
        sk.circle(pos[0], pos[1], r * 2);

        // outer glow
        sk.strokeWeight(pixelToWorld(1.2));
        sk.stroke(THEME.shock2 || '#ffe1a8');
        sk.circle(pos[0], pos[1], r * 1.55);

        sk.pop();
    };

    const affects = (asteroid) => {
        const dx = asteroid.position[0] - pos[0];
        const dy = asteroid.position[1] - pos[1];
        const dist = Math.hypot(dx, dy);
        return dist <= (r + asteroid.radius);
    };

    const radius = () => r;
    const position = () => pos;

    return { update, draw, affects, radius, position };
};
