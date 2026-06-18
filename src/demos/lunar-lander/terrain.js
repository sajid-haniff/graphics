// ============================================================================
// terrain.js — procedural 1D lunar heightmap with landing pads
//
// generateTerrain(seed, win)  → { vertices, pads }
//   vertices  — [{x, y}] polyline spanning win.left..win.right, Y-up world coords
//   pads      — [{x1, x2, y, multiplier}]
//                 multiplier: narrower/harder pads score higher (risk/reward)
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

export const generateTerrain = (seed, win) => {
    const rand = lcg(seed);
    const W    = win.right  - win.left;
    const H    = win.top    - win.bottom;

    // 24 columns — enough for craggy silhouette, cheap enough for per-frame heightAt
    const N    = 24;
    const dx   = W / N;

    // Terrain occupies lower 15–60% of the world height
    const yFloor = win.bottom + H * 0.12;
    const yCeil  = win.bottom + H * 0.56;

    // Column x-positions (N+1 edges, N segments)
    const xs = Array.from({ length: N + 1 }, (_, i) => win.left + i * dx);

    // Random walk with per-step clamped drift
    let y = yFloor + rand() * (yCeil - yFloor) * 0.55;
    const heights = [y];
    for (let i = 1; i <= N; i++) {
        y += (rand() - 0.5) * H * 0.22;
        y  = Math.max(yFloor, Math.min(yCeil, y));
        heights.push(y);
    }

    // Pad definitions: (segment index, half-width in world units, score multiplier)
    // Pad 0 — wide, easy, low multiplier — roughly 25% along the map
    // Pad 1 — narrow, harder, high multiplier — roughly 65% along the map
    const padDefs = [
        { segIdx: Math.floor(N * 0.22), halfW: 2.4,  multiplier: 1.0 },
        { segIdx: Math.floor(N * 0.62), halfW: 1.4,  multiplier: 2.0 },
    ];

    const pads = padDefs.map(({ segIdx, halfW, multiplier }) => {
        const i    = Math.min(segIdx, N - 1);
        const padY = heights[i];
        const x1   = xs[i];
        const x2   = x1 + halfW * 2;

        // Flatten the two column edges that bound this pad
        heights[i]     = padY;
        heights[i + 1] = padY;

        return { x1, x2, y: padY, multiplier };
    });

    const vertices = xs.map((x, i) => ({ x, y: heights[i] }));
    return { vertices, pads };
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
