// File: src/ai/csp/australia-map.js
// Australia Map-Coloring CSP Demo — Polished UI
// - Gradient device BG + card HUD
// - Soft node glow + rounded domain chips
// - Animated pulse on new assignments
// - Device-space crisp labels at world coords

import { createGraphicsContext2 } from '../../graphics_context2.js';
import {
    buildComposites,
    makeStrokePx,
    applyWorld,
    makeWorldToDevice,
    createDeviceTextAtWorld
} from '../../lib/esm/graphics.js';
import { createCSP } from './createCSP.js';

// --- tiny utils ---------------------------------------------------------------
const cloneDomains = (d) => { const out = {}; for (const k in d) out[k] = [...d[k]]; return out; };

const edgesFromNeighbors = (neighbors) => {
    const seen = new Set(); const edges = [];
    for (const a in neighbors) for (const b of neighbors[a] || []) {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!seen.has(key)) { seen.add(key); edges.push(a < b ? [a, b] : [b, a]); }
    }
    return edges;
};

const positions = {
    WA:  [-7.0,  0.5],
    NT:  [-1.0,  3.5],
    SA:  [ 0.0,  0.5],
    Q:   [ 5.5,  3.5],
    NSW: [ 6.0,  0.5],
    V:   [ 6.0, -2.5],
    T:   [ 7.0, -6.0]
};

const palette = {
    red:   [230, 95, 95],
    green: [ 95,195, 95],
    blue:  [ 95,135,235]
};

const makeProblem = (timeStep = 18, cb = null) => {
    const variables = ['WA','NT','SA','Q','NSW','V','T'];
    const colors = Object.keys(palette);
    const domains = variables.reduce((o, v) => (o[v] = [...colors], o), {});
    const neighbors = {
        WA:['NT','SA'],
        NT:['WA','SA','Q'],
        SA:['WA','NT','Q','NSW','V'],
        Q:['NT','SA','NSW'],
        NSW:['Q','SA','V'],
        V:['SA','NSW'],
        T:[]
    };
    const constraints = (A, a, B, b) => a !== b;
    return { variables, domains, neighbors, constraints, cb, timeStep };
};

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

