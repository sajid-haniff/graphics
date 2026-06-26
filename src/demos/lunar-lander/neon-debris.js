// Vector CRT / XY-monitor debris helpers and deterministic systems.
// All world geometry is Y-up. All drawing goes through sk.

export const DEBRIS_TYPES = {
    LARGE_ASTEROID: 'LARGE_ASTEROID',
    SMALL_METEOR: 'SMALL_METEOR',
    CRYSTAL_FRAGMENT: 'CRYSTAL_FRAGMENT',
    FIREBALL: 'FIREBALL',
    ICE_SHARD: 'ICE_SHARD',
    VOLCANIC_CINDER: 'VOLCANIC_CINDER',
};

const WHITE = [255, 255, 255];

const lcg = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const choose = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
const addBounded = (list, item, max) => {
    list.push(item);
    if (list.length > max) list.splice(0, list.length - max);
};

const rot = (p, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};

const makeJaggedLoop = (rand, radius, count, jag = 0.4) =>
    Array.from({ length: count }, (_, i) => {
        const a = i / count * Math.PI * 2;
        const r = radius * (1 - jag * 0.55 + rand() * jag);
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });

const makeCrystal = (radius) => [
    { x: 0, y: radius * 1.35 },
    { x: radius * 0.75, y: radius * 0.42 },
    { x: radius * 0.45, y: -radius * 0.65 },
    { x: 0, y: -radius * 1.2 },
    { x: -radius * 0.55, y: -radius * 0.48 },
    { x: -radius * 0.72, y: radius * 0.45 },
];

const makeShard = (radius, lean = 0.45) => [
    { x: -radius * lean, y: radius * 1.15 },
    { x: radius * 0.34, y: radius * 0.18 },
    { x: radius * lean, y: -radius * 1.12 },
    { x: -radius * 0.28, y: -radius * 0.16 },
];

const worldVerts = (body) =>
    body.vertices.map(v => {
        const p = rot(v, body.angle);
        return { x: p.x + body.pos.x, y: p.y + body.pos.y };
    });

export const drawNeonPolyline = (sk, vertices, closeShape, baseColor, pixelToWorld, intensity = 1) => {
    if (!vertices || vertices.length < 2) return;
    const glow = clamp(intensity, 0.25, 3.0);
    sk.push();
    sk.noFill();

    sk.stroke(baseColor[0], baseColor[1], baseColor[2], 46 * glow);
    sk.strokeWeight(pixelToWorld(10.5 * glow + 1.2));
    sk.beginShape();
    for (const v of vertices) sk.vertex(v.x, v.y);
    if (closeShape) sk.endShape(sk.CLOSE);
    else sk.endShape();

    sk.stroke(baseColor[0], baseColor[1], baseColor[2], 132 * glow);
    sk.strokeWeight(pixelToWorld(3.8 * glow + 0.7));
    sk.beginShape();
    for (const v of vertices) sk.vertex(v.x, v.y);
    if (closeShape) sk.endShape(sk.CLOSE);
    else sk.endShape();

    sk.stroke(WHITE[0], WHITE[1], WHITE[2], 245);
    sk.strokeWeight(pixelToWorld(1.1));
    sk.beginShape();
    for (const v of vertices) sk.vertex(v.x, v.y);
    if (closeShape) sk.endShape(sk.CLOSE);
    else sk.endShape();
    sk.pop();
};

export const drawNeonLine = (sk, a, b, baseColor, pixelToWorld, intensity = 1) =>
    drawNeonPolyline(sk, [a, b], false, baseColor, pixelToWorld, intensity);

export const drawNeonPoint = (sk, p, baseColor, pixelToWorld, sizePx = 4, intensity = 1) => {
    const s = pixelToWorld(sizePx);
    sk.push();
    sk.noFill();
    sk.stroke(baseColor[0], baseColor[1], baseColor[2], 60 * intensity);
    sk.strokeWeight(pixelToWorld(3.2 * intensity));
    sk.line(p.x - s, p.y, p.x + s, p.y);
    sk.line(p.x, p.y - s, p.x, p.y + s);
    sk.stroke(WHITE[0], WHITE[1], WHITE[2], 230);
    sk.strokeWeight(pixelToWorld(0.9));
    sk.line(p.x - s * 0.45, p.y, p.x + s * 0.45, p.y);
    sk.line(p.x, p.y - s * 0.45, p.x, p.y + s * 0.45);
    sk.pop();
};

export const drawNeonLabel = (sk, text, x, y, baseColor, alpha = 1, align = sk.LEFT, size = 11) => {
    sk.push();
    sk.textFont('monospace');
    sk.textAlign(align, sk.TOP);
    sk.noStroke();
    sk.textSize(size);
    sk.fill(baseColor[0], baseColor[1], baseColor[2], 95 * alpha);
    sk.text(text, x + 1, y + 1);
    sk.fill(WHITE[0], WHITE[1], WHITE[2], 215 * alpha);
    sk.text(text, x, y);
    sk.pop();
};

