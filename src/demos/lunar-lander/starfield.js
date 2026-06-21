// Deterministic layered starfield for the lunar lander backdrop.

const lcg = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const wrap = (v, max) => ((v % max) + max) % max;

export const createLunarStarfield = (seed, count = 180) => {
    const rand = lcg(seed);
    const layers = [
        { depth: 0.08, count: Math.floor(count * 0.48), alpha: 80, size: 1.0 },
        { depth: 0.18, count: Math.floor(count * 0.34), alpha: 125, size: 1.25 },
        { depth: 0.34, count: Math.floor(count * 0.18), alpha: 175, size: 1.6 },
    ];
    let t = 0;

    const stars = layers.flatMap((layer, layerIdx) =>
        Array.from({ length: layer.count }, () => ({
            x: rand(),
            y: rand(),
            layer,
            layerIdx,
            bright: rand() > 0.88,
            tw: 0.5 + rand() * 1.8,
            phase: rand() * Math.PI * 2,
        }))
    );

    const update = (dt) => {
        t += dt;
    };

    const display = (sk, camera, W, H) => {
        sk.resetMatrix();
        sk.noStroke();
        for (const star of stars) {
            const driftX = camera.center[0] * star.layer.depth * 0.0025;
            const driftY = camera.center[1] * star.layer.depth * 0.0035;
            const x = wrap((star.x + driftX) * W, W);
            const y = wrap((star.y - driftY) * H, H);
            const twinkle = 0.72 + 0.28 * Math.sin(t * star.tw + star.phase);
            const a = star.layer.alpha * twinkle * (star.bright ? 1.25 : 1);
            const d = star.layer.size * (star.bright ? 1.65 : 1);

            sk.fill(190, 220, 255, Math.min(235, a));
            sk.ellipse(x, y, d, d);
            if (star.bright) {
                sk.fill(140, 190, 255, 40 * twinkle);
                sk.ellipse(x, y, d * 3.4, d * 3.4);
            }
        }
    };

    return { update, display };
};