// --- demo factory -------------------------------------------------------------
export const createAustraliaMapCSPDemo = (sk, CANVAS_WIDTH = 920, CANVAS_HEIGHT = 660) => {
    // World & view
    const win  = { left: -10, right: 10, bottom: -9, top: 9 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);

    const { COMPOSITE, pixelToWorld } =
        buildComposites(CANVAS_WIDTH, CANVAS_HEIGHT, ctx.viewport);

    const strokePx = makeStrokePx(pixelToWorld);
    const worldToDevice = makeWorldToDevice(COMPOSITE);
    const drawTextAtWorld = createDeviceTextAtWorld(sk, worldToDevice);

    const state = {
        frames: [],
        fi: 0,
        edges: edgesFromNeighbors(makeProblem().neighbors),
        stepEvery: 16,
        pulse: {},            // name -> 0..1
        lastAssign: {}        // track assignments to trigger pulses
    };

    const nodeR = () => pixelToWorld(22);

    const makeFrame = (label, assignment, domains) => ({
        label,
        assignment: { ...assignment },
        domains: cloneDomains(domains)
    });

    const runOnce = () => {
        if (state.frames.length) return;
        const frames = state.frames;
        const onStep = (a, d) => frames.push(makeFrame('search', a, d));
        const prob = makeProblem(state.stepEvery, onStep);

        frames.push(makeFrame('initial', {}, prob.domains));
        const { solve } = createCSP();
        const sol = solve(prob);
        frames.push(makeFrame(sol ? 'solution' : 'failure', sol || {}, {}));
    };

    // --- device-space background (gradient) ------------------------------------
    const drawBackground = () => {
        sk.resetMatrix();
        const gTop = [18, 22, 30], gBot = [8, 10, 12];
        for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
            const t = y / CANVAS_HEIGHT;
            const r = gTop[0] * (1 - t) + gBot[0] * t;
            const g = gTop[1] * (1 - t) + gBot[1] * t;
            const b = gTop[2] * (1 - t) + gBot[2] * t;
            sk.stroke(r, g, b); sk.line(0, y, CANVAS_WIDTH, y);
        }
    };

    // --- world pass -------------------------------------------------------------
    const drawGraphWorld = (frame) => {
        applyWorld(sk, COMPOSITE);

        // Edges (soft)
        sk.push();
        sk.noFill();
        sk.stroke(190, 190, 205, 140);
        sk.strokeWeight(strokePx(2));
        for (const [a, b] of state.edges) {
            const [ax, ay] = positions[a];
            const [bx, by] = positions[b];
            sk.line(ax, ay, bx, by);
        }
        sk.pop();

        // Nodes
        for (const name in positions) {
            const [x, y] = positions[name];
            const assigned = frame.assignment[name];
            const baseR = nodeR();

            // Pulse animation if newly assigned
            const p = state.pulse[name] || 0;
            const k = easeOutCubic(p);
            const r = baseR * (1 + 0.25 * k);

            // Glow
            sk.push();
            sk.noStroke();
            const glow = assigned ? palette[assigned] : [160, 170, 190];
            sk.fill(glow[0], glow[1], glow[2], 40);
            sk.ellipse(x, y, 2 * r * 1.35, 2 * r * 1.35);
            sk.pop();

            // Node circle
            sk.push();
            sk.stroke(25, 28, 35);
            sk.strokeWeight(strokePx(2));
            if (assigned) {
                const c = palette[assigned];
                sk.fill(c[0], c[1], c[2]);
            } else {
                sk.fill(28, 30, 38);
            }
            sk.ellipse(x, y, 2 * r, 2 * r);
            sk.pop();

            // Domain chips (rounded)
            const dom = frame.domains[name] || [];
            if (!assigned && dom.length) {
                const pad = pixelToWorld(6);
                const chip = pixelToWorld(11);
                const y0  = y - r - pixelToWorld(16);
                dom.forEach((col, i) => {
                    const c = palette[col];
                    const x0 = x - (dom.length * (chip + pad) - pad) / 2 + i * (chip + pad);
                    sk.push();
                    sk.noStroke();
                    sk.fill(20, 22, 28, 180);
                    sk.rect(x0, y0, chip, chip, pixelToWorld(3));
                    sk.fill(c[0], c[1], c[2]);
                    sk.rect(x0 + pixelToWorld(2), y0 + pixelToWorld(2), chip - pixelToWorld(4), chip - pixelToWorld(4), pixelToWorld(2));
                    sk.pop();
                });
            }

            // Labels (crisp, halo)
            drawTextAtWorld(name, x, y, { px: 14, color: [0,0,0,170] });
            drawTextAtWorld(name, x, y, { px: 14, color: [255,255,255,220] });
        }
    };

    // --- HUD (device space) -----------------------------------------------------
    const drawHUD = (frame) => {
        sk.resetMatrix();
        // Card
        sk.noStroke();
        sk.fill(0, 0, 0, 70);
        sk.rect(10, 10, 360, 64, 10);

        // Text
        sk.fill(240);
        sk.textSize(16);
        sk.text(`Australia Map Coloring`, 24, 30);
        sk.fill(200);
        sk.textSize(12);
        sk.text(`AC-3 + MRV + LCV`, 24, 48);
        sk.text(`Step ${state.fi + 1} / ${state.frames.length} — ${frame.label}`, 180, 48);
    };

    // --- pulse bookkeeping ------------------------------------------------------
    const updatePulses = (frame) => {
        // Bump pulse when a variable goes from unassigned → assigned
        for (const name in positions) {
            const prev = state.lastAssign[name];
            const now  = frame.assignment[name];
            if ((prev == null) && (now != null)) state.pulse[name] = 1;
            state.lastAssign[name] = now;
        }
        // Decay
        for (const k in state.pulse) {
            state.pulse[k] *= 0.88;
            if (state.pulse[k] < 0.01) delete state.pulse[k];
        }
    };

    // --- lifecycle --------------------------------------------------------------
    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            runOnce();
        },
        display() {
            drawBackground();

            const idx = Math.min(state.fi, state.frames.length - 1);
            const frame = state.frames[idx];

            drawGraphWorld(frame);
            drawHUD(frame);
            updatePulses(frame);

            const stepEvery = frame.label === 'solution' || frame.label === 'failure'
                ? state.stepEvery
                : (makeProblem().timeStep || state.stepEvery);

            if (sk.frameCount % stepEvery === 0 && state.fi < state.frames.length - 1) state.fi++;
        }
    };
};

export default createAustraliaMapCSPDemo;
