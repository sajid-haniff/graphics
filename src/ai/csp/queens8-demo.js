// File: src/ai/csp/queens8-demo.js
// 8-Queens Demo — Polished UI
// - Warm gradient BG + glass HUD card
// - Subtle board shading, soft grid, crisp coords
// - Queens with shadow & highlight
// - Pulse on each newly placed queen

import { createGraphicsContext2 } from '../../graphics_context2.js';
import {
    buildComposites,
    makeStrokePx,
    applyWorld,
    makeWorldToDevice,
    createDeviceTextAtWorld
} from '../../lib/esm/graphics.js';
import { createCSP } from './createCSP.js';

const cloneDomains = (d) => { const o = {}; for (const k in d) o[k] = [...d[k]]; return o; };
const range = (n) => Array.from({ length: n }, (_, i) => i);
const rowIndex = (name) => parseInt(name.slice(1), 10);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/**
 * Build the standard N-Queens CSP in Norvig/AIMA form.
 *
 * Variables
 *   R1..RN  (one variable per row; Rk means “row k”)
 *
 * Domains
 *   For every Ri: [1, 2, ..., N]  (column indices)
 *
 * Neighbors
 *   Fully connected among rows: each Ri is a neighbor of every Rj (i ≠ j).
 *   (Undirected constraints are represented by listing both directions.)
 *
 * Constraints (A=a, B=b)
 *   - Columns differ:              a !== b
 *   - Not on same diagonal:        |a - b| !== |row(A) - row(B)|
 *     where row('Rk') = k (1-based)
 *
 * @param {number} [N=8]            Board size (N×N) and domain cardinality.
 * @param {number} [timeStep=10]    Optional pacing hint for visualizers (ignored by solver).
 * @param {Function|null} [cb=null] Optional callback for solver steps (ignored here; passed through).
 * @returns {{
 *   variables: string[],                           // ['R1',...,'RN']
 *   domains: Record<string, number[]>,             // { R1:[1..N], ... }
 *   neighbors: Record<string, string[]>,           // fully connected graph
 *   constraints: (A:string,a:number,B:string,b:number)=>boolean,
 *   cb: Function|null,
 *   timeStep: number,
 *   N: number
 * }}
 *
 * Notes
 * - This builder is UI-agnostic and matches the solver’s expected shape.
 * - `rowIndex(A)` must return the numeric row from a name like 'R3'.
 * - `range(n)` must return [0..n-1]. Domains are copied so each variable
 *   owns its array (no shared references).
 */
const makeQueensProblem = (N = 8, timeStep = 10, cb = null) => {
    const variables = range(N).map(i => `R${i + 1}`);          // ['R1',...,'RN']
    const columns   = range(N).map(i => i + 1);                // [1..N]

    // Domains: Ri → fresh copy of [1..N]
    const domains = variables.reduce((o, v) => (o[v] = [...columns], o), {});

    // Neighbors: fully connected among rows (both directions)
    const neighbors = variables.reduce((o, a) => (o[a] = variables.filter(b => b !== a), o), {});

    // Constraints: different columns and different diagonals
    const constraints = (A, a, B, b) => {
        if (a === b) return false;                   // same column
        const rA = rowIndex(A), rB = rowIndex(B);    // 1-based row numbers
        return Math.abs(a - b) !== Math.abs(rA - rB);
    };

    return { variables, domains, neighbors, constraints, cb, timeStep, N };
};

