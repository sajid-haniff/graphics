// Planet-facing orchestration for vector CRT debris and atmospheric hazards.

import {
    DEBRIS_TYPES,
    createNeonDebrisSystem,
    drawNeonLine,
    drawNeonPolyline,
} from './neon-debris';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const defaultEnvironment = (planet) => {
    const fx = planet.environmentFx || {};
    return {
        debrisDensity: 0.12,
        minActive: 0,
        meteorRate: fx.meteors || 0,
        asteroidRate: 0,
        crystalRate: 0,
        fireballRate: 0,
        iceShardRate: (fx.iceRain || 0) * 35,
        volcanicCinderRate: (fx.volcanic || 0) * 18,
        haze: fx.haze || 0,
        aurora: fx.aurora || 0,
        volcanic: fx.volcanic || 0,
        debrisDrag: 0.04,
        shardDrag: 3.4,
        maxDebris: 18,
        maxShards: 160,
        activityTypes: [DEBRIS_TYPES.SMALL_METEOR],
        palette: {},
    };
};

const envFor = (planet) => {
    const base = defaultEnvironment(planet);
    const env = planet.environment || {};
    return {
        ...base,
        ...env,
        palette: { ...base.palette, ...(env.palette || {}) },
    };
};

const paletteColor = (env, key, fallback) => env.palette[key] || fallback;

const deviceLine = (sk, a, b, color, intensity = 1) => {
    const px = (v) => v;
    drawNeonLine(sk, a, b, color, px, intensity);
};

export const createEnvironmentEffects = (seed) => {
    const debris = createNeonDebrisSystem(seed ^ 0x57a31d2b);
    let t = 0;
    let lastPlanetId = null;
    let lastWin = null;
    let lastTerrainHeightAt = null;

    const resetTransient = () => {
        debris.reset();
        lastPlanetId = null;
    };

    const update = (dt, planet, visibleWin, state, colorProfile, terrainHeightAt) => {
        t += dt;
        lastWin = visibleWin;
        lastTerrainHeightAt = terrainHeightAt;
        const env = {
            ...envFor(planet),
            terrainHeightAt,
        };
        if (lastPlanetId !== planet.id) {
            lastPlanetId = planet.id;
            debris.reset();
            debris.log('HAZARD FIELD ACTIVE', colorProfile.effects.meteor, 2.5);
            if (env.debrisDrag > 0.8) debris.log('ATMOSPHERE: DENSE', colorProfile.world.haze, 2.8);
            if (env.iceShardRate > 0.5) debris.log('ICE_RAIN', paletteColor(env, 'ice', colorProfile.effects.ice), 2.4);
            if (env.volcanic > 0.5) debris.log('VOLCANIC_CINDER', paletteColor(env, 'cinder', colorProfile.effects.volcanic), 2.4);
        }
        debris.update(dt, visibleWin, env, state, colorProfile);
    };

    const displayDevice = (sk, planet, colorProfile, W, H) => {
        const env = envFor(planet);
        const bloom = colorProfile.bloom || 1;
        const haze = clamp(env.haze, 0, 1);
        const aurora = clamp(env.aurora, 0, 1);

        sk.resetMatrix();
        sk.noFill();
        if (haze > 0) {
            const col = colorProfile.world.haze;
            for (let i = 0; i < 4; i++) {
                const y = H * (0.22 + i * 0.14);
                const sway = Math.sin(t * 0.7 + i * 0.9) * 14 * haze;
                deviceLine(sk, { x: W * 0.06, y: y + sway }, { x: W * 0.42, y: y - sway * 0.35 }, col, haze * 0.12 * bloom);
                deviceLine(sk, { x: W * 0.58, y: y - sway }, { x: W * 0.94, y: y + sway * 0.25 }, col, haze * 0.10 * bloom);
            }
        }

        if (aurora > 0) {
            const cols = [
                paletteColor(env, 'auroraA', colorProfile.effects.aurora),
                paletteColor(env, 'auroraB', paletteColor(env, 'crystal', colorProfile.effects.ice)),
                paletteColor(env, 'auroraC', paletteColor(env, 'meteor', colorProfile.effects.meteor)),
            ];
            for (let band = 0; band < 3; band++) {
                const verts = [];
                const baseY = H * (0.10 + band * 0.070);
                const amp = H * (0.030 + band * 0.006);
                for (let x = -30; x <= W + 30; x += W / 22) {
                    const phase = t * (0.55 + band * 0.11) + x * 0.014 + band * 1.7;
                    verts.push({
                        x,
                        y: baseY + Math.sin(phase) * amp + Math.sin(phase * 0.43) * amp * 0.55,
                    });
                }
                drawNeonPolyline(sk, verts, false, cols[band % cols.length], v => v, aurora * bloom * 0.42);
            }
        }

        if (env.volcanic > 0) {
            const lava = paletteColor(env, 'lava', colorProfile.effects.volcanic);
            const flicker = (0.45 + 0.55 * Math.sin(t * 5.7) ** 2) * env.volcanic * bloom;
            for (let i = 0; i < 3; i++) {
                const y = H - 14 - i * 9;
                const x0 = W * (0.18 + i * 0.20) + Math.sin(t * 3.2 + i) * 14;
                const x1 = x0 + W * 0.16;
                deviceLine(sk, { x: x0, y }, { x: x1, y: y - Math.sin(t + i) * 8 }, lava, flicker * (0.25 + i * 0.04));
            }
        }

        debris.displayLog(sk, W, colorProfile, bloom);
    };

    const displayWorld = (sk, planet, colorProfile, pixelToWorld) => {
        const env = {
            ...envFor(planet),
            terrainHeightAt: lastTerrainHeightAt,
        };
        const bloom = colorProfile.bloom || 1;
        debris.displayWorld(sk, pixelToWorld, bloom);

        if (env.volcanic > 0 && lastWin && typeof env.terrainHeightAt === 'function') {
            const lava = paletteColor(env, 'lava', colorProfile.effects.volcanic);
            const a = (0.42 + 0.58 * Math.sin(t * 2.2) ** 2) * env.volcanic * bloom;
            for (let i = 0; i < 4; i++) {
                const x0 = lastWin.left + (lastWin.right - lastWin.left) * (0.12 + i * 0.22) + Math.sin(t + i) * 4;
                const y = env.terrainHeightAt(x0) + 0.6 + i * 0.15;
                drawNeonLine(
                    sk,
                    { x: x0, y },
                    { x: x0 + 18, y: y + Math.sin(t * 1.7 + i) * 0.7 },
                    lava,
                    pixelToWorld,
                    a * 0.18
                );
            }
        }
    };

    return { resetTransient, update, displayDevice, displayWorld };
};
