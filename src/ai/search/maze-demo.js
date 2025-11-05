// src/ai/search/demos/maze-demo.js
/**
 * Search Maze Demo (AIMA-style) for p5.js via `sk`.
 * Drop-in file — only this file changes.
 *
 * Controls:
 *   1 BFS, 2 DFS, 3 UCS, 4 A*, 5 Greedy, 6 IDDFS, 7 Bidirectional, 8 IDA*, 9 RBFS
 *   R regenerate maze
 *   S solve (and start playback)
 *   H toggle heuristic (Manhattan ↔ Zero)
 *   Space play/pause
 *   [ / ] decrease/increase playback speed (0.2× … 5×)
 */
import { createGraphicsContext2 } from '../../graphics_context2.js';
import {
    buildComposites,
    applyWorld,
    makeWorldToDevice,
    createDeviceTextAtWorld,
} from '../../lib/esm/graphics.js';

import { createBfs } from './bfs.js';
import { createDfs } from './dfs.js';
import { createUcs } from './ucs.js';
import { createGbfs } from './gbfs.js';
import { createAStar } from './astar.js';
import { createBidirectional } from './bidirectional.js';
import { createRbfs } from './rbfs.js';

// ------------------------------------------------------------
// Config & helpers
// ------------------------------------------------------------
const ALGOS = [
    { key: '1', name: 'BFS',            make: createBfs },
    { key: '2', name: 'DFS',            make: () => createDfs({ tree: false }) },
    { key: '3', name: 'UCS',            make: createUcs },
    { key: '4', name: 'A*',             make: createAStar },
    { key: '5', name: 'Greedy',         make: createGbfs },
    { key: '7', name: 'Bidirectional',  make: createBidirectional },
    { key: '9', name: 'RBFS',           make: createRbfs },
];

const DIRS = [ [ 1, 0], [-1, 0], [0, 1], [0,-1] ];
const enc = (r, c) => `${r},${c}`;
const dec = (s) => s.split(',').map(Number);
const manhattanTo = (goal) => {
    const [gr, gc] = dec(goal);
    return (s) => {
        const [r,c] = dec(s);
        return Math.abs(r-gr) + Math.abs(c-gc);
    };
};

const reseed = (seed) => {
    const m = 0x80000000, a = 1103515245, c = 12345;
    let x = (seed >>> 0) || 1;
    return () => { x = (a * x + c) % m; return x / m; };
};

const makeMaze = (rows, cols, rng) => {
    // DFS backtracker on odd grid (outer wall intact)
    const wall = Array.from({ length: rows }, () => Array(cols).fill(true));
    const inb = (r,c) => r > 0 && c > 0 && r < rows-1 && c < cols-1;

    const st = [[1,1]];
    wall[1][1] = false;
    const rndInt = (n) => Math.floor(rng()*n);
    while (st.length) {
        const [r,c] = st[st.length-1];
        const nbr = [];
        for (const [dr,dc] of DIRS) {
            const r2 = r + 2*dr, c2 = c + 2*dc;
            if (inb(r2,c2) && wall[r2][c2]) nbr.push([r2,c2, r+dr, c+dc]);
        }
        if (!nbr.length) { st.pop(); continue; }
        const [r2,c2, br, bc] = nbr[rndInt(nbr.length)];
        wall[r2][c2] = false; wall[br][bc] = false; st.push([r2,c2]);
    }

    const start = enc(1,1);
    const goal  = enc(rows-2, cols-2);
    const passable = (r,c) => !wall[r][c];
    const neighbors = (s) => {
        const [r,c] = dec(s);
        const out = [];
        for (const [dr,dc] of DIRS) {
            const r2 = r+dr, c2 = c+dc;
            if (r2>=1 && c2>=1 && r2<=rows-2 && c2<=cols-2 && passable(r2,c2))
                out.push({ state: enc(r2,c2), cost: 1 });
        }
        return out;
    };

    return { rows, cols, wall, start, goal, neighbors };
};