export const createEightQueensCSPDemo = (sk, CANVAS_WIDTH = 760, CANVAS_HEIGHT = 760) => {
    const PAD = 0.7;
    const worldLeft = -4 - PAD, worldRight = 4 + PAD, worldBottom = -4 - PAD, worldTop = 4 + PAD;

    const win  = { left: worldLeft, right: worldRight, bottom: worldBottom, top: worldTop };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { COMPOSITE, pixelToWorld } = buildComposites(CANVAS_WIDTH, CANVAS_HEIGHT, ctx.viewport);
    const strokePx = makeStrokePx(pixelToWorld);
    const worldToDevice = makeWorldToDevice(COMPOSITE);
    const drawTextAtWorld = createDeviceTextAtWorld(sk, worldToDevice);

    const N = 8;
    const cell = 1;
    const half = (N * cell) / 2;
    const boardMinX = -half, boardMinY = -half;

    const state = {
        frames: [],
        fi: 0,
        stepEvery: 10,
        pulse: {},     // row -> 0..1
        lastAssign: {}
    };

    const makeFrame = (label, assignment, domains) => ({
        label,
        assignment: { ...assignment },
        domains: cloneDomains(domains)
    });

    const runOnce = () => {
        if (state.frames.length) return;
        const onStep = (a, d) => state.frames.push(makeFrame('search', a, d));
        const problem = makeQueensProblem(N, state.stepEvery, onStep);
        state.frames.push(makeFrame('initial', {}, problem.domains));
        const { solve } = createCSP();
        const sol = solve(problem);
        state.frames.push(makeFrame(sol ? 'solution' : 'failure', sol || {}, {}));
    };

    const cellCenter = (row, col) => {
        const x = boardMinX + (col - 0.5) * cell;
        const y = boardMinY + (row - 0.5) * cell;
        return [x, y];
    };

    // --- device gradient --------------------------------------------------------
    const drawBackground = () => {
        sk.resetMatrix();
        const top = [26, 22, 30], bot = [10, 12, 16];
        for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
            const t = y / CANVAS_HEIGHT;
            const r = top[0] * (1 - t) + bot[0] * t;
            const g = top[1] * (1 - t) + bot[1] * t;
            const b = top[2] * (1 - t) + bot[2] * t;
            sk.stroke(r, g, b); sk.line(0, y, CANVAS_WIDTH, y);
        }
    };

    const drawBoard = () => {
        applyWorld(sk, COMPOSITE);

        // Board shadow
        sk.push();
        sk.noStroke();
        sk.fill(0, 0, 0, 50);
        sk.rect(boardMinX - 0.08, boardMinY - 0.08, N * cell + 0.16, N * cell + 0.16, pixelToWorld(10));
        sk.pop();

        // Board base
        sk.push();
        sk.noStroke();
        sk.fill(34, 36, 44);
        sk.rect(boardMinX, boardMinY, N * cell, N * cell, pixelToWorld(10));
        sk.pop();

        // Checker
        sk.push();
        sk.noStroke();
        for (let r = 1; r <= N; r++) {
            for (let c = 1; c <= N; c++) {
                const isDark = (r + c) % 2 === 0;
                const [x, y] = cellCenter(r, c);
                const hw = cell / 2, hh = cell / 2;
                sk.fill(isDark ? 60 : 90);
                sk.rect(x - hw, y - hh, cell, cell);
            }
        }
        sk.pop();

        // Soft grid lines
        sk.push();
        sk.noFill();
        sk.stroke(20, 22, 28);
        sk.strokeWeight(strokePx(1));
        for (let i = 0; i <= N; i++) {
            const x = boardMinX + i * cell;
            const y = boardMinY + i * cell;
            sk.line(boardMinX, y, boardMinX + N * cell, y);
            sk.line(x, boardMinY, x, boardMinY + N * cell);
        }
        sk.pop();
    };

    const drawQueenGlyph = (x, y, R, pulseK) => {
        // shadow
        sk.push();
        sk.noStroke();
        sk.fill(0, 0, 0, 90);
        sk.ellipse(x + pixelToWorld(3), y - pixelToWorld(3), 2 * R * 0.98, 2 * R * 0.98);
        sk.pop();

        // body
        sk.push();
        sk.noStroke();
        sk.fill(235);
        sk.ellipse(x, y, 2 * R, 2 * R);

        // crown (simple 5-peak)
        const h = R * 0.95 * (1 + 0.15 * pulseK);
        const w = R * 1.05 * (1 + 0.10 * pulseK);
        const baseY = y + R * 0.2;
        const crownY = y + R * 0.85;
        sk.fill(250, 235, 120);
        sk.beginShape();
        sk.vertex(x - w, baseY);
        for (let i = 0; i < 5; i++) {
            const t = i / 4;
            const cx = x - w + t * (2 * w);
            const cy = crownY - Math.sin(t * Math.PI) * h;
            sk.vertex(cx, cy);
        }
        sk.vertex(x + w, baseY);
        sk.endShape(sk.CLOSE);
        sk.pop();

        // ring
        sk.push();
        sk.noFill();
        sk.stroke(30);
        sk.strokeWeight(strokePx(2));
        sk.ellipse(x, y, 2 * R, 2 * R);
        sk.pop();
    };

    const drawQueens = (frame) => {
        applyWorld(sk, COMPOSITE);
        for (let r = 1; r <= N; r++) {
            const varName = `R${r}`;
            const col = frame.assignment[varName];
            if (!col) continue;
            const [x, y] = cellCenter(r, col);

            const p = state.pulse[varName] || 0;
            const k = easeOutCubic(p);

            const R = cell * (0.34 + 0.08 * k);
            drawQueenGlyph(x, y, R, k);
        }
    };

    const drawCoords = () => {
        for (let c = 1; c <= N; c++) {
            const [x] = cellCenter(1, c);
            const y = boardMinY - cell * 0.65;
            // halo + text
            sk.push(); sk.resetMatrix(); sk.noStroke(); sk.fill(0,0,0,120); sk.textSize(12);
            const [dx1, dy1] = worldToDevice(x, y); sk.text(String(c), dx1, dy1);
            sk.fill(230); const [dx2, dy2] = worldToDevice(x, y); sk.text(String(c), dx2, dy2);
            sk.pop();
        }
        for (let r = 1; r <= N; r++) {
            const [, y] = cellCenter(r, 1);
            const x = boardMinX - cell * 0.65;
            sk.push(); sk.resetMatrix(); sk.noStroke(); sk.fill(0,0,0,120); sk.textSize(12);
            const [dx1, dy1] = worldToDevice(x, y); sk.text(String(r), dx1, dy1);
            sk.fill(230); const [dx2, dy2] = worldToDevice(x, y); sk.text(String(r), dx2, dy2);
            sk.pop();
        }
    };

    const drawHUD = (frame) => {
        sk.resetMatrix();
        sk.noStroke();
        sk.fill(0, 0, 0, 70);
        sk.rect(10, 10, 300, 64, 10);
        sk.fill(240); sk.textSize(16); sk.text(`8-Queens`, 24, 30);
        sk.fill(200); sk.textSize(12);
        sk.text(`AC-3 + MRV + LCV`, 24, 48);
        sk.text(`Step ${state.fi + 1} / ${state.frames.length} — ${frame.label}`, 150, 48);
    };

    const updatePulses = (frame) => {
        for (let r = 1; r <= N; r++) {
            const k = `R${r}`;
            const prev = state.lastAssign[k];
            const now  = frame.assignment[k];
            if ((prev == null) && (now != null)) state.pulse[k] = 1;
            state.lastAssign[k] = now;
        }
        for (const k in state.pulse) {
            state.pulse[k] *= 0.9;
            if (state.pulse[k] < 0.01) delete state.pulse[k];
        }
    };

    return {
        setup() { sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT); runOnce(); },
        display() {
            drawBackground();

            const idx = Math.min(state.fi, state.frames.length - 1);
            const frame = state.frames[idx];

            drawBoard();
            drawQueens(frame);
            drawCoords();
            drawHUD(frame);
            updatePulses(frame);

            if (sk.frameCount % state.stepEvery === 0 && state.fi < state.frames.length - 1) state.fi++;
        }
    };
};

export default createEightQueensCSPDemo;
