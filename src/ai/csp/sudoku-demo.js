// File: src/ai/csp/sudoku-demo.js
// Sudoku 9x9 CSP Demo (Norvig-style CSP + shared graphics utils)

import { createGraphicsContext2 } from '../../graphics_context2.js';
import {
    buildComposites, makeStrokePx, applyWorld,
    makeWorldToDevice, createDeviceTextAtWorld
} from '../../lib/esm/graphics.js';
import { createCSP } from './createCSP.js';

// ---------- orientation helpers (fix row flip) ----------
const ROWS = 'ABCDEFGHI';
const varNameAt = (r, c) => ROWS[9 - r] + String(c);   // world r=1(bottom) → 'I', r=9(top) → 'A'
const givenIndexAt = (r, c) => (9 - r) * 9 + (c - 1);  // world (r,c) → gridStr index 0..80

// ---------- Problem builder (Norvig/AIMA style) ----------
const makeSudokuProblem = (gridStr, cb = null, timeStep = 8) => {
    // gridStr: 81 chars: digits or . / 0 for blanks
    const rows = ROWS.split('');
    const cols = '123456789'.split('');
    const cell = (r, c) => `${r}${c}`;
    const variables = [];
    for (const r of rows) for (const c of cols) variables.push(cell(r, c));

    const digits = cols.map(x => +x);
    const domains = Object.fromEntries(variables.map(v => [v, digits.slice()]));

    // Pre-set givens
    for (let i = 0; i < 81; i++) {
        const ch = gridStr[i];
        if (!ch || ch === '.' || ch === '0') continue;
        const v = variables[i];
        domains[v] = [+ch];
    }

    // Peers: same row, same col, same 3x3 box
    const neighbors = {};
    for (const r of rows) {
        for (const c of cols) {
            const v = cell(r, c);
            const peers = new Set();
            // row
            for (const c2 of cols) if (c2 !== c) peers.add(cell(r, c2));
            // col
            for (const r2 of rows) if (r2 !== r) peers.add(cell(r2, c));
            // box
            const rs = Math.floor(rows.indexOf(r) / 3) * 3;
            const cs = Math.floor(cols.indexOf(c) / 3) * 3;
            for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
                const rr = rows[rs + dr], cc = cols[cs + dc];
                const u = cell(rr, cc);
                if (u !== v) peers.add(u);
            }
            neighbors[v] = [...peers];
        }
    }

    const constraints = (_A, a, _B, b) => a !== b; // all-different on peers
    return { variables, domains, neighbors, constraints, cb, timeStep, rows, cols };
};

// ---------- Demo factory ----------
export const createSudokuCSPDemo = (sk, W = 720, H = 720) => {
    // Window: 9x9 cells, each cell = 1 world unit, margin around
    const PAD = 0.6;
    const win = { left: -4.5 - PAD, right: 4.5 + PAD, bottom: -4.5 - PAD, top: 4.5 + PAD };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    const ctx = createGraphicsContext2(win, view, W, H, sk);
    const { COMPOSITE, pixelToWorld } = buildComposites(W, H, ctx.viewport);
    const strokePx = makeStrokePx(pixelToWorld);
    const worldToDevice = makeWorldToDevice(COMPOSITE);
    const drawTextAtWorld = createDeviceTextAtWorld(sk, worldToDevice);

    // Easy puzzle (0 or . is blank)
    const GRID =
        '530070000' +
        '600195000' +
        '098000060' +
        '800060003' +
        '400803001' +
        '700020006' +
        '060000280' +
        '000419005' +
        '000080079';

    const state = { frames: [], fi: 0, stepEvery: 8, given: new Set() };

    // Mark givens using world→grid index mapping
    for (let r = 1; r <= 9; r++) {
        for (let c = 1; c <= 9; c++) {
            const idx = givenIndexAt(r, c);
            const ch  = GRID[idx];
            if (ch && ch !== '.' && ch !== '0') state.given.add(idx);
        }
    }

    // Build frames through solver cb
    const cloneDomains = (doms)=>{ const o={}; for(const k in doms) o[k]=[...doms[k]]; return o; };
    const frameOf = (label, A, D) => ({ label, A: { ...A }, D: cloneDomains(D) });

    const runOnce = () => {
        if (state.frames.length) return;
        const onStep = (A, D) => state.frames.push(frameOf('search', A, D));
        const problem = makeSudokuProblem(GRID, onStep, state.stepEvery);
        state.frames.push(frameOf('initial', {}, problem.domains));
        const { solve } = createCSP();
        const sol = solve(problem);
        state.frames.push(frameOf(sol ? 'solution' : 'failure', sol || {}, {}));
    };

    const cellCenter = (r, c) => ([-4 + (c - 0.5), -4 + (r - 0.5)]); // rows/cols 1..9, world Y-up

    const drawBoard = () => {
        applyWorld(sk, COMPOSITE);

        // Base
        sk.push(); sk.noStroke(); sk.fill(36, 38, 46);
        sk.rect(-4.5, -4.5, 9, 9, pixelToWorld(10)); sk.pop();

        // 3x3 box shading
        sk.push(); sk.noStroke();
        for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
            const x = -4.5 + bc * 3, y = -4.5 + br * 3;
            sk.fill((br + bc) % 2 === 0 ? 44 : 52);
            sk.rect(x, y, 3, 3);
        }
        sk.pop();

        // Thin grid
        sk.push(); sk.noFill(); sk.stroke(26); sk.strokeWeight(strokePx(1));
        for (let i = 0; i <= 9; i++) { const x = -4.5 + i, y = -4.5 + i;
            sk.line(-4.5, y, 4.5, y); sk.line(x, -4.5, x, 4.5);
        }
        sk.pop();

        // Thick box lines
        sk.push(); sk.noFill(); sk.stroke(230); sk.strokeWeight(strokePx(2));
        for (let i = 0; i <= 9; i += 3) { const x = -4.5 + i, y = -4.5 + i;
            sk.line(-4.5, y, 4.5, y); sk.line(x, -4.5, x, 4.5);
        }
        sk.pop();
    };

    const drawDigits = (frame) => {
        for (let r = 1; r <= 9; r++) for (let c = 1; c <= 9; c++) {
            const name = varNameAt(r, c);               // correct variable name for world row
            const v = frame.A[name];
            if (!v) continue;
            const [x, y] = cellCenter(r, c);
            const idx = givenIndexAt(r, c);
            const isGiven = state.given.has(idx);

            // halo + glyph
            drawTextAtWorld(String(v), x, y, { px: 24, color: [0, 0, 0, 160] });
            drawTextAtWorld(String(v), x, y, { px: 24, color: isGiven ? [200,210,220] : [255,255,255] });
        }
    };

    const drawHUD = (frame) => {
        sk.resetMatrix();
        sk.noStroke(); sk.fill(0,0,0,70); sk.rect(10,10,280,62,10);
        sk.fill(240); sk.textSize(16); sk.text('Sudoku 9×9', 24, 30);
        sk.fill(200); sk.textSize(12);
        sk.text(`AC-3 + MRV + LCV`, 24, 48);
        sk.text(`Step ${state.fi+1}/${state.frames.length} — ${frame.label}`, 160, 48);
    };

    return {
        setup(){ sk.createCanvas(W, H); runOnce(); },
        display(){
            sk.background(20);
            const i = Math.min(state.fi, state.frames.length - 1);
            const f = state.frames[i];
            drawBoard(); drawDigits(f); drawHUD(f);
            if (sk.frameCount % state.stepEvery === 0 && state.fi < state.frames.length - 1) state.fi++;
        }
    };
};

export default createSudokuCSPDemo;
