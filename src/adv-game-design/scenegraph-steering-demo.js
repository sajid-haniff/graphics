// src/adv-game-design/scenegraph-steering-demo.js
// Craig Reynolds–style path-follow demo rewritten to rely ONLY on demo-side logic.
// - Uses `assets.load([...], sk)` and *defers sprite creation until assets are ready*.
// - No changes required to the scenegraph renderer.
// - Agents follow a closed polyline path and face their velocity (Y-up world).

import { createScenegraph } from "./library/scenegraph";
import { V } from "../lib/esm/V";
import { assets } from "./library/utilities";

export const createScenegraphSteeringDemo = (sk, CANVAS_WIDTH = 900, CANVAS_HEIGHT = 600) => {
    // World window
    const win = { left: -16, right: 16, bottom: -10, top: 10 };
    const sg = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);

    // ---------------------------------------------------------------------------
    // Path (closed polyline)
    const path = (() => {
        const pts = [
            V.create(-12, -4), V.create(-6, -7), V.create(0, -4), V.create(6, -7), V.create(12, -4),
            V.create(10,  0), V.create(6,  4), V.create(0,  7), V.create(-6, 4), V.create(-10, 0)
        ];
        pts.push(V.clone(pts[0])); // close loop
        const segs = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const d = V.sub(b, a);
            const len = V.length(d);
            const tan = len > 0 ? V.scale(d, 1/len) : V.create(1, 0);
            segs.push({ a, b, d, len, tan });
        }
        return { pts, segs };
    })();

    // ---------------------------------------------------------------------------
    // Steering helpers (Reynolds path-follow)
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    const limitVec = (v, max) => {
        const m2 = V.lengthSq(v);
        if (m2 > max*max) { const m = Math.sqrt(m2); return V.scale(v, max/m); }
        return v;
    };

    const closestOnPath = (p) => {
        let best = { d2: Infinity, proj: V.create(0,0), segIdx: 0, t: 0 };
        for (let i = 0; i < path.segs.length; i++) {
            const s = path.segs[i];
            const ap = V.sub(p, s.a);
            const t = clamp(V.dot(ap, s.d) / (s.len*s.len || 1), 0, 1);
            const proj = V.add(s.a, V.scale(s.d, t));
            const d2 = V.lengthSq(V.sub(p, proj));
            if (d2 < best.d2) best = { d2, proj, segIdx: i, t };
        }
        return best;
    };

    const makePathFollower = (maxSpeed, maxForce, lookAhead, pathRadius, pathAhead) => (pos, vel) => {
        const vlen = Math.max(1e-6, V.length(vel));
        const future = V.add(pos, V.scale(vel, lookAhead / vlen));
        const hit = closestOnPath(future);
        const seg = path.segs[hit.segIdx];
        const target = V.add(hit.proj, V.scale(seg.tan, pathAhead));
        const distFromPath = Math.sqrt(hit.d2);
        if (distFromPath > pathRadius) {
            const desired = V.sub(target, pos);
            const len = Math.max(1e-6, V.length(desired));
            const steer = V.sub(V.scale(desired, maxSpeed/len), vel);
            return limitVec(steer, maxForce);
        }
        return V.create(0, 0);
    };

    // ---------------------------------------------------------------------------
    // Scene: draw the path (behind agents)
    const pathLayer = sg.group();
    path.segs.forEach(s => pathLayer.add(sg.line(s.a[0], s.a[1], s.b[0], s.b[1], sk.color(170), 1)));
    path.pts.forEach(p => { const d = sg.circle(0.22, sk.color(235), sk.color(60), 1); d.alpha=0.6; d.x=p[0]-d.width*0.5; d.y=p[1]-d.height*0.5; pathLayer.add(d); });
    pathLayer.layer = -1; sg.root.add(pathLayer);

    // ---------------------------------------------------------------------------
    // Agents — created ONLY after assets load (no null sprites)
    const AGENT_SIZE = 1.8;
    const AGENT_CFG = { maxSpeed: 6.0, maxForce: 20.0/60, lookAhead: 1.5, radius: 1.2, ahead: 1.0 };

    const makeAgent = (img, startPos) => {
        const node = sg.sprite(img);          // image guaranteed here
        node.width = AGENT_SIZE; node.height = AGENT_SIZE;
        node.x = startPos[0]; node.y = startPos[1];
        node.shadow = true; node.alpha = 0.97;

        let pos = V.create(node.x, node.y);
        let vel = V.create(2.0, 0.0);         // non-zero start
        const follow = makePathFollower(AGENT_CFG.maxSpeed, AGENT_CFG.maxForce, AGENT_CFG.lookAhead, AGENT_CFG.radius, AGENT_CFG.ahead);

        const update = (dt) => {
            const aPath = follow(pos, vel);
            const jitter = V.scale(V.random(0.12), 0.15);
            const acc = V.add(aPath, jitter);
            vel = limitVec(V.add(vel, V.scale(acc, dt)), AGENT_CFG.maxSpeed);
            pos = V.add(pos, V.scale(vel, dt));

            // wrap
            if (pos[0] < win.left)  pos[0] = win.right;
            if (pos[0] > win.right) pos[0] = win.left;
            if (pos[1] < win.bottom) pos[1] = win.top;
            if (pos[1] > win.top)    pos[1] = win.bottom;

            node.x = pos[0]; node.y = pos[1];
            if (V.lengthSq(vel) > 1e-8) node.rotation = Math.atan2(vel[0], vel[1]); // Y-up angle rule
        };

        return { node, update };
    };

    let agents = [];            // filled after assets resolve
    let assetsReady = false;    // gate rendering of agents

    // ---------------------------------------------------------------------------
    // Loop timing
    let tPrev = 0;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(12);

            // Load everything via your assets loader; then build agents
            assets.load([
                "images/cat.png",
                "images/tiger.png",
                "images/hedgehog.png"
            ], sk).then(() => {
                const catImg = assets["images/cat.png"];
                const tigerImg = assets["images/tiger.png"];
                const hogImg = assets["images/hedgehog.png"];

                agents = [
                    makeAgent(catImg,   [-12, -4]),
                    makeAgent(tigerImg, [  0,  7]),
                    makeAgent(hogImg,   [ 12, -4])
                ];
                sg.root.add(agents[0].node, agents[1].node, agents[2].node);
                assetsReady = true;
            });
        },
        display() {
            const tNow = sk.millis() / 1000;
            const dt = Math.min((tNow - tPrev) || 1/60, 0.05);
            tPrev = tNow;

            // Update only when assets/sprites exist
            if (assetsReady) agents.forEach(a => a.update(dt));

            sk.background(12);
            sg.render();

            // HUD (device space)
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(13);
            sk.text(assetsReady ? "Steering: Path-follow (assets loaded)" : "Loading assets...", 10, 22);
        }
    };
};

export default createScenegraphSteeringDemo;