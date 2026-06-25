// Glowing vector fragment explosion for the lunar lander.

const lcg = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const rot = (p, theta) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    return { x: p.x * c + p.y * s, y: -p.x * s + p.y * c };
};

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

const bodySegments = (bodyPts, legL, legR) => {
    const segs = [];
    for (let i = 0; i < bodyPts.length; i++) {
        segs.push([bodyPts[i], bodyPts[(i + 1) % bodyPts.length]]);
    }
    segs.push([legL[0], legL[1]]);
    segs.push([legR[0], legR[1]]);
    return segs;
};

export const createLanderExplosion = (seed, state, geometry) => {
    const rand = lcg(seed);
    const origin = { x: state.pos[0], y: state.pos[1] };
    const baseVel = { x: state.vel[0], y: state.vel[1] };
    const fragments = [];
    const sparks = [];
    let shockLife = 0.72;
    let shockRadius = 0.3;
    let flashLife = 0.24;

    for (const seg of bodySegments(geometry.bodyPts, geometry.legL, geometry.legR)) {
        const a = add(origin, rot(seg[0], state.theta));
        const b = add(origin, rot(seg[1], state.theta));
        const mid = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
        const burst = 3.5 + rand() * 8.5;
        const ang = rand() * Math.PI * 2;
        fragments.push({
            pos: mid,
            vel: {
                x: baseVel.x * 0.45 + Math.cos(ang) * burst,
                y: baseVel.y * 0.45 + Math.sin(ang) * burst + rand() * 3,
            },
            a: sub(a, mid),
            b: sub(b, mid),
            angle: 0,
            omega: (rand() - 0.5) * 10,
            life: 1.0,
            maxLife: 1.0 + rand() * 0.55,
        });
    }

    for (let i = 0; i < 34; i++) {
        const ang = rand() * Math.PI * 2;
        const speed = 5 + rand() * 22;
        sparks.push({
            pos: { ...origin },
            vel: {
                x: baseVel.x * 0.25 + Math.cos(ang) * speed,
                y: baseVel.y * 0.25 + Math.sin(ang) * speed,
            },
            life: 0.45 + rand() * 0.55,
            maxLife: 0.45 + rand() * 0.55,
        });
    }

    const update = (dt) => {
        shockRadius += 42 * dt;
        shockLife -= dt;
        flashLife -= dt;
        for (const f of fragments) {
            f.vel.y -= 1.62 * dt;
            f.pos.x += f.vel.x * dt;
            f.pos.y += f.vel.y * dt;
            f.angle += f.omega * dt;
            f.life -= dt;
        }
        for (const s of sparks) {
            s.vel.y -= 1.62 * dt;
            s.pos.x += s.vel.x * dt;
            s.pos.y += s.vel.y * dt;
            s.life -= dt;
        }
    };

    const display = (sk, pixelToWorld, colors) => {
        const fx = colors.effects;
        const spark = colors.particles.spark;
        const bloom = colors.bloom || 1;
        sk.push();
        if (shockLife > 0) {
            const a = Math.max(0, shockLife / 0.72);
            const shock = fx.shock;
            const shockCore = fx.shockCore;
            sk.noFill();
            sk.stroke(shock[0], shock[1], shock[2], 150 * a * bloom);
            sk.strokeWeight(pixelToWorld((4.4 * a + 0.6) * Math.min(1.35, bloom)));
            sk.circle(origin.x, origin.y, shockRadius * 2);
            sk.stroke(shockCore[0], shockCore[1], shockCore[2], 95 * a);
            sk.strokeWeight(pixelToWorld(1.4));
            sk.circle(origin.x, origin.y, shockRadius * 1.35);
        }
        if (flashLife > 0) {
            const a = Math.max(0, flashLife / 0.24);
            const flash = fx.flash;
            sk.noStroke();
            sk.fill(flash[0], flash[1], flash[2], 62 * a * bloom);
            sk.ellipse(origin.x, origin.y, shockRadius * 1.25, shockRadius * 1.25);
        }
        for (const f of fragments) {
            if (f.life <= 0) continue;
            const a = Math.max(0, f.life / f.maxLife);
            const p1 = add(f.pos, rot(f.a, f.angle));
            const p2 = add(f.pos, rot(f.b, f.angle));
            sk.stroke(fx.explosion[0], fx.explosion[1], fx.explosion[2], 190 * a * bloom);
            sk.strokeWeight(pixelToWorld((4.0 * a + 0.8) * Math.min(1.25, bloom)));
            sk.line(p1.x, p1.y, p2.x, p2.y);
            sk.stroke(fx.explosionCore[0], fx.explosionCore[1], fx.explosionCore[2], 240 * a);
            sk.strokeWeight(pixelToWorld(1.2));
            sk.line(p1.x, p1.y, p2.x, p2.y);
        }
        sk.noStroke();
        for (const s of sparks) {
            if (s.life <= 0) continue;
            const a = Math.max(0, s.life / s.maxLife);
            const d = pixelToWorld(3.5 * a + 1);
            sk.fill(spark[0], spark[1], spark[2], 210 * a);
            sk.ellipse(s.pos.x, s.pos.y, d, d);
        }
        sk.pop();
    };

    const done = () =>
        shockLife <= 0 && flashLife <= 0 &&
        fragments.every(f => f.life <= 0) && sparks.every(s => s.life <= 0);

    const flashAlpha = () => Math.max(0, flashLife / 0.24);

    return { update, display, done, flashAlpha };
};
