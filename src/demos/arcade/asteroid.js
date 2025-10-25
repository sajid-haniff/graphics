import { V } from '../../lib/esm/V';
import { randRange, wrap } from './utils';
import { neonPoly } from './neon';

// Factory: single asteroid
// positionV, velocityV are V vec2 (Float32Array[2])
export const createAsteroid = (sk, positionV, radius, velocityV, THEME, pixelToWorld, win) => {
    // Procedural jaggy outline (Y-up, tip direction +Y)
    const verts = (() => {
        const count = Math.max(8, Math.floor(radius * 7));
        const pts = [];
        for (let i = 0; i < count; i++) {
            const t = (i / count) * sk.TWO_PI;
            const r = radius * (1 + randRange(-0.28, 0.28));
            // canonical asteroid ring (Y-up)
            pts.push({ x: -Math.sin(t) * r, y: -Math.cos(t) * r });
        }
        return pts;
    })();

    const position = positionV; // V vec2
    const velocity = velocityV; // V vec2
    let angleDeg = randRange(0, 360);
    const spinDeg = randRange(-1.2, 1.2); // deg/frame

    return {
        radius,
        position,
        velocity,
        verts,

        update() {
            // pos += vel
            V.set(position, position[0] + velocity[0], position[1] + velocity[1]);

            // wrap world
            position[0] = wrap(position[0], win.left, win.right);
            position[1] = wrap(position[1], win.bottom, win.top);

            // spin
            angleDeg = (angleDeg + spinDeg + 360) % 360;
        },

        draw() {
            sk.push();
            sk.translate(position[0], position[1]);
            sk.rotate(sk.radians(angleDeg)); // visual spin (Y flip handled by composite)
            neonPoly(sk, verts, THEME.asteroid, pixelToWorld, 1.5, true);
            sk.pop();
        }
    };
};

// Spawner: populate an initial field of large asteroids
export const spawnField = (sk, asteroids, count, THEME, pixelToWorld, win) => {
    for (let i = 0; i < count; i++) {
        const r = randRange(1.6, 2.4);

        // keep initial spawn away from the center (ship start)
        let x, y;
        do {
            x = randRange(win.left + r, win.right - r);
            y = randRange(win.bottom + r, win.top - r);
        } while (Math.hypot(x, y) < 5);

        const base = randRange(0.02, 0.06);
        const ang  = sk.radians(randRange(0, 360));
        const vx   = base * Math.cos(ang);
        const vy   = base * Math.sin(ang);

        asteroids.push(
            createAsteroid(
                sk,
                V.create(x, y),
                r,
                V.create(vx, vy),
                THEME,
                pixelToWorld,
                win
            )
        );
    }
};