export const createNeonShardSystem = (seed) => {
    const rand = lcg(seed);
    const shards = [];

    const burst = (pos, color, count = 10, power = 12, max = 240) => {
        for (let i = 0; i < count; i++) {
            const a = rand() * Math.PI * 2;
            const speed = power * (0.35 + rand());
            const ttl = 0.45 + rand() * 0.95;
            addBounded(shards, {
                pos: { x: pos.x, y: pos.y },
                vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
                angle: a,
                omega: (rand() - 0.5) * 12,
                length: 0.7 + rand() * 3.2,
                life: ttl,
                ttl,
                color,
            }, max);
        }
    };

    const update = (dt, dragRate = 3.2) => {
        const speedFactor = Math.exp(-dragRate * dt);
        for (let i = shards.length - 1; i >= 0; i--) {
            const s = shards[i];
            s.vel.x *= speedFactor;
            s.vel.y *= speedFactor;
            s.pos.x += s.vel.x * dt;
            s.pos.y += s.vel.y * dt;
            s.angle += s.omega * dt;
            s.life -= dt;
            if (s.life <= 0) shards.splice(i, 1);
        }
    };

    const display = (sk, pixelToWorld, bloom = 1) => {
        for (const s of shards) {
            const a = clamp(s.life / s.ttl, 0, 1);
            const dx = Math.cos(s.angle) * s.length;
            const dy = Math.sin(s.angle) * s.length;
            drawNeonLine(
                sk,
                { x: s.pos.x - dx, y: s.pos.y - dy },
                { x: s.pos.x + dx, y: s.pos.y + dy },
                s.color,
                pixelToWorld,
                bloom * a
            );
        }
    };

    return { burst, update, display, count: () => shards.length };
};

