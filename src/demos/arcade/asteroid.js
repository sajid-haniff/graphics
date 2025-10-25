import { randRange, wrap } from './utils';
import { neonPoly } from './neon';

export const createAsteroid = (sk, x, y, radius, vx, vy, THEME, pixelToWorld, win) => {
    const verts = (() => {
        const count = Math.max(8, Math.floor(radius * 7));
        const pts = [];
        for (let i = 0; i < count; i++) {
            const t = (i / count) * sk.TWO_PI;
            const r = radius * (1 + randRange(-0.28, 0.28));
            // Y-up polygon (tip towards +Y)
            pts.push({ x: -Math.sin(t) * r, y: -Math.cos(t) * r });
        }
        return pts;
    })();

    const position = sk.createVector(x, y);
    const velocity = sk.createVector(vx, vy);
    let angleDeg = randRange(0, 360);
    const spinDeg = randRange(-1.2, 1.2);

    return {
        radius,
        position,
        velocity,
        verts,
        update() {
            position.add(velocity);
            angleDeg = (angleDeg + spinDeg + 360) % 360;
            position.x = wrap(position.x, win.left, win.right);
            position.y = wrap(position.y, win.bottom, win.top);
        },
        draw() {
            sk.push();
            sk.translate(position.x, position.y);
            sk.rotate(sk.radians(angleDeg));
            neonPoly(sk, verts, THEME.asteroid, pixelToWorld, 1.5, true);
            sk.pop();
        }
    };
};

export const spawnField = (sk, asteroids, count, THEME, pixelToWorld, win) => {
    for (let i = 0; i < count; i++) {
        const r = randRange(1.6, 2.4);
        let x, y;
        do {
            x = randRange(win.left + r, win.right - r);
            y = randRange(win.bottom + r, win.top - r);
        } while (Math.hypot(x, y) < 5); // avoid center (ship spawn)
        const base = randRange(0.02, 0.06);
        const ang = randRange(0, 360);
        const vx = base * Math.cos(sk.radians(ang));
        const vy = base * Math.sin(sk.radians(ang));
        asteroids.push(createAsteroid(sk, x, y, r, vx, vy, THEME, pixelToWorld, win));
    }
};
