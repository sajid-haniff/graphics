// Planet/environment profiles. These are data only: physics reads gravity/drag
// through explicit options, and rendering reads environmentFx/hazard semantics.

const deepFreeze = (obj) => {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value && typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value);
    }
    return obj;
};

const makePlanet = (profile) => deepFreeze({
    wind: [0, 0],
    hazards: [],
    environmentFx: {},
    ...profile,
});

const planets = [
    makePlanet({
        id: 'moon',
        name: 'Moon',
        gravity: 1.62,
        atmosphereDensity: 0.0,
        drag: 0.0,
        wind: [0, 0],
        terrainMaterial: 'cratered regolith',
        hazards: [],
        visualProfileId: 'vectorLunar',
        environmentFx: {
            dust: 'sparse',
            haze: 0.00,
            meteors: 0.00,
            iceRain: 0.00,
            aurora: 0.00,
            volcanic: 0.00,
        },
    }),
    makePlanet({
        id: 'mars',
        name: 'Mars',
        gravity: 3.71,
        atmosphereDensity: 0.18,
        drag: 0.045,
        wind: [0.55, 0],
        terrainMaterial: 'oxidized basalt',
        hazards: ['dust haze'],
        visualProfileId: 'vectorLunar',
        environmentFx: {
            dust: 'hazy',
            haze: 0.28,
            meteors: 0.02,
            iceRain: 0.00,
            aurora: 0.00,
            volcanic: 0.00,
        },
    }),
    makePlanet({
        id: 'titan',
        name: 'Titan',
        gravity: 1.35,
        atmosphereDensity: 1.45,
        drag: 0.18,
        wind: [-0.35, 0],
        terrainMaterial: 'hydrocarbon ice',
        hazards: ['dense haze'],
        visualProfileId: 'vectorLunar',
        environmentFx: {
            dust: 'thick',
            haze: 0.46,
            meteors: 0.00,
            iceRain: 0.025,
            aurora: 0.10,
            volcanic: 0.00,
        },
    }),
    makePlanet({
        id: 'io',
        name: 'Io',
        gravity: 1.80,
        atmosphereDensity: 0.02,
        drag: 0.010,
        wind: [0.10, 0],
        terrainMaterial: 'sulfur and lava',
        hazards: ['lava glow', 'volcanic pulses', 'meteors'],
        visualProfileId: 'gyrussNeon',
        environmentFx: {
            dust: 'ash',
            haze: 0.10,
            meteors: 0.055,
            iceRain: 0.00,
            aurora: 0.00,
            volcanic: 0.85,
        },
    }),
    makePlanet({
        id: 'europa',
        name: 'Europa',
        gravity: 1.31,
        atmosphereDensity: 0.03,
        drag: 0.015,
        wind: [0.0, 0],
        terrainMaterial: 'ridged ice',
        hazards: ['ice rain', 'aurora'],
        visualProfileId: 'gyrussNeon',
        environmentFx: {
            dust: 'ice',
            haze: 0.08,
            meteors: 0.00,
            iceRain: 0.070,
            aurora: 0.55,
            volcanic: 0.00,
        },
    }),
];

const planetById = planets.reduce((acc, planet) => ({ ...acc, [planet.id]: planet }), {});

export const getPlanetProfile = (id = 'moon') =>
    planetById[id] || planetById.moon;

export const getNextPlanetProfile = (id = 'moon') => {
    const idx = planets.findIndex(p => p.id === id);
    return planets[(idx + 1 + planets.length) % planets.length];
};

export const PLANET_PROFILE_IDS = planets.map(p => p.id);

