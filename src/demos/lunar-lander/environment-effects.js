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

    const resetTransient = () => {
        debris.reset();
        lastPlanetId = null;
    };

    const update = (dt, planet, visibleWin, state, colorProfile) => {
        t += dt;
        const env = envFor(planet);
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
            for (let i = 0; i < 18; i++) {
                const y = H * i / 17;
                const sway = Math.sin(t * 0.7 + i * 0.9) * 18 * haze;
                deviceLine(sk, { x: -30, y: y + sway }, { x: W + 30, y: y - sway * 0.35 }, col, haze * 0.20 * bloom);
            }
        }

        if (aurora > 0) {
            const cols = [
                paletteColor(env, 'auroraA', colorProfile.effects.aurora),
                paletteColor(env, 'auroraB', paletteColor(env, 'crystal', colorProfile.effects.ice)),
                paletteColor(env, 'auroraC', paletteColor(env, 'meteor', colorProfile.effects.meteor)),
            ];
            for (let band = 0; band < 5; band++) {
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
                drawNeonPolyline(sk, verts, false, cols[band % cols.length], v => v, aurora * bloom * 0.55);
            }
        }

        if (env.volcanic > 0) {
            const lava = paletteColor(env, 'lava', colorProfile.effects.volcanic);
            const flicker = (0.45 + 0.55 * Math.sin(t * 5.7) ** 2) * env.volcanic * bloom;
            for (let i = 0; i < 7; i++) {
                const y = H - 14 - i * 9;
                const x0 = -20 + Math.sin(t * 3.2 + i) * 28;
                const x1 = W + 20 + Math.cos(t * 2.8 + i) * 24;
                deviceLine(sk, { x: x0, y }, { x: x1, y: y - Math.sin(t + i) * 8 }, lava, flicker * (0.35 + i * 0.05));
            }
        }

        debris.displayLog(sk, W, colorProfile, bloom);
    };

    const displayWorld = (sk, planet, colorProfile, pixelToWorld) => {
        const env = envFor(planet);
        const bloom = colorProfile.bloom || 1;
        debris.displayWorld(sk, pixelToWorld, bloom);

        if (env.volcanic > 0) {
            const lava = paletteColor(env, 'lava', colorProfile.effects.volcanic);
            const a = (0.42 + 0.58 * Math.sin(t * 2.2) ** 2) * env.volcanic * bloom;
            for (let i = 0; i < 8; i++) {
                const y = -67 + i * 1.6;
                drawNeonLine(
                    sk,
                    { x: -10000, y },
                    { x: 10000, y: y + Math.sin(t * 1.7 + i) * 0.7 },
                    lava,
                    pixelToWorld,
                    a * 0.25
                );
            }
        }
    };

    return { resetTransient, update, displayDevice, displayWorld };
};
