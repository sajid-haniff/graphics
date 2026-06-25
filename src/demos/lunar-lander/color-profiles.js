// Semantic color profiles for Lunar Lander rendering.
// Renderer code asks for meaning (ship.outline, hud.warning, pads.highRisk),
// never for literal colors. Profiles are immutable and reused by reference.

const deepFreeze = (obj) => {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value && typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value);
    }
    return obj;
};

export const createColorProfile = (profile) => deepFreeze({ ...profile });

export const resolvePadTier = (pad) => {
    if (!pad) return 'standard';
    if (pad.multiplier >= 5) return 'expert';
    if (pad.multiplier >= 3) return 'highRisk';
    if (pad.multiplier >= 2) return 'bonus';
    return 'standard';
};

export const getPulse = ({ time, frequency = 1, phase = 0 }) =>
    0.5 + 0.5 * Math.sin(time * Math.PI * 2 * frequency + phase);

const profiles = [
    createColorProfile({
        id: 'vectorLunar',
        name: 'Vector Lunar',
        bloom: 0.85,
        world: {
            background: '#040810',
            stars: [190, 220, 255],
            starGlow: [140, 190, 255],
            haze: [80, 110, 150],
        },
        terrain: {
            line: '#5577aa',
            lowGlow: '#2f4f7d',
            materialAccent: '#86a7d8',
        },
        ship: {
            outline: '#00eeff',
            secondary: '#99f7ff',
        },
        pads: {
            standard: '#44ff88',
            bonus: '#66bbff',
            highRisk: '#ffcc00',
            expert: '#ff66cc',
            safeHalo: '#44ff88',
            warningHalo: '#ff5544',
        },
        particles: {
            engineCore: [255, 220, 105],
            engineGlow: [255, 120, 50],
            dust: [150, 175, 190],
            landingDust: [185, 205, 210],
            spark: [255, 190, 80],
        },
        hud: {
            text: '#bbccee',
            dim: '#7084aa',
            ok: '#44ff88',
            warning: '#ffcc00',
            danger: '#ff4444',
            fuel: '#44ff88',
            fuelLow: '#ff4444',
            panel: [30, 40, 60],
        },
        effects: {
            flame: '#ff9933',
            flameCore: '#ffdd66',
            engineLight: [255, 138, 48],
            engineLightCore: [255, 228, 112],
            explosion: [255, 145, 60],
            explosionCore: [255, 230, 125],
            shock: [255, 120, 45],
            shockCore: [255, 230, 150],
            flash: [255, 210, 140],
            meteor: [255, 135, 65],
            ice: [145, 220, 255],
            aurora: [100, 255, 190],
            volcanic: [255, 90, 35],
        },
    }),
    createColorProfile({
        id: 'gyrussNeon',
        name: 'Gyruss Neon',
        bloom: 1.25,
        world: {
            background: '#080014',
            stars: [215, 235, 255],
            starGlow: [255, 70, 230],
            haze: [90, 35, 140],
        },
        terrain: {
            line: '#16ccff',
            lowGlow: '#364cff',
            materialAccent: '#7a5cff',
        },
        ship: {
            outline: '#d9ffff',
            secondary: '#31f7ff',
        },
        pads: {
            standard: '#3dff6f',
            bonus: '#fff24d',
            highRisk: '#ff4cff',
            expert: '#ff33aa',
            safeHalo: '#3dff6f',
            warningHalo: '#ff4cff',
        },
        particles: {
            engineCore: [255, 255, 245],
            engineGlow: [255, 170, 40],
            dust: [120, 205, 255],
            landingDust: [180, 235, 255],
            spark: [255, 75, 225],
        },
        hud: {
            text: '#d8f7ff',
            dim: '#8a84d6',
            ok: '#3dff6f',
            warning: '#fff24d',
            danger: '#ff4cff',
            fuel: '#3dff6f',
            fuelLow: '#ff4cff',
            panel: [22, 20, 70],
        },
        effects: {
            flame: '#ff8f22',
            flameCore: '#ffffff',
            engineLight: [255, 120, 40],
            engineLightCore: [255, 255, 190],
            explosion: [255, 82, 220],
            explosionCore: [255, 255, 185],
            shock: [255, 64, 210],
            shockCore: [255, 244, 80],
            flash: [255, 150, 240],
            meteor: [255, 95, 40],
            ice: [120, 235, 255],
            aurora: [60, 255, 215],
            volcanic: [255, 54, 20],
        },
    }),
];

const profileById = profiles.reduce((acc, profile) => ({ ...acc, [profile.id]: profile }), {});

export const getColorProfile = (id = 'vectorLunar') =>
    profileById[id] || profileById.vectorLunar;

export const getNextColorProfile = (id = 'vectorLunar') => {
    const idx = profiles.findIndex(p => p.id === id);
    return profiles[(idx + 1 + profiles.length) % profiles.length];
};

export const COLOR_PROFILE_IDS = profiles.map(p => p.id);

