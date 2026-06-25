// Reusable neon particle layer for Lunar Lander.
// All positions are Y-up world coordinates; p5 calls happen only in display().

const lcg = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const addParticle = (list, p, limit) => {
    list.push(p);
    if (list.length > limit) list.splice(0, list.length - limit);
};

export const createLunarParticles = (seed) => {
    const rand = lcg(seed);
    const plume = [];
    const dust = [];
    const padPulses = [];
    let plumeCarry = 0;
    let dustCarry = 0;
    let lightFlash = 0;

    const jitter = (scale = 1) => (rand() * 2 - 1) * scale;

    const emitPlume = (pos, exhaustDir, throttle, dt) => {
        plumeCarry += dt * (70 + 22 * throttle);
        const n = Math.min(8, Math.floor(plumeCarry));
        plumeCarry -= n;

        for (let i = 0; i < n; i++) {
            const side = [-exhaustDir.y, exhaustDir.x];
            const speed = 4.5 + rand() * 6.5;
            const spread = jitter(1.25);
            const life = 0.22 + rand() * 0.20;
            addParticle(plume, {
                pos: {
                    x: pos.x + side[0] * jitter(0.13),
                    y: pos.y + side[1] * jitter(0.13),
                },
                vel: {
                    x: exhaustDir.x * speed + side[0] * spread,
                    y: exhaustDir.y * speed + side[1] * spread,
                },
                size: 2.5 + rand() * 4.5,
                life,
                maxLife: life,
                heat: rand(),
            }, 180);
        }
    };

    const emitDust = (pos, exhaustDir, strength, dt) => {
        if (strength <= 0) return;
        dustCarry += dt * (42 + 48 * strength);
        const n = Math.min(10, Math.floor(dustCarry));
        dustCarry -= n;

        for (let i = 0; i < n; i++) {
            const horizontal = exhaustDir.x * 2.2 + jitter(2.4);
            const life = 0.55 + rand() * 0.60;
            addParticle(dust, {
                pos: { x: pos.x + jitter(1.8), y: pos.y + rand() * 0.28 },
                vel: {
                    x: horizontal * (0.7 + strength),
                    y: 0.7 + rand() * 2.1 + Math.max(0, -exhaustDir.y) * 0.55,
                },
                size: 4.0 + rand() * 8.0,
                life,
                maxLife: life,
            }, 140);
        }
    };

    const emitLandingDust = (pos, width = 5) => {
        for (let i = 0; i < 36; i++) {
            const dir = rand() < 0.5 ? -1 : 1;
            const life = 0.75 + rand() * 0.75;
            addParticle(dust, {
                pos: { x: pos.x + jitter(width * 0.5), y: pos.y + rand() * 0.35 },
                vel: {
                    x: dir * (1.5 + rand() * 6.0),
                    y: 0.8 + rand() * 2.4,
                },
                size: 5.0 + rand() * 9.0,
                life,
                maxLife: life,
            }, 180);
        }
    };

    const emitPadPulse = (pad, tier, strength, dt) => {
        if (!pad || strength <= 0) return;
        if (rand() > clamp(strength * dt * 9, 0, 0.75)) return;
        const life = 0.55 + rand() * 0.35;
        addParticle(padPulses, {
            x1: pad.x1,
            x2: pad.x2,
            y: pad.y,
            tier,
            life,
            maxLife: life,
            height: 0.6 + strength * 2.4,
        }, 30);
    };

    const flash = (amount = 1) => {
        lightFlash = Math.max(lightFlash, clamp(amount, 0, 1));
    };

    const updateList = (list, dt, fn) => {
        for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i];
            fn(p, dt);
            p.life -= dt;
            if (p.life <= 0) list.splice(i, 1);
        }
    };

    const update = (dt) => {
        updateList(plume, dt, (p) => {
            p.vel.y += 0.55 * dt;
            p.vel.x *= Math.exp(-0.9 * dt);
            p.vel.y *= Math.exp(-0.7 * dt);
            p.pos.x += p.vel.x * dt;
            p.pos.y += p.vel.y * dt;
        });
        updateList(dust, dt, (p) => {
            p.vel.y -= 0.38 * dt;
            p.vel.x *= Math.exp(-1.35 * dt);
            p.vel.y *= Math.exp(-0.75 * dt);
            p.pos.x += p.vel.x * dt;
            p.pos.y += p.vel.y * dt;
        });
        updateList(padPulses, dt, () => {});
        lightFlash = Math.max(0, lightFlash - dt * 3.8);
    };

    const display = (sk, pixelToWorld, colors) => {
        sk.push();
        sk.noStroke();

        for (const p of padPulses) {
            const a = clamp(p.life / p.maxLife, 0, 1);
            const col = sk.color(colors.pads[p.tier] || colors.pads.standard);
            const grow = (1 - a) * p.height;
            sk.fill(sk.red(col), sk.green(col), sk.blue(col), 22 * a);
            sk.rect(p.x1 - grow, p.y - pixelToWorld(5), (p.x2 - p.x1) + grow * 2, pixelToWorld(10) + grow * 0.38);
            sk.fill(sk.red(col), sk.green(col), sk.blue(col), 65 * a);
            sk.rect(p.x1, p.y - pixelToWorld(2.2), p.x2 - p.x1, pixelToWorld(4.4));
        }

        const dustColor = colors.particles.dust;
        for (const p of dust) {
            const a = clamp(p.life / p.maxLife, 0, 1);
            const d = pixelToWorld(p.size) * (1.1 + (1 - a) * 1.2);
            sk.fill(dustColor[0], dustColor[1], dustColor[2], 58 * a);
            sk.ellipse(p.pos.x, p.pos.y, d * 1.5, d * 0.82);
        }

        const core = colors.particles.engineCore;
        const glow = colors.particles.engineGlow;
        for (const p of plume) {
            const a = clamp(p.life / p.maxLife, 0, 1);
            const d = pixelToWorld(p.size) * (0.65 + (1 - a) * 1.4);
            if (p.heat > 0.58) {
                sk.fill(core[0], core[1], core[2], 185 * a);
            } else {
                sk.fill(glow[0], glow[1], glow[2], 115 * a);
            }
            sk.ellipse(p.pos.x, p.pos.y, d, d);
        }

        sk.pop();
    };

    const flashAlpha = () => lightFlash;

    return {
        emitPlume,
        emitDust,
        emitLandingDust,
        emitPadPulse,
        flash,
        update,
        display,
        flashAlpha,
    };
};
