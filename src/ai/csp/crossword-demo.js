// File: src/ai/csp/crossword-demo.js
// Crossword CSP Demo (mini 7x7) — slots + wordlist, Norvig-style CSP

import { createGraphicsContext2 } from '../../graphics_context2.js';
import {
    buildComposites, makeStrokePx, applyWorld,
    makeWorldToDevice, createDeviceTextAtWorld
} from '../../lib/esm/graphics.js';
import { createCSP } from './createCSP.js';

// ---------- Mini crossword spec -----------------------------------
// Grid legend: '#' = block, '.' = fillable.
const GRID = [
    '###.###',
    '#.....#',
    '.#.#.#.',
    '#.....#',
    '.#.#.#.',
    '#.....#',
    '###.###'
];

const WORDS = [
    // 5-letter
    'ALPHA','APPLE','GRAPE','LEMON','MANGO','BERRY','STONE','ROBOT','WATER',
    // 3-letter
    'SUN','SKY','SEA','CAR','BOT','ART','CAT','DOG','OAK'
];

// Extract slots (across & down), compute crossings
const extractSlots = (grid) => {
    const H = grid.length, W = grid[0].length;
    const slots = [];
    const at = (r,c)=>grid[r][c];

    // Across
    for (let r=0;r<H;r++){
        let c=0;
        while (c<W){
            while (c<W && at(r,c)==='#') c++;
            const start=c;
            while (c<W && at(r,c)!=='#') c++;
            const len=c-start;
            if (len>=3) slots.push({ id:`A${r}_${start}`, dir:'A', len, cells:Array.from({length:len},(_,i)=>[r,start+i]) });
        }
    }
    // Down
    for (let c=0;c<W;c++){
        let r=0;
        while (r<H){
            while (r<H && at(r,c)==='#') r++;
            const start=r;
            while (r<H && at(r,c)!=='#') r++;
            const len=r-start;
            if (len>=3) slots.push({ id:`D${start}_${c}`, dir:'D', len, cells:Array.from({length:len},(_,i)=>[start+i,c]) });
        }
    }

    return { slots, H, W };
};

const makeCrosswordProblem = (grid, words, cb=null, timeStep=10) => {
    const { slots, H, W } = extractSlots(grid);

    const variables = slots.map(s=>s.id);
    const byLen = words.reduce((m,w)=>(m[w.length]=[...(m[w.length]||[]), w], m), {});
    const domains = Object.fromEntries(variables.map(id=>{
        const len = slots.find(s=>s.id===id).len;
        return [id, (byLen[len]||[]).slice()];
    }));

    // Neighbors by crossing
    const posKey = (r,c)=>`${r},${c}`;
    const placed = new Map(); // pos -> [slotId, indexInSlot]*
    for (const s of slots){
        s.cells.forEach(([r,c],i)=>{
            const k=posKey(r,c);
            const arr = placed.get(k) || [];
            arr.push([s.id,i]);
            placed.set(k, arr);
        });
    }
    const neighbors = Object.fromEntries(variables.map(id=>[id,[]]));
    for (const arr of placed.values()){
        if (arr.length<2) continue;
        for (let i=0;i<arr.length;i++){
            for (let j=i+1;j<arr.length;j++){
                const [A, ai]=arr[i], [B, bi]=arr[j];
                neighbors[A].push(B); neighbors[B].push(A);
            }
        }
    }
    // dedupe neighbors
    for (const k in neighbors){
        neighbors[k] = [...new Set(neighbors[k])];
    }

    // Constraints: crossing letters must match; also enforce all-different per slot set (no word reuse)
    const letterAt = (word, idx)=>word[idx];
    const indexIn = {}; // slotId -> pos index map for each crossing
    // Build quick lookup of indexes at crossing per neighbor pair
    for (const arr of placed.values()){
        if (arr.length<2) continue;
        for (let i=0;i<arr.length;i++){
            for (let j=i+1;j<arr.length;j++){
                const [A, ai]=arr[i], [B, bi]=arr[j];
                indexIn[`${A}|${B}`]=[ai,bi];
                indexIn[`${B}|${A}`]=[bi,ai];
            }
        }
    }

    const usedWord = new Map(); // only used in visualization path; solver itself is binary
    const constraints = (A, a, B, b) => {
        if (a === b) return false; // all-different (no reuse)
        const idx = indexIn[`${A}|${B}`];
        if (!idx) return true;     // not actually crossing
        const [iA, iB] = idx;
        return letterAt(a, iA) === letterAt(b, iB);
    };

    return { variables, domains, neighbors, constraints, cb, timeStep, grid, slots, H, W };
};

