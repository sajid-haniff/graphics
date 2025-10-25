import { neonLine } from './neon';

export const createBurst = (sk, x, y, colorHex, pixelToWorld, rays = 24, speed = 0.6, life = 24) => {
    const pos = sk.createVector(x, y);
    let t = 0;

    return {
        update() { t++; },
        draw() {
            const r1 = t * speed;
            const r2 = r1 + 0.6;
            for (let i = 0; i < rays; i++) {
                const a = (i / rays) * sk.TWO_PI;
                const x1 = -Math.sin(a) * r1, y1 = -Math.cos(a) * r1;
                const x2 = -Math.sin(a) * r2, y2 = -Math.cos(a) * r2;
                neonLine(sk, x1, y1, x2, y2, colorHex, pixelToWorld, 1.3);
            }
        },
        dead() { return t > life; }
    };
};