export const createNeonDebrisSystem = (seed) => {
    const rand = lcg(seed);
    const debris = [];
    const logs = [];
    const carries = {};
    const shards = createNeonShardSystem(seed ^ 0x9e3779b9);
    let t = 0;

    const pushLog = (text, color, ttl = 2.2) => {
        addBounded(logs, { text, color, ttl, life: ttl }, 8);
    };

    const reset = () => {
        debris.length = 0;
        logs.length = 0;
        for (const k of Object.keys(carries)) carries[k] = 0;
    };

    const spawnPosTop = (win) => ({
        x: win.left + (win.right - win.left) * (0.08 + rand() * 0.84),
        y: win.top + (win.top - win.bottom) * (0.05 + rand() * 0.18),
    });

    const spawnPosRight = (win) => ({
        x: win.right + (win.right - win.left) * (0.05 + rand() * 0.16),
        y: win.bottom + (win.top - win.bottom) * (0.18 + rand() * 0.72),
    });

    const spawnPosBottom = (win) => ({
        x: win.left + (win.right - win.left) * rand(),
        y: win.bottom - (win.top - win.bottom) * (0.02 + rand() * 0.08),
    });

    const colorsFor = (type, env, colorProfile) => {
        const p = env.palette || {};
        if (type === DEBRIS_TYPES.LARGE_ASTEROID) return [p.asteroid || [255, 153, 0], p.fireball || [255, 255, 68]];
        if (type === DEBRIS_TYPES.CRYSTAL_FRAGMENT) return [p.crystal || [0, 255, 255], p.ice || [255, 255, 255]];
        if (type === DEBRIS_TYPES.ICE_SHARD) return [p.ice || [0, 255, 255], [255, 255, 255]];
        if (type === DEBRIS_TYPES.VOLCANIC_CINDER) return [p.cinder || [255, 34, 68], p.lava || [255, 153, 0]];
        if (type === DEBRIS_TYPES.FIREBALL) return [p.fireball || [255, 153, 0], [255, 255, 68]];
        return [p.meteor || colorProfile.effects.meteor, p.fireball || [255, 0, 255]];
    };

    const makeDebris = (type, win, env, colorProfile) => {
        const [color, glowColor] = colorsFor(type, env, colorProfile);
        let d;
        if (type === DEBRIS_TYPES.LARGE_ASTEROID) {
            const radius = 3.8 + rand() * 5.2;
            d = {
                type,
                pos: spawnPosRight(win),
                vel: { x: -5 - rand() * 7, y: -2 + rand() * 4 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 1.7,
                radius,
                vertices: makeJaggedLoop(rand, radius, 10 + Math.floor(rand() * 5), 0.55),
                trail: [],
                trailMax: 8,
                pulse: 1,
                life: 20,
                ttl: 20,
                label: 'LARGE_ASTEROID',
                color,
                glowColor,
                motionMode: 'slowTumble',
                hazard: true,
            };
        } else if (type === DEBRIS_TYPES.CRYSTAL_FRAGMENT) {
            const radius = 2.0 + rand() * 2.8;
            const pos = spawnPosTop(win);
            d = {
                type,
                pos,
                vel: { x: -8 + rand() * 16, y: -8 - rand() * 10 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 4,
                radius,
                vertices: makeCrystal(radius),
                trail: [],
                trailMax: 5,
                pulse: 1,
                life: 9,
                ttl: 9,
                label: 'CRYSTAL_FRAGMENT',
                color,
                glowColor,
                motionMode: 'swirl',
                swirl: { x: pos.x + (rand() - 0.5) * 28, y: pos.y - 18 - rand() * 18, strength: 4 + rand() * 7 },
                hazard: false,
            };
        } else if (type === DEBRIS_TYPES.ICE_SHARD) {
            const radius = 1.2 + rand() * 2.0;
            d = {
                type,
                pos: spawnPosTop(win),
                vel: { x: -3 + rand() * 6, y: -23 - rand() * 21 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 5,
                radius,
                vertices: makeShard(radius, 0.55),
                trail: [],
                trailMax: 6,
                pulse: 1,
                life: 5,
                ttl: 5,
                label: 'ICE_RAIN',
                color,
                glowColor,
                motionMode: 'fallingRain',
                hazard: false,
            };
        } else if (type === DEBRIS_TYPES.VOLCANIC_CINDER) {
            const radius = 0.9 + rand() * 2.0;
            d = {
                type,
                pos: spawnPosBottom(win),
                vel: { x: -10 + rand() * 20, y: 13 + rand() * 22 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 10,
                radius,
                vertices: makeJaggedLoop(rand, radius, 5 + Math.floor(rand() * 4), 0.60),
                trail: [],
                trailMax: 7,
                pulse: 1,
                life: 4.5,
                ttl: 4.5,
                label: 'VOLCANIC_CINDER',
                color,
                glowColor,
                motionMode: 'eruptionArc',
                hazard: true,
            };
        } else {
            const fire = type === DEBRIS_TYPES.FIREBALL;
            const radius = fire ? 2.4 + rand() * 2.8 : 1.2 + rand() * 1.8;
            d = {
                type,
                pos: spawnPosTop(win),
                vel: {
                    x: (fire ? -34 : -24) - rand() * (fire ? 34 : 24),
                    y: (fire ? -31 : -22) - rand() * (fire ? 28 : 20),
                },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * (fire ? 5 : 8),
                radius,
                vertices: fire ? makeJaggedLoop(rand, radius, 8, 0.5) : makeJaggedLoop(rand, radius, 5 + Math.floor(rand() * 4), 0.5),
                trail: [],
                trailMax: fire ? 24 : 16,
                pulse: 1,
                life: fire ? 4.8 : 3.4,
                ttl: fire ? 4.8 : 3.4,
                label: fire ? 'FIREBALL' : 'SMALL_METEOR',
                color,
                glowColor,
                motionMode: fire ? 'grazingMeteor' : 'linear',
                hazard: true,
            };
        }
        addBounded(debris, d, env.maxDebris || 24);
        if (d.hazard && rand() > 0.55) pushLog(d.label, d.color);
    };

    const spawnByRate = (key, rate, type, dt, win, env, colorProfile) => {
        if (!rate) return;
        carries[key] = (carries[key] || 0) + rate * dt;
        while (carries[key] >= 1) {
            makeDebris(type, win, env, colorProfile);
            carries[key] -= 1;
        }
    };

    const enforceActivity = (win, env, colorProfile) => {
        const minActive = env.minActive || 0;
        if (debris.length >= minActive) return;
        const sequence = env.activityTypes || [
            DEBRIS_TYPES.SMALL_METEOR,
            DEBRIS_TYPES.FIREBALL,
            DEBRIS_TYPES.CRYSTAL_FRAGMENT,
            DEBRIS_TYPES.LARGE_ASTEROID,
        ];
        while (debris.length < minActive) makeDebris(choose(rand, sequence), win, env, colorProfile);
    };

    const update = (dt, win, env, state, colorProfile) => {
        t += dt;
        spawnByRate('meteor', env.meteorRate, DEBRIS_TYPES.SMALL_METEOR, dt, win, env, colorProfile);
        spawnByRate('asteroid', env.asteroidRate, DEBRIS_TYPES.LARGE_ASTEROID, dt, win, env, colorProfile);
        spawnByRate('crystal', env.crystalRate, DEBRIS_TYPES.CRYSTAL_FRAGMENT, dt, win, env, colorProfile);
        spawnByRate('fireball', env.fireballRate, DEBRIS_TYPES.FIREBALL, dt, win, env, colorProfile);
        spawnByRate('ice', env.iceShardRate, DEBRIS_TYPES.ICE_SHARD, dt, win, env, colorProfile);
        spawnByRate('cinder', env.volcanicCinderRate, DEBRIS_TYPES.VOLCANIC_CINDER, dt, win, env, colorProfile);
        enforceActivity(win, env, colorProfile);

        const speedFactor = Math.exp(-(env.debrisDrag || 0.05) * dt);
        for (let i = debris.length - 1; i >= 0; i--) {
            const d = debris[i];
            d.trail.unshift({ x: d.pos.x, y: d.pos.y });
            if (d.trail.length > d.trailMax) d.trail.pop();

            if (d.motionMode === 'swirl' && d.swirl) {
                const dx = d.swirl.x - d.pos.x;
                const dy = d.swirl.y - d.pos.y;
                d.vel.x += (-dy * 0.10 + dx * 0.025) * d.swirl.strength * dt;
                d.vel.y += ( dx * 0.10 + dy * 0.025) * d.swirl.strength * dt;
            } else if (d.motionMode === 'eruptionArc') {
                d.vel.y -= 8.5 * dt;
                d.vel.x += Math.sin(t * 8.0 + d.radius) * 8 * dt;
            } else if (d.motionMode === 'grazingMeteor') {
                d.vel.y += Math.sin(t * 2.2 + d.radius) * 1.8 * dt;
            }

            d.vel.x *= speedFactor;
            d.vel.y *= speedFactor;
            d.pos.x += d.vel.x * dt;
            d.pos.y += d.vel.y * dt;
            d.angle += d.omega * dt;
            d.pulse = 0.72 + 0.28 * Math.sin(t * 6.0 + d.radius);
            d.life -= dt;

            if (state && d.hazard && !d.warned) {
                const dist = Math.hypot(state.pos[0] - d.pos.x, state.pos[1] - d.pos.y);
                if (dist < d.radius + 14) {
                    d.warned = true;
                    pushLog('WARNING: METEOR SHEAR', d.color, 2.5);
                    shards.burst(d.pos, d.color, 9, 13, env.maxShards || 220);
                }
            }

            const out = d.pos.x < win.left - 65 || d.pos.x > win.right + 65 ||
                d.pos.y < win.bottom - 55 || d.pos.y > win.top + 70 || d.life <= 0;
            if (out) {
                if (d.hazard || d.type === DEBRIS_TYPES.ICE_SHARD || d.type === DEBRIS_TYPES.CRYSTAL_FRAGMENT) {
                    shards.burst(d.pos, d.color, d.type === DEBRIS_TYPES.LARGE_ASTEROID ? 18 : 7, d.radius * 4.0, env.maxShards || 220);
                }
                debris.splice(i, 1);
            }
        }
        shards.update(dt, env.shardDrag || 3.4);

        for (let i = logs.length - 1; i >= 0; i--) {
            logs[i].life -= dt;
            if (logs[i].life <= 0) logs.splice(i, 1);
        }
    };

    const displayWorld = (sk, pixelToWorld, bloom = 1) => {
        for (const d of debris) {
            for (let i = 1; i < d.trail.length; i++) {
                const a = (1 - i / d.trail.length) * d.pulse;
                drawNeonLine(sk, d.trail[i - 1], d.trail[i], d.glowColor, pixelToWorld, bloom * a);
            }
            const verts = worldVerts(d);
            drawNeonPolyline(sk, verts, true, d.color, pixelToWorld, bloom * d.pulse);
            if (d.type === DEBRIS_TYPES.CRYSTAL_FRAGMENT) {
                for (const v of verts) drawNeonLine(sk, d.pos, v, d.glowColor, pixelToWorld, bloom * 0.55 * d.pulse);
            }
            for (const v of verts.filter((_, i) => i % 2 === 0)) drawNeonPoint(sk, v, d.glowColor, pixelToWorld, 2.5, bloom * d.pulse);
            if (d.radius > 2.5) {
                const labelY = d.pos.y + d.radius + pixelToWorld(11);
                drawNeonLabel(sk, d.label, d.pos.x, labelY, d.color, 0.85, sk.CENTER, pixelToWorld(11));
            }
        }
        shards.display(sk, pixelToWorld, bloom);
    };

    const displayLog = (sk, W, colorProfile, bloom = 1) => {
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            const a = clamp(log.life / log.ttl, 0, 1);
            drawNeonLabel(sk, log.text, W - 12, 118 + i * 15, log.color, a * bloom, sk.RIGHT);
        }
    };

    const log = (text, color, ttl) => pushLog(text, color, ttl);

    return { reset, update, displayWorld, displayLog, log };
};