// ------------ Demo -------------------------------------------------
export const createCrosswordCSPDemo = (sk, W = 820, H = 680) => {
    const PAD=0.6;
    const { slots, H:GH, W:GW } = extractSlots(GRID);
    const win = { left: -GW/2 - PAD, right: GW/2 + PAD, bottom: -GH/2 - PAD, top: GH/2 + PAD };
    const view= { left:0,right:1,bottom:0,top:1 };
    const ctx = createGraphicsContext2(win, view, W, H, sk);
    const { COMPOSITE, pixelToWorld } = buildComposites(W,H,ctx.viewport);
    const strokePx = makeStrokePx(pixelToWorld);
    const worldToDevice = makeWorldToDevice(COMPOSITE);
    const drawTextAtWorld = createDeviceTextAtWorld(sk, worldToDevice);

    const state = { frames:[], fi:0, stepEvery:10, slots };

    const frameOf = (label,A,D)=>({label, A:{...A}, D:(()=>{const o={}; for(const k in D) o[k]=[...D[k]]; return o;})()});

    const runOnce = ()=>{
        if (state.frames.length) return;
        const onStep=(A,D)=>state.frames.push(frameOf('search',A,D));
        const prob = makeCrosswordProblem(GRID, WORDS, onStep, state.stepEvery);
        state.frames.push(frameOf('initial',{},prob.domains));
        const { solve } = createCSP();
        const sol = solve(prob);
        state.frames.push(frameOf(sol?'solution':'failure', sol||{}, {}));
    };

    const drawGrid = ()=>{
        applyWorld(sk, COMPOSITE);
        const h=GRID.length, w=GRID[0].length;
        // base
        sk.push(); sk.noStroke(); sk.fill(34,36,44);
        sk.rect(-w/2, -h/2, w, h, pixelToWorld(8)); sk.pop();

        // cells
        for (let r=0;r<h;r++){
            for (let c=0;c<w;c++){
                const x = -w/2 + c + 0.5, y = -h/2 + r + 0.5;
                if (GRID[r][c] === '#'){
                    sk.push(); sk.noStroke(); sk.fill(20,22,28);
                    sk.rect(x-0.5,y-0.5,1,1); sk.pop();
                } else {
                    sk.push(); sk.noStroke(); sk.fill(((r+c)%2===0)? 48: 56);
                    sk.rect(x-0.5,y-0.5,1,1); sk.pop();
                }
            }
        }

        // slot ids (subtle)
        for (const s of state.slots){
            const [r0,c0] = s.cells[0];
            const cx = -GRID[0].length/2 + c0 + 0.2;
            const cy = -GRID.length/2 + r0 + 0.2;
            drawTextAtWorld(s.id, cx, cy, { px: 10, color:[0,0,0,140], h:'LEFT', v:'TOP' });
            drawTextAtWorld(s.id, cx, cy, { px: 10, color:[255,255,255,200], h:'LEFT', v:'TOP' });
        }
    };

    const drawWords = (frame)=>{
        for (const s of state.slots){
            const word = frame.A[s.id];
            if (!word) continue;
            for (let i=0;i<s.len;i++){
                const [r,c] = s.cells[i];
                const x = -GRID[0].length/2 + c + 0.5;
                const y = -GRID.length/2 + r + 0.5;
                drawTextAtWorld(word[i], x, y, { px: 20, color: [255,255,255] });
            }
        }
    };

    const drawHUD = (frame)=>{
        sk.resetMatrix();
        sk.noStroke(); sk.fill(0,0,0,70); sk.rect(10,10,360,62,10);
        sk.fill(240); sk.textSize(16); sk.text('Crossword (mini)', 24, 30);
        sk.fill(200); sk.textSize(12);
        sk.text('AC-3 + MRV + LCV', 24, 48);
        sk.text(`Step ${state.fi+1}/${state.frames.length} — ${frame.label}`, 200, 48);
    };

    return {
        setup(){ sk.createCanvas(W,H); runOnce(); },
        display(){
            sk.background(20);
            const i = Math.min(state.fi, state.frames.length-1);
            const f = state.frames[i];
            drawGrid(); drawWords(f); drawHUD(f);
            if (sk.frameCount % state.stepEvery===0 && state.fi<state.frames.length-1) state.fi++;
        }
    };
};

export default createCrosswordCSPDemo;
