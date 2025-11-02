// File: src/ai/csp/river-crossing-demo.js
// Farmer–Wolf–Goat–Cabbage — visualized canonical solution sequence.
// Note: This puzzle is sequential planning; we *visualize* the standard 7-trip solution.

import { createGraphicsContext2 } from '../../graphics_context2.js';
import {
    buildComposites, makeStrokePx, applyWorld,
    makeWorldToDevice, createDeviceTextAtWorld
} from '../../lib/esm/graphics.js';

const ENTITIES = ['Farmer','Wolf','Goat','Cabbage'];
const colorOf = {
    Farmer:  [240,240,240],
    Wolf:    [200,110,110],
    Goat:    [110,200,110],
    Cabbage: [110,170,230]
};

// Canonical safe sequence (L/R after each trip)
const SEQ = [
    ['Farmer','Goat'],     // F+G -> R
    ['Farmer'],            // F   -> L
    ['Farmer','Wolf'],     // F+W -> R
    ['Farmer','Goat'],     // F+G -> L
    ['Farmer','Cabbage'],  // F+C -> R
    ['Farmer'],            // F   -> L
    ['Farmer','Goat']      // F+G -> R (done)
];

const simulate = () => {
    const side = Object.fromEntries(ENTITIES.map(e=>[e,'L']));
    const frames = [];
    const snapshot = (label, boatSide, trip=[]) => frames.push({
        label, boatSide, trip: [...trip], side: { ...side }
    });

    snapshot('start','L');
    for (let i=0;i<SEQ.length;i++){
        const trip = SEQ[i];
        // board
        for (const e of trip) side[e] = (side[e]==='L' ? 'R':'L');
        const boatSide = side['Farmer'];
        snapshot(`trip ${i+1}`, boatSide, trip);
    }
    snapshot('done', side['Farmer']);
    return frames;
};

export const createRiverCrossingCSPDemo = (sk, W=900, H=520) => {
    // World window: river centered; banks at y=±2
    const win  = { left: -10, right: 10, bottom: -4, top: 4 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };
    const ctx = createGraphicsContext2(win, view, W, H, sk);
    const { COMPOSITE, pixelToWorld } = buildComposites(W,H,ctx.viewport);
    const strokePx = makeStrokePx(pixelToWorld);
    const worldToDevice = makeWorldToDevice(COMPOSITE);
    const drawTextAtWorld = createDeviceTextAtWorld(sk, worldToDevice);

    const frames = simulate();
    const state = { fi: 0, stepEvery: 30 };

    const bankY = (s)=> s==='L' ? 2.2 : -2.2;
    const posX  = { Farmer:-6, Wolf:-2, Goat:2, Cabbage:6 };

    const drawScene = (f)=>{
        applyWorld(sk, COMPOSITE);
        // River
        sk.push(); sk.noStroke();
        sk.fill(40,90,140); sk.rect(-10,-1.2,20,2.4);
        sk.fill(60,120,170); sk.rect(-10,-1.2,20,0.8);
        sk.pop();

        // Banks
        sk.push(); sk.noStroke();
        sk.fill(60, 130, 80); sk.rect(-10, 2.2-0.4, 20, 0.8);
        sk.rect(-10,-2.2-0.4, 20, 0.8);
        sk.pop();

        // Boat
        const by = f.boatSide==='L' ? 1.2 : -1.2;
        sk.push();
        sk.noStroke(); sk.fill(90, 60, 40);
        sk.rect(-1, by-0.2, 2, 0.4, pixelToWorld(6));
        sk.pop();

        // Entities
        for (const e of ENTITIES){
            const x = posX[e], y = bankY(f.side[e]);
            sk.push();
            sk.noStroke(); const c=colorOf[e]; sk.fill(c[0],c[1],c[2]);
            sk.ellipse(x, y, 0.9, 0.9);
            sk.pop();
            drawTextAtWorld(e, x, y, { px: 14, color:[0,0,0,160] });
            drawTextAtWorld(e, x, y, { px: 14, color:[255,255,255] });
        }

        // Trip highlight
        if (f.trip.length){
            const y = f.boatSide==='L' ? 1.6 : -1.6;
            drawTextAtWorld(`Boat: ${f.trip.join(' + ')}`, 0, y, { px: 16, color:[255,255,255] });
        }
    };

    const drawHUD = (f)=>{
        sk.resetMatrix(); sk.noStroke(); sk.fill(0,0,0,70);
        sk.rect(10,10,360,62,10);
        sk.fill(240); sk.textSize(16); sk.text('River Crossing (visualized)', 24, 30);
        sk.fill(200); sk.textSize(12);
        sk.text(`Step ${state.fi+1}/${frames.length} — ${f.label}`, 24, 48);
        sk.text(`(Note: sequence visualization; not solved by CSP)`, 210, 48);
    };

    return {
        setup(){ sk.createCanvas(W,H); },
        display(){
            sk.background(18);
            const f = frames[Math.min(state.fi, frames.length-1)];
            drawScene(f); drawHUD(f);
            if (sk.frameCount % state.stepEvery===0 && state.fi<frames.length-1) state.fi++;
        }
    };
};

export default createRiverCrossingCSPDemo;
