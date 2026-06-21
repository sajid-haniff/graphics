// ============================================================================
// terrain.js — procedural 1D lunar heightmap with landing pads
//
// generateTerrain(seed, win)  → { vertices, pads, bounds }
//   vertices  — [{x, y}] polyline spanning win.left..win.right, Y-up world coords
//   pads      — [{x1, x2, y, multiplier, label, difficulty}]
//                 pads are intentionally flat landing segments carved into the terrain
//                 multiplier encodes landing difficulty and score risk/reward
//   bounds    — { left, right, bottom, top } for the generated terrain extents
//
// heightAt(terrain, x)     → number   (piecewise-linear interpolation)
// findPadUnder(terrain, x) → pad | null
// ============================================================================

// Deterministic LCG — no Math.random, fully seed-controlled
const lcg = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const smoothstep = t => t * t * (3 - 2 * t);

const lerp = (a, b, t) => a + (b - a) * t;

const valueNoise1D = (randValues, x) => {
    const i = Math.floor(x);
    const t = x - i;
    const n = randValues.length;
    const a = randValues[((i % n) + n) % n];
    const b = randValues[(((i + 1) % n) + n) % n];
    return lerp(a, b, smoothstep(t));
};

const fbm1D = (noise, x, octaves = 5) => {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;

    for (let i = 0; i < octaves; i++) {
        sum += amp * noise(x * freq);
        norm += amp;
        amp *= 0.5;
        freq *= 2;
    }

    return sum / norm;
};

const overlaps = (a1, a2, b1, b2, margin = 0) =>
    a1 < b2 + margin && a2 > b1 - margin;

const gaussian = (x, cx, width) =>
    Math.exp(-((x - cx) * (x - cx)) / (2 * width * width));

const limitSlopes = (heights, maxDeltaY) => {
    for (let i = 1; i < heights.length; i++) {
        heights[i] = clamp(heights[i], heights[i - 1] - maxDeltaY, heights[i - 1] + maxDeltaY);
    }
    for (let i = heights.length - 2; i >= 0; i--) {
        heights[i] = clamp(heights[i], heights[i + 1] - maxDeltaY, heights[i + 1] + maxDeltaY);
    }
};

const breakFlatSpans = (heights, rand, yFloor, yCeil, range, padMask = null) => {
    const eps = range * 0.002;
    let runStart = 0;

    for (let i = 1; i <= heights.length; i++) {
        const same = i < heights.length &&
            (!padMask || (!padMask[i] && !padMask[i - 1])) &&
            Math.abs(heights[i] - heights[i - 1]) < eps;

        if (same) continue;

        const runEnd = i - 1;
        const runLen = runEnd - runStart + 1;
        const protectedRun = padMask && padMask.slice(runStart, runEnd + 1).some(Boolean);
        if (!protectedRun && runLen > 3) {
            for (let j = runStart + 1; j < runEnd; j++) {
                const wobble = (rand() - 0.5) * range * 0.035;
                heights[j] = clamp(heights[j] + wobble, yFloor, yCeil);
            }
        }

        runStart = i;
    }
};

const padTypes = [
    { difficulty: 'EASY',   label: '1X', multiplier: 1, widthFrac: 0.035 },
    { difficulty: 'MEDIUM', label: '2X', multiplier: 2, widthFrac: 0.026 },
    { difficulty: 'HARD',   label: '3X', multiplier: 3, widthFrac: 0.019 },
    { difficulty: 'EXPERT', label: '5X', multiplier: 5, widthFrac: 0.014 },
];

