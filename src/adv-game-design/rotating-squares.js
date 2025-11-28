// src/adv-game-design/scenegraph-rotating-squares-demo.js
// Visually self-checking demo: big square spins CCW; each corner square spins
// in its own direction. A debug overlay computes the *expected* vertex
// world-positions using pure math and draws targets there to verify correctness.

import { createScenegraph } from "./library/scenegraph";
import { M2D } from "../lib/esm/M2D"; // used only for completeness if you want matrix ops later

export const createRotatingSquaresDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 600) => {
    const win = { left: -10, right: 10, bottom: -7.5, top: 7.5 };
    const sg  = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);
    const px  = sg.pixelToWorld;

    // ---- Build scene -------------------------------------------------
    const BIG = 6;
    const big = sg.rectangle(BIG, BIG, sk.color(40), sk.color(255), 2);
    big.x = -BIG / 2; big.y = -BIG / 2; big.layer = 1; big.shadow = true;

    const mkCorner = (size, fill, stroke) => {
        const s = sg.rectangle(size, size, fill, stroke, px(2));
        s.pivotX = 0.5; s.pivotY = 0.5; s.layer = 2;
        return s;
    };

    const SMALL = 1.4;
    const tl = mkCorner(SMALL, sk.color(0,180,255),   sk.color(255));
    const tr = mkCorner(SMALL, sk.color(255,140,0),   sk.color(255));
    const bl = mkCorner(SMALL, sk.color(60,220,120),  sk.color(255));
    const br = mkCorner(SMALL, sk.color(240,60,120),  sk.color(255));

    // Place each child so its CENTER is at the big’s vertex, in big’s local TL space.
    const centerAt = (child, vx, vy) => {
        child.x = vx - child.width * 0.5;
        child.y = vy - child.height * 0.5;
    };
    centerAt(tl, 0,        BIG);
    centerAt(tr, BIG,      BIG);
    centerAt(bl, 0,        0);
    centerAt(br, BIG,      0);

    big.add(tl, tr, bl, br);

    const axes = sg.group(
        sg.line(-9, 0, 9, 0, sk.color(100), 1),
        sg.line(0, -6.5, 0, 6.5, sk.color(100), 1)
    );
    axes.layer = 0;

    sg.root.add(axes, big);

    // ---- Debug overlay (computed targets) ----------------------------
    // Independent math: world-space center of big
    const bigCenter = () => ({ x: big.x + BIG * 0.5, y: big.y + BIG * 0.5 });

    // Renderer rotates visually by -node.rotation (Y-up rule).
    // So a local offset `o` gets rotated by R(-a). We use that to compute
    // the *expected* world-space positions of the four vertices.
    const rot2D = (x, y, a) => {
        const ca = sk.cos(a), sa = sk.sin(a);
        return { x: x * ca - y * sa, y: x * sa + y * ca };
    };

    const vertexOffsets = {
        tl: { x: -BIG * 0.5, y:  BIG * 0.5 },
        tr: { x:  BIG * 0.5, y:  BIG * 0.5 },
        bl: { x: -BIG * 0.5, y: -BIG * 0.5 },
        br: { x:  BIG * 0.5, y: -BIG * 0.5 },
    };

    // Tiny world-space “targets” at expected vertices
    const mkTarget = () => {
        const d = Math.max(px(6), 0.02); // ~6px ring
        const ring = sg.circle(d, null, sk.color(255, 230), 2);
        ring.pivotX = 0.5; ring.pivotY = 0.5;
        ring.layer = 3;
        return ring;
    };

    const tgtTL = mkTarget();
    const tgtTR = mkTarget();
    const tgtBL = mkTarget();
    const tgtBR = mkTarget();

    sg.root.add(tgtTL, tgtTR, tgtBL, tgtBR);

    const DEBUG = true;

    // ---- Animation ---------------------------------------------------
    const ωBig =  0.012; // CCW visually
    const ωTL  = -0.05;  // CW
    const ωTR  =  0.08;  // CCW
    const ωBL  =  0.06;  // CCW
    const ωBR  = -0.09;  // CW

    const updateTargets = () => {
        const a  = big.rotation;
        const c  = bigCenter();

        const place = (tgt, off) => {
            const r = rot2D(off.x, off.y, -a); // expected visual rotation
            tgt.x = (c.x + r.x) - (tgt.width  * 0.5);
            tgt.y = (c.y + r.y) - (tgt.height * 0.5);
        };

        place(tgtTL, vertexOffsets.tl);
        place(tgtTR, vertexOffsets.tr);
        place(tgtBL, vertexOffsets.bl);
        place(tgtBR, vertexOffsets.br);
    };

    // Optional: world-space lines from center to corner squares for extra clarity
    const guideStyle = { stroke: sk.color(255, 120), sw: 1, join: "round" };
    const gTL = sg.line(0,0,0,0, guideStyle.stroke, guideStyle.sw, guideStyle.join);
    const gTR = sg.line(0,0,0,0, guideStyle.stroke, guideStyle.sw, guideStyle.join);
    const gBL = sg.line(0,0,0,0, guideStyle.stroke, guideStyle.sw, guideStyle.join);
    const gBR = sg.line(0,0,0,0, guideStyle.stroke, guideStyle.sw, guideStyle.join);
    [gTL,gTR,gBL,gBR].forEach(g => { g.layer = 1; });
    sg.root.add(gTL, gTR, gBL, gBR);

    const updateGuides = () => {
        const c = bigCenter();
        const centerTo = (node) => ({
            ax: c.x, ay: c.y,
            bx: node.x + node.width*0.5,
            by: node.y + node.height*0.5
        });
        Object.assign(gTL, centerTo(tl));
        Object.assign(gTR, centerTo(tr));
        Object.assign(gBL, centerTo(bl));
        Object.assign(gBR, centerTo(br));
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(12);
            sk.noStroke();
        },
        display() {
            big.rotation += ωBig;
            tl.rotation  += ωTL;
            tr.rotation  += ωTR;
            bl.rotation  += ωBL;
            br.rotation  += ωBR;

            if (DEBUG) {
                updateTargets();
                updateGuides();
            }

            sk.background(12);
            sg.render();

            // Device-space HUD
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(14);
            sk.text("Rotating squares — debug overlay ON (targets = expected vertices)", 10, 20);
            sk.text("If each small square’s *center* sits on a target ring while spinning, the scenegraph math is correct.", 10, 40);
        }
    };
};

export default createRotatingSquaresDemo;
