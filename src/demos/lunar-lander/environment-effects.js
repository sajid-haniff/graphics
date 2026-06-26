// Planet-facing orchestration for vector CRT debris and atmospheric hazards.

import {
    DEBRIS_TYPES,
    createNeonDebrisSystem,
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

export const createEnvironmentEffects = (seed) => {
    const debris = createNeonDebrisSystem(seed ^ 0x57a31d2b);
    let t = 0;
    let lastPlanetId = null;

    const resetTransient = () => {
        debris.reset();
        lastPlanetId = null;
    };

    const update = (dt, planet, visibleWin, state, colorProfile, terrainHeightAt) => {
        t += dt;
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
        const aurora = clamp(env.aurora, 0, 1);

        sk.resetMatrix();
        sk.noFill();

        if (aurora > 0) {
            const cols = [
                paletteColor(env, 'auroraA', colorProfile.effects.aurora),
                paletteColor(env, 'auroraB', paletteColor(env, 'crystal', colorProfile.effects.ice)),
                paletteColor(env, 'auroraC', paletteColor(env, 'meteor', colorProfile.effects.meteor)),
            ];
            for (let ribbon = 0; ribbon < 3; ribbon++) {
                const verts = [];
                const width = W * (0.36 + ribbon * 0.08);
                const xStart = W * (0.06 + ribbon * 0.24) + Math.sin(t * 0.18 + ribbon) * W * 0.035;
                const baseY = H * (0.12 + ribbon * 0.075) + Math.sin(t * 0.22 + ribbon * 2.1) * H * 0.025;
                const amp = H * (0.032 + ribbon * 0.006);
                for (let i = 0; i <= 18; i++) {
                    const u = i / 18;
                    const x = xStart + width * u;
                    const phase = t * (0.55 + ribbon * 0.11) + u * 5.6 + ribbon * 1.7;
                    const arch = -Math.sin(u * Math.PI) * H * (0.018 + ribbon * 0.004);
                    verts.push({
                        x,
                        y: baseY + arch + Math.sin(phase) * amp + Math.sin(phase * 0.43) * amp * 0.55,
                    });
                }
                drawNeonPolyline(sk, verts, false, cols[ribbon % cols.length], v => v, aurora * bloom * 0.42);
            }
        }

        debris.displayLog(sk, W, colorProfile, bloom);
    };

    const displayWorld = (sk, planet, colorProfile, pixelToWorld) => {
        const bloom = colorProfile.bloom || 1;
        debris.displayWorld(sk, pixelToWorld, bloom);
    };

    return { resetTransient, update, displayDevice, displayWorld };
};