export const generateTerrain = (seed, win) => {
    const rand = lcg(seed);
    const W    = win.right  - win.left;
    const H    = win.top    - win.bottom;

    // Terrain is Y-up world geometry: larger y means higher mountains.
    // 120–160 sampled points keep broad hills readable while rendering remains
    // an angular vector polyline, never bezier curves.
    const sampleCount = 120 + Math.floor(rand() * 41);
    const N    = sampleCount - 1;
    const dx   = W / N;

    const yFloor = win.bottom + H * 0.06;
    const yCeil  = win.bottom + H * 0.88;
    const yMid   = win.bottom + H * 0.48;
    const range  = yCeil - yFloor;

    // Sample positions (N+1 points, N line segments). Rendering stays angular:
    // no curve interpolation is used outside this height generator.
    const xs = Array.from({ length: sampleCount }, (_, i) => win.left + i * dx);

    const randValues = Array.from({ length: 256 }, () => rand());
    const noise = x => valueNoise1D(randValues, x);
    const baseOffset = rand() * 1000;
    const detailOffset = rand() * 1000;

    // fBm is deliberately only base texture. The large silhouette comes from
    // explicit Gaussian landforms below.
    const heights = xs.map((_, i) => {
        const u = i / N;
        const base = (fbm1D(noise, baseOffset + u * 1.7, 5) - 0.5) * 2;
        return yMid + base * H * 0.16;
    });

    const mainGorge = {
        cx: win.left + W * (0.38 + rand() * 0.24),
        width: W * (0.10 + rand() * 0.08),
        depth: H * (0.45 + rand() * 0.15),
    };
    const secondarySide = mainGorge.cx < win.left + W * 0.5 ? 0.68 : 0.22;
    const secondaryGorge = {
        cx: win.left + W * (secondarySide + (rand() - 0.5) * 0.16),
        width: W * (0.10 + rand() * 0.08),
        depth: H * (0.28 + rand() * 0.14),
    };
    const mountainFeatures = [
        {
            cx: clamp(mainGorge.cx - W * (0.17 + rand() * 0.10), win.left + W * 0.08, win.right - W * 0.08),
            width: W * (0.12 + rand() * 0.10),
            height: H * (0.25 + rand() * 0.20),
        },
        {
            cx: clamp(mainGorge.cx + W * (0.17 + rand() * 0.10), win.left + W * 0.08, win.right - W * 0.08),
            width: W * (0.12 + rand() * 0.10),
            height: H * (0.25 + rand() * 0.20),
        },
    ];

    for (let i = 0; i < heights.length; i++) {
        const x = xs[i];
        heights[i] -= mainGorge.depth * gaussian(x, mainGorge.cx, mainGorge.width);
        heights[i] -= secondaryGorge.depth * gaussian(x, secondaryGorge.cx, secondaryGorge.width);
        for (const m of mountainFeatures) heights[i] += m.height * gaussian(x, m.cx, m.width);
    }

    // Small angular detail goes on after the macro shapes. It should never be
    // the main source of gorge depth.
    for (let i = 0; i < heights.length; i++) {
        const u = i / N;
        const detail = (fbm1D(noise, detailOffset + u * 16.0, 4) - 0.5) * 2;
        heights[i] = clamp(heights[i] + detail * H * 0.035, yFloor, yCeil);
    }

    // Limit adjacent sample deltas to prevent vertical cliffs while preserving
    // dangerous angular segments. This is not a smoothing filter.
    const maxDeltaY = H * 0.18;
    breakFlatSpans(heights, rand, yFloor, yCeil, range);
    limitSlopes(heights, maxDeltaY);

    const pads = [];
    const edgeGuard = Math.max(8, Math.floor(N * 0.08));
    const padGap = 5;

    const localSlopeStats = (start, end) => {
        let slopeSum = 0;
        let maxSlope = 0;
        const from = Math.max(1, start - 3);
        const to = Math.min(N, end + 3);
        for (let i = from; i <= to; i++) {
            const slope = Math.abs(heights[i] - heights[i - 1]);
            slopeSum += slope;
            maxSlope = Math.max(maxSlope, slope);
        }
        return {
            avgSlope: slopeSum / Math.max(1, to - from + 1),
            maxSlope,
        };
    };

    const makeCandidates = (type) => {
        const widthCols = Math.max(2, Math.min(Math.round((W * type.widthFrac) / dx), N - edgeGuard * 2 - 1));
        const candidates = [];

        for (let start = edgeGuard; start <= N - edgeGuard - widthCols; start++) {
            const end = start + widthCols;
            const x1 = xs[start];
            const x2 = xs[end];
            if (pads.some(p => overlaps(x1, x2, p.x1, p.x2, padGap * dx))) continue;

            const stats = localSlopeStats(start, end);
            const centerIdx = Math.floor((start + end) * 0.5);
            const y = heights[centerIdx];
            const altitude01 = clamp((y - yFloor) / range, 0, 1);
            const center01 = (start + end) * 0.5 / N;
            const leftApproach = Math.abs(heights[start] - heights[Math.max(0, start - 2)]);
            const rightApproach = Math.abs(heights[end] - heights[Math.min(N, end + 2)]);
            const approachJump = Math.max(leftApproach, rightApproach);
            const shelfScore = stats.avgSlope + stats.maxSlope * 2.0 + approachJump * 0.7;
            const ridgeScore = altitude01 + Math.max(0, y - heights[Math.max(0, centerIdx - 4)]) / range +
                               Math.max(0, y - heights[Math.min(N, centerIdx + 4)]) / range;

            candidates.push({
                start,
                end,
                x1,
                x2,
                y,
                altitude01,
                center01,
                shelfScore,
                ridgeScore,
                maxSlope: stats.maxSlope,
            });
        }

        return candidates;
    };

    const scoreCandidate = (type, c) => {
        const edgePenalty = Math.abs(c.center01 - 0.5) * range * 0.035;
        if (type.difficulty === 'EASY') {
            return c.shelfScore * 2.8 + Math.abs(c.altitude01 - 0.18) * H * 0.35 + edgePenalty;
        }
        if (type.difficulty === 'MEDIUM') {
            return c.shelfScore * 2.1 + Math.abs(c.altitude01 - 0.45) * H * 0.16 + edgePenalty;
        }
        if (type.difficulty === 'HARD') {
            return c.shelfScore * 1.6 + Math.abs(c.altitude01 - 0.67) * H * 0.12 - c.ridgeScore * H * 0.04;
        }
        return c.shelfScore * 1.2 + Math.abs(c.altitude01 - 0.78) * H * 0.09 - c.ridgeScore * H * 0.09;
    };

    for (const type of padTypes) {
        const candidates = makeCandidates(type)
            .filter(c => c.maxSlope <= maxDeltaY * (type.difficulty === 'EXPERT' ? 0.80 : 0.62))
            .sort((a, b) => scoreCandidate(type, a) - scoreCandidate(type, b));

        const pickWindow = Math.min(candidates.length, type.difficulty === 'EASY' ? 3 : 6);
        const chosen = pickWindow > 0
            ? candidates[Math.floor(rand() * pickWindow)]
            : makeCandidates(type).sort((a, b) => scoreCandidate(type, a) - scoreCandidate(type, b))[0];

        if (!chosen) continue;

        const { start, end } = chosen;
        const surrounding = [];
        for (let i = Math.max(0, start - 2); i <= Math.min(N, end + 2); i++) {
            if (i < start || i > end) {
                surrounding.push(heights[i]);
            }
        }

        // Pads are intentionally flat. They are carved into naturally flatter
        // shelf areas so the exact flat segment reads as a landing pad instead
        // of creating an artificial rectangular cliff. The multiplier encodes
        // landing difficulty and feeds score risk/reward.
        const baseY = surrounding.length
            ? surrounding.reduce((sum, h) => sum + h, 0) / surrounding.length
            : heights[start];
        const awkward = type.multiplier >= 3 ? (rand() - 0.5) * range * 0.08 : 0;
        const padY = clamp(baseY + awkward, yFloor + H * 0.035, yCeil - H * 0.035);

        // Blend the immediate approach vertices toward the pad height. The
        // landing span itself is flat, while the endpoints form short shelves
        // instead of tall rectangular cuts in the surrounding terrain.
        if (start > 1) heights[start - 2] = lerp(heights[start - 2], padY, 0.25);
        if (start > 0) heights[start - 1] = clamp(lerp(heights[start - 1], padY, 0.60),
                                                  padY - maxDeltaY, padY + maxDeltaY);
        if (end < N) heights[end + 1] = clamp(lerp(heights[end + 1], padY, 0.60),
                                              padY - maxDeltaY, padY + maxDeltaY);
        if (end < N - 1) heights[end + 2] = lerp(heights[end + 2], padY, 0.25);
        for (let i = start; i <= end; i++) heights[i] = padY;

        pads.push({
            x1: xs[start],
            x2: xs[end],
            y: padY,
            multiplier: type.multiplier,
            label: type.label,
            difficulty: type.difficulty,
            startIdx: start,
            endIdx: end,
        });
    }

    const padMask = Array.from({ length: heights.length }, () => false);
    for (const pad of pads) {
        for (let i = Math.max(0, pad.startIdx); i <= Math.min(N, pad.endIdx); i++) padMask[i] = true;
        delete pad.startIdx;
        delete pad.endIdx;
    }
    breakFlatSpans(heights, rand, yFloor, yCeil, range, padMask);

    const vertices = xs.map((x, i) => ({ x, y: heights[i] }));
    const bounds = {
        left: win.left,
        right: win.right,
        bottom: Math.min(...heights),
        top: Math.max(...heights),
    };

    return {
        vertices,
        pads: pads.sort((a, b) => a.x1 - b.x1),
        bounds,
    };
};

// ---------- Queries ----------

// Piecewise-linear height at world-x
export const heightAt = (terrain, x) => {
    const v = terrain.vertices;
    if (x <= v[0].x)              return v[0].y;
    if (x >= v[v.length - 1].x)   return v[v.length - 1].y;
    for (let i = 0; i < v.length - 1; i++) {
        if (x >= v[i].x && x <= v[i + 1].x) {
            const t = (x - v[i].x) / (v[i + 1].x - v[i].x);
            return v[i].y + t * (v[i + 1].y - v[i].y);
        }
    }
    return v[v.length - 1].y;
};

// Returns the landing pad whose x-span contains x, or null
export const findPadUnder = (terrain, x) => {
    for (const pad of terrain.pads) {
        if (x >= pad.x1 && x <= pad.x2) return pad;
    }
    return null;
};
