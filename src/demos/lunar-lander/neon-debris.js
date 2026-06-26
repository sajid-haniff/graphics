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
    const glow = clamp(intensity, 0.18, 1.8);
    sk.push();
    sk.noFill();

    sk.stroke(baseColor[0], baseColor[1], baseColor[2], 46 * glow);
    sk.strokeWeight(pixelToWorld(5.8 * glow + 0.8));
    sk.beginShape();
    for (const v of vertices) sk.vertex(v.x, v.y);
    if (closeShape) sk.endShape(sk.CLOSE);
    else sk.endShape();

    sk.stroke(baseColor[0], baseColor[1], baseColor[2], 132 * glow);
    sk.strokeWeight(pixelToWorld(2.7 * glow + 0.45));
    sk.beginShape();
    for (const v of vertices) sk.vertex(v.x, v.y);
    if (closeShape) sk.endShape(sk.CLOSE);
    else sk.endShape();

    sk.stroke(WHITE[0], WHITE[1], WHITE[2], 245);
    sk.strokeWeight(pixelToWorld(1.0));
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
    sk.strokeWeight(pixelToWorld(2.1 * intensity));
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
    const logCooldowns = {};
    const shards = createNeonShardSystem(seed ^ 0x9e3779b9);
    let t = 0;

    const pushLog = (text, color, ttl = 2.2) => {
        if ((logCooldowns[text] || 0) > t) return;
        logCooldowns[text] = t + 1.25;
        addBounded(logs, { text, color, ttl, life: ttl }, 4);
    };

    const reset = () => {
        debris.length = 0;
        logs.length = 0;
        for (const k of Object.keys(carries)) carries[k] = 0;
        for (const k of Object.keys(logCooldowns)) delete logCooldowns[k];
    };

    const terrainClearanceAt = (env, x, clearance = 2) =>
        (typeof env.terrainHeightAt === 'function' ? env.terrainHeightAt(x) : -Infinity) + clearance;

    const aboveTerrain = (env, p, clearance = 2) => ({
        x: p.x,
        y: Math.max(p.y, terrainClearanceAt(env, p.x, clearance)),
    });

    const spawnUpperEntry = (win, env, clearance, sideBias = null) => {
        const side = sideBias || (rand() < 0.5 ? 'left' : 'right');
        const spanX = win.right - win.left;
        const spanY = win.top - win.bottom;
        const x = side === 'left'
            ? win.left - spanX * (0.05 + rand() * 0.14)
            : win.right + spanX * (0.05 + rand() * 0.14);
        const y = win.top - spanY * (0.02 + rand() * 0.24);
        return aboveTerrain(env, { x, y }, clearance);
    };

    const spawnHighSky = (win, env, clearance) => {
        const spanX = win.right - win.left;
        const spanY = win.top - win.bottom;
        return aboveTerrain(env, {
            x: win.left + spanX * (0.08 + rand() * 0.84),
            y: win.top - spanY * (0.03 + rand() * 0.18),
        }, clearance);
    };

    const spawnPosRight = (win) => ({
        x: win.right + (win.right - win.left) * (0.05 + rand() * 0.16),
        y: win.bottom + (win.top - win.bottom) * (0.50 + rand() * 0.40),
    });

    const spawnFromTerrain = (win, env, clearance) => {
        const x = win.left + (win.right - win.left) * rand();
        return { x, y: terrainClearanceAt(env, x, clearance) };
    };

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
            const radius = 1.2 + rand() * 1.0;
            const pos = aboveTerrain(env, spawnPosRight(win), 4);
            d = {
                type,
                pos,
                vel: { x: -10 - rand() * 10, y: -4 - rand() * 6 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 1.7,
                radius,
                vertices: makeJaggedLoop(rand, radius, 10 + Math.floor(rand() * 5), 0.55),
                trail: [],
                trailMax: 5,
                pulse: 1,
                life: 10,
                ttl: 10,
                label: 'LARGE_ASTEROID',
                color,
                glowColor,
                motionMode: 'slowTumble',
                hazard: true,
            };
        } else if (type === DEBRIS_TYPES.CRYSTAL_FRAGMENT) {
            const radius = 0.65 + rand() * 0.45;
            const pos = spawnHighSky(win, env, 2);
            d = {
                type,
                pos,
                vel: { x: -14 + rand() * 28, y: -16 - rand() * 16 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 4,
                radius,
                vertices: makeCrystal(radius),
                trail: [],
                trailMax: 4,
                pulse: 1,
                life: 5.5,
                ttl: 5.5,
                label: 'CRYSTAL_FRAGMENT',
                color,
                glowColor,
                motionMode: 'swirl',
                swirl: { x: pos.x + (rand() - 0.5) * 16, y: pos.y - 10 - rand() * 14, strength: 2.5 + rand() * 4 },
                hazard: false,
            };
        } else if (type === DEBRIS_TYPES.ICE_SHARD) {
            const radius = 0.35 + rand() * 0.45;
            d = {
                type,
                pos: spawnHighSky(win, env, 2),
                vel: { x: -6 + rand() * 12, y: -28 - rand() * 24 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 5,
                radius,
                vertices: makeShard(radius, 0.55),
                trail: [],
                trailMax: 4,
                pulse: 1,
                life: 3.8,
                ttl: 3.8,
                label: 'ICE_RAIN',
                color,
                glowColor,
                motionMode: 'fallingRain',
                hazard: false,
            };
        } else if (type === DEBRIS_TYPES.VOLCANIC_CINDER) {
            const radius = 0.25 + rand() * 0.40;
            d = {
                type,
                pos: spawnFromTerrain(win, env, 1.5),
                vel: { x: -18 + rand() * 36, y: 22 + rand() * 34 },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * 10,
                radius,
                vertices: makeJaggedLoop(rand, radius, 5 + Math.floor(rand() * 4), 0.60),
                trail: [],
                trailMax: 5,
                pulse: 1,
                life: 3.2,
                ttl: 3.2,
                label: 'VOLCANIC_CINDER',
                color,
                glowColor,
                motionMode: 'eruptionArc',
                hazard: true,
            };
        } else {
            const fire = type === DEBRIS_TYPES.FIREBALL;
            const radius = fire ? 0.7 + rand() * 0.7 : 0.45 + rand() * 0.45;
            const fromLeft = rand() < 0.5;
            const speedX = fire ? 52 + rand() * 46 : 40 + rand() * 36;
            const speedY = fire ? 34 + rand() * 34 : 26 + rand() * 28;
            d = {
                type,
                pos: spawnUpperEntry(win, env, fire ? 4 : 2, fromLeft ? 'left' : 'right'),
                vel: {
                    x: fromLeft ? speedX : -speedX,
                    y: -speedY,
                },
                angle: rand() * Math.PI * 2,
                omega: (rand() - 0.5) * (fire ? 5 : 8),
                radius,
                vertices: fire ? makeJaggedLoop(rand, radius, 8, 0.5) : makeJaggedLoop(rand, radius, 5 + Math.floor(rand() * 4), 0.5),
                trail: [],
                trailMax: fire ? 14 : 9,
                pulse: 1,
                life: fire ? 4.2 : 3.2,
                ttl: fire ? 4.2 : 3.2,
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
        while (debris.length < minActive && debris.length < (env.maxDebris || 12)) {
            makeDebris(choose(rand, sequence), win, env, colorProfile);
        }
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
                d.vel.y -= 18.0 * dt;
                d.vel.x += Math.sin(t * 8.0 + d.radius) * 10 * dt;
            } else if (d.motionMode === 'grazingMeteor') {
                d.vel.y += Math.sin(t * 2.2 + d.radius) * 2.2 * dt;
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
                    pushLog('WARNING: METEOR SHEAR', d.color, 1.6);
                    shards.burst(d.pos, d.color, 5, 9, env.maxShards || 120);
                }
            }

            const clearance = (d.type === DEBRIS_TYPES.LARGE_ASTEROID || d.type === DEBRIS_TYPES.FIREBALL) ? 4 : 2;
            const groundY = terrainClearanceAt(env, d.pos.x, clearance - d.radius);
            const hitTerrain = d.vel.y <= 0 && d.pos.y - d.radius <= groundY;
            const out = d.pos.x < win.left - 65 || d.pos.x > win.right + 65 ||
                d.pos.y < win.bottom - 18 || d.pos.y > win.top + 55 || d.life <= 0;
            if (out || hitTerrain) {
                if (hitTerrain || d.hazard || d.type === DEBRIS_TYPES.ICE_SHARD || d.type === DEBRIS_TYPES.CRYSTAL_FRAGMENT) {
                    shards.burst(
                        { x: d.pos.x, y: Math.max(d.pos.y, terrainClearanceAt(env, d.pos.x, 0.35)) },
                        d.color,
                        d.type === DEBRIS_TYPES.LARGE_ASTEROID ? 9 : 5,
                        Math.max(4, d.radius * 4.0),
                        env.maxShards || 120
                    );
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
            if (d.type === DEBRIS_TYPES.LARGE_ASTEROID) {
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