// ------------------------------------------------------------
// Demo factory
// ------------------------------------------------------------
export const createSearchMazeDemo = (sk, W = 980, H = 680) => {
    // Visual/logic state
    const state = {
        algoIdx: 0,
        heuristicZero: false,
        rngSeed: 1234,

        // snapshots + playback
        frames: [],
        playing: false,
        frameIdx: 0,
        stepMs: 30,
        speed: 1.0,
        lastMs: 0,
    };

    // Maze + problem
    let maze = null;
    let problem = null;

    // Graphics context & transforms
    let ctx = null;
    let COMPOSITE = null, COMPOSITE_NR = null;
    let worldToDevice = null, deviceTextAtWorld = null, pixelToWorld = null;

    // Palette
    const COL = {
        bgTop:   [10,12,18],
        bgBot:   [26,30,44],
        wall:    [220,230,245],
        closed:  [120,140,180],
        frontier:[100,180,255],
        current: [255,245,100],
        path:    [255,120,160],
        hud:     [255,255,255],
    };

    const regenerate = (ROWS = 31, COLS = 41) => {
        const rng = reseed(state.rngSeed);
        maze = makeMaze(ROWS, COLS, rng);

        // World window in cell coords (Y-up)
        const win  = { left: 0, right: COLS, bottom: 0, top: ROWS };
        const view = { left: 0, right: 1, bottom: 0, top: 1 };
        ctx = createGraphicsContext2(win, view, W, H, sk);

        const comps = buildComposites(W, H, ctx.viewport); // { COMPOSITE_NR, COMPOSITE, pixelToWorld }
        COMPOSITE    = comps.COMPOSITE;
        COMPOSITE_NR = comps.COMPOSITE_NR;
        pixelToWorld = comps.pixelToWorld;

        worldToDevice     = makeWorldToDevice(COMPOSITE);
        deviceTextAtWorld = createDeviceTextAtWorld(sk, worldToDevice);

        const h = state.heuristicZero ? (() => 0) : manhattanTo(maze.goal);
        state.frames.length = 0;
        problem = {
            initial: maze.start,
            goal: maze.goal,
            isGoal: (s) => s === maze.goal,
            neighbors: maze.neighbors,
            heuristic: h,
            timeStep: state.stepMs,
            cb: (snap) => state.frames.push({ ...snap }),
        };
    };

    const chooseAlgo = () => {
        const { make, name } = ALGOS[state.algoIdx];
        return { impl: make(), name };
    };

    const runSearch = () => {
        state.frames.length = 0;
        const { impl } = chooseAlgo();
        impl.search(problem);
        // Start playback
        state.playing = true;
        state.frameIdx = 0;
        state.lastMs = sk.millis ? sk.millis() : Date.now();
    };

    // ----------------------------------------------------------
    // Drawing
    // ----------------------------------------------------------
    const drawGradientBG = () => {
        sk.resetMatrix();
        const g = sk.createGraphics(W, H);
        for (let y = 0; y < H; y++) {
            const t = y / (H - 1);
            const r = COL.bgTop[0]*(1-t) + COL.bgBot[0]*t;
            const gC= COL.bgTop[1]*(1-t) + COL.bgBot[1]*t;
            const b = COL.bgTop[2]*(1-t) + COL.bgBot[2]*t;
            g.stroke(r, gC, b, 255);
            g.line(0, y, W, y);
        }
        sk.image(g, 0, 0);
    };

    const drawMaze = () => {
        applyWorld(sk, COMPOSITE);
        // walls as filled cells (faster than per-edge)
        sk.noStroke();
        sk.fill(...COL.wall, 220);
        for (let r = 0; r < maze.rows; r++) {
            for (let c = 0; c < maze.cols; c++) {
                if (maze.wall[r][c]) sk.rect(c, r, 1, 1);
            }
        }

        // Start / Goal halos
        const halo = (id, col) => {
            const [r,c] = dec(id);
            sk.noStroke();
            sk.fill(...col, 240); sk.rect(c+0.15, r+0.15, 0.7, 0.7, 0.15);
            sk.fill(...col, 120); sk.rect(c+0.05, r+0.05, 0.9, 0.9, 0.18);
        };
        halo(maze.start, COL.frontier);
        halo(maze.goal,  COL.path);
    };

    const drawSnapshots = (upto) => {
        applyWorld(sk, COMPOSITE);
        sk.noStroke();

        const closed   = new Set();
        const frontier = new Set();
        const parents  = new Map();
        let current = null;
        let solution = null;

        for (let i = 0; i < Math.min(upto, state.frames.length); i++) {
            const s = state.frames[i];
            if (s.type === 'discover' || s.type === 'relax' || s.type === 'enqueue') frontier.add(s.node);
            if (s.type === 'dequeue'  || s.type === 'expand') { current = s.node; frontier.delete(s.node); closed.add(s.node); }
            if (s.type === 'solution') solution = s.path;
            if (s.parent && s.node) parents.set(s.node, s.parent);
        }

        // closed
        sk.fill(...COL.closed, 130);
        for (const id of closed) {
            const [r,c] = dec(id);
            sk.rect(c, r, 1, 1);
        }

        // frontier
        sk.fill(...COL.frontier, 170);
        for (const id of frontier) {
            const [r,c] = dec(id);
            sk.rect(c+0.1, r+0.1, 0.8, 0.8, 0.12);
        }

        // current
        if (current) {
            const [r,c] = dec(current);
            sk.fill(...COL.current, 230);
            sk.rect(c+0.2, r+0.2, 0.6, 0.6, 0.1);
        }

        // solution path
        if (solution) {
            sk.noFill();
            sk.stroke(...COL.path, 230);
            sk.strokeWeight(pixelToWorld(3));
            for (let i = 1; i < solution.length; i++) {
                const [r1,c1] = dec(solution[i-1]);
                const [r2,c2] = dec(solution[i]);
                sk.line(c1+0.5, r1+0.5, c2+0.5, r2+0.5);
            }
        }
    };

    const drawHUD = () => {
        sk.resetMatrix();
        const pad = 16;
        const w = 380, h = 148;
        sk.noStroke();
        sk.fill(255,255,255,24); sk.rect(pad, pad, w, h, 16);
        sk.fill(0,0,0,60);       sk.rect(pad, pad, w, h, 16);

        const txt = (t, x, y) => { sk.fill(255); sk.textSize(16); sk.text(t, x, y); };

        const { name } = ALGOS[state.algoIdx];
        const frameDisp = `${Math.min(state.frameIdx, state.frames.length)} / ${state.frames.length}`;
        const last = state.frames[Math.min(state.frameIdx-1, state.frames.length-1)] || {};
        txt(`Algo: ${name}`, pad+14, pad+26);
        txt(`Frame: ${frameDisp}`, pad+14, pad+48);
        txt(`Frontier: ${last.frontierSize ?? 0}`, pad+14, pad+70);
        txt(`Heuristic: ${state.heuristicZero ? 'Zero' : 'Manhattan'}`, pad+14, pad+92);
        txt(`Playback: ${state.playing ? '▶︎' : '⏸'}  speed ${state.speed.toFixed(1)}×  [Space]/[/]`, pad+14, pad+114);
    };

    const onKey = (raw) => {
        const k = String(raw || '').length ? raw : String(sk.key || '');
        if (!k) return;

        // normalize to a single printable char where applicable
        const char = k.length === 1 ? k : k; // keep as-is for brackets/space
        if (char === 'r' || char === 'R') { regenerate(); return; }
        if (char === 's' || char === 'S') { runSearch(); return; }
        if (char === 'h' || char === 'H') { state.heuristicZero = !state.heuristicZero; regenerate(); return; }
        if (char === ' ') { state.playing = !state.playing; state.lastMs = sk.millis ? sk.millis() : Date.now(); return; }
        if (char === '[') { state.speed = Math.max(0.2, state.speed - 0.2); return; }
        if (char === ']') { state.speed = Math.min(5.0, state.speed + 0.2); return; }
        const i = ALGOS.findIndex(a => a.key === char);
        if (i >= 0) { state.algoIdx = i; runSearch(); }
    };

    // Ensure key events go to the canvas in instance mode
    const wireKeyboard = () => {
        // Make the canvas focusable and focused
        if (sk.canvas) {
            sk.canvas.tabIndex = 0;
            try { sk.canvas.style.outline = 'none'; } catch (_) {}
            try { sk.canvas.focus(); } catch (_) {}
        }
        // Capture both typed and pressed (for space/brackets on some layouts)
        sk.keyTyped = () => { onKey(sk.key); return false; };
        sk.keyPressed = () => { onKey(sk.key); return false; };
    };

    return {
        setup() {
            sk.createCanvas(W, H);
            wireKeyboard();
            regenerate();
            runSearch();
        },
        display() {
            // advance playback timeline
            if (state.playing && state.frames.length) {
                const now = sk.millis ? sk.millis() : Date.now();
                const dt = now - state.lastMs;
                const step = state.stepMs / Math.max(0.1, state.speed);
                if (dt >= step) {
                    const inc = Math.max(1, Math.floor(dt / step));
                    state.frameIdx = Math.min(state.frameIdx + inc, state.frames.length);
                    state.lastMs = now;
                    if (state.frameIdx >= state.frames.length) state.playing = false;
                }
            }

            drawGradientBG();
            drawMaze();
            drawSnapshots(state.frameIdx);
            drawHUD();
        },
    };
};

export default createSearchMazeDemo;
