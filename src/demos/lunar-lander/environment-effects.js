// Deterministic, bounded visual environment effects for planet profiles.
// Device-space passes draw haze/aurora; world-space passes draw meteors/ice.

const lcg = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const addBounded = (list, item, max) => {
    list.push(item);
    if (list.length > max) list.splice(0, list.length - max);
};

export const createEnvironmentEffects = (seed) => {
    const rand = lcg(seed);
    const meteors = [];
    const iceRain = [];
    let t = 0;
    let meteorCarry = 0;
    let iceCarry = 0;

    const resetTransient = () => {
        meteors.length = 0;
        iceRain.length = 0;
        meteorCarry = 0;
        iceCarry = 0;
    };

    const spawnMeteor = (win) => {
        const x = win.left + (win.right - win.left) * (0.08 + rand() * 0.84);
        const y = win.top + 8 + rand() * 18;
        const life = 1.55 + rand() * 0.95;
        addBounded(meteors, {
            pos: { x, y },
            vel: { x: -19 - rand() * 24, y: -22 - rand() * 24 },
            life,
            maxLife: life,
            size: 3.2 + rand() * 2.8,
        }, 28);
    };

    const spawnIce = (win) => {
        const x = win.left + (win.right - win.left) * rand();
        const y = win.top + 3 + rand() * 7;
        addBounded(iceRain, {
            pos: { x, y },
            vel: { x: -1.5 + rand() * 3, y: -22 - rand() * 12 },
            life: 1.1 + rand() * 0.5,
            maxLife: 1.1 + rand() * 0.5,
            len: 1.2 + rand() * 2.6,
        }, 90);
    };

    const update = (dt, planet, visibleWin) => {
        t += dt;
        const fx = planet.environmentFx || {};

        meteorCarry += dt * (fx.meteors || 0);
        while (meteorCarry >= 1) {
            spawnMeteor(visibleWin);
            meteorCarry -= 1;
        }

        iceCarry += dt * 90 * (fx.iceRain || 0);
        while (iceCarry >= 1) {
            spawnIce(visibleWin);
            iceCarry -= 1;
        }

        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.pos.x += m.vel.x * dt;
            m.pos.y += m.vel.y * dt;
            m.life -= dt;
            if (m.life <= 0) meteors.splice(i, 1);
        }
        for (let i = iceRain.length - 1; i >= 0; i--) {
            const r = iceRain[i];
            r.pos.x += r.vel.x * dt;
            r.pos.y += r.vel.y * dt;
            r.life -= dt;
            if (r.life <= 0) iceRain.splice(i, 1);
        }
    };

    const displayDevice = (sk, planet, colorProfile, W, H) => {
        const fx = planet.environmentFx || {};
        const haze = clamp(fx.haze || 0, 0, 1);
        const aurora = clamp(fx.aurora || 0, 0, 1);

        sk.resetMatrix();
        sk.noStroke();
        if (haze > 0) {
            const [r, g, b] = colorProfile.world.haze;
            sk.fill(r, g, b, 28 * haze);
            sk.rect(0, 0, W, H);
        }

        if (aurora > 0) {
            const [r, g, b] = colorProfile.effects.aurora;
            for (let i = 0; i < 3; i++) {
                const y = H * (0.12 + i * 0.075) +
                    Math.sin(t * (0.35 + i * 0.11) + i * 2.3) * H * 0.025;
                sk.fill(r, g, b, (18 + i * 9) * aurora);
                sk.beginShape();
                sk.vertex(0, y);
                for (let x = 0; x <= W; x += W / 8) {
                    const yy = y + Math.sin(t * 0.8 + x * 0.018 + i) * H * 0.035;
                    sk.vertex(x, yy);
                }
                sk.vertex(W, y + H * 0.16);
                sk.vertex(0, y + H * 0.14);
                sk.endShape(sk.CLOSE);
            }
        }
    };

    const displayWorld = (sk, planet, colorProfile, pixelToWorld) => {
        const fx = planet.environmentFx || {};
        sk.push();
        sk.noFill();

        for (const m of meteors) {
            const a = clamp(m.life / m.maxLife, 0, 1);
            const [r, g, b] = colorProfile.effects.meteor;
            const core = colorProfile.effects.shockCore;
            const tailX = m.pos.x - m.vel.x * 0.22;
            const tailY = m.pos.y - m.vel.y * 0.22;
            const midX = m.pos.x - m.vel.x * 0.11;
            const midY = m.pos.y - m.vel.y * 0.11;

            sk.stroke(r, g, b, 52 * a);
            sk.strokeWeight(pixelToWorld(10.0 * a + 1.8));
            sk.line(m.pos.x, m.pos.y, tailX, tailY);
            sk.stroke(r, g, b, 128 * a);
            sk.strokeWeight(pixelToWorld(4.8 * a + 0.9));
            sk.line(m.pos.x, m.pos.y, tailX, tailY);
            sk.stroke(core[0], core[1], core[2], 210 * a);
            sk.strokeWeight(pixelToWorld(1.4));
            sk.line(m.pos.x, m.pos.y, midX, midY);
        }

        for (const rDrop of iceRain) {
            const a = clamp(rDrop.life / rDrop.maxLife, 0, 1);
            const [r, g, b] = colorProfile.effects.ice;
            sk.stroke(r, g, b, 95 * a);
            sk.strokeWeight(pixelToWorld(1.1));
            sk.line(
                rDrop.pos.x,
                rDrop.pos.y,
                rDrop.pos.x - rDrop.vel.x * 0.04,
                rDrop.pos.y - rDrop.len
            );
        }

        if ((fx.volcanic || 0) > 0) {
            const a = (0.35 + 0.65 * Math.sin(t * 1.7) ** 2) * fx.volcanic;
            const [r, g, b] = colorProfile.effects.volcanic;
            sk.noStroke();
            sk.fill(r, g, b, 20 * a);
            sk.rect(-10000, -1000, 20000, 1000);
        }

        sk.pop();
    };

    return { resetTransient, update, displayDevice, displayWorld };
};
