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
        bloom: 1.85,
        world: {
            background: '#05000d',
            stars: [180, 230, 255],
            starGlow: [170, 30, 255],
            haze: [110, 20, 185],
        },
        terrain: {
            line: '#00eaff',
            lowGlow: '#7a00ff',
            materialAccent: '#ff2dff',
        },
        ship: {
            outline: '#f8ffff',
            secondary: '#00f6ff',
        },
        pads: {
            standard: '#00ff57',
            bonus: '#fff500',
            highRisk: '#ff2dff',
            expert: '#ff1744',
            safeHalo: '#00ff57',
            warningHalo: '#ff1744',
        },
        particles: {
            engineCore: [255, 255, 255],
            engineGlow: [255, 124, 0],
            dust: [125, 225, 255],
            landingDust: [210, 250, 255],
            spark: [255, 25, 190],
        },
        hud: {
            text: '#ecfbff',
            dim: '#8d63ff',
            ok: '#00ff57',
            warning: '#fff500',
            danger: '#ff1744',
            fuel: '#00ff57',
            fuelLow: '#ff1744',
            panel: [18, 0, 52],
        },
        effects: {
            flame: '#ff7a00',
            flameCore: '#ffffff',
            engineLight: [255, 92, 0],
            engineLightCore: [255, 255, 220],
            explosion: [255, 42, 210],
            explosionCore: [255, 255, 255],
            shock: [0, 230, 255],
            shockCore: [255, 255, 255],
            flash: [255, 245, 255],
            meteor: [255, 76, 0],
            ice: [120, 245, 255],
            aurora: [0, 255, 210],
            volcanic: [255, 42, 0],
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
