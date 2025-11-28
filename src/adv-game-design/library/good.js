// src/adv-game-design/library/scenegraph.js
// Functional scenegraph for this repo's p5 + M2D stack.
// Rules:
// - No classes. Plain-object factories with closures.
// - All p5 APIs must be accessed via the provided `sk`.
// - World is Y-up. Apply the COMPOSITE (REFLECT_Y · DEVICE · WORLD) once per frame.
// - Pixel-consistent stroke via M2D.makePixelToWorld.

import { createGraphicsContext2 } from "../../graphics_context2";
import { M2D } from "../../lib/esm/M2D";

// ------------------------------------------------------------
// Core node factory
// ------------------------------------------------------------
const createNode = (overrides = {}) => {
    const node = {
        // Spatial
        x: 0, y: 0, width: 0, height: 0,
        rotation: 0,           // radians; will be negated at draw time (Y-up)
        scaleX: 1, scaleY: 1,
        pivotX: 0.5, pivotY: 0.5,

        // Visual
        alpha: 1,
        visible: true,
        shadow: false,
        shadowColor: "rgba(0,0,0,0.35)", shadowOffsetX: 3, shadowOffsetY: 3, shadowBlur: 3,
        blendMode: null,       // e.g., sk.MULTIPLY; restored by push/pop

        // Graph
        parent: null,
        children: [],
        _layer: 0,

        // Methods (attached below)
        addChild: null,
        removeChild: null,
        add: null,
        remove: null,
        swapChildren: null,
    };

    Object.assign(node, overrides);

    node.addChild = (child) => {
        if (!child) return node;
        if (child.parent) child.parent.removeChild(child);
        child.parent = node;
        node.children.push(child);
        node.children.sort((a, b) => a._layer - b._layer);
        return node;
    };

    node.removeChild = (child) => {
        const i = node.children.indexOf(child);
        if (i >= 0) {
            node.children.splice(i, 1);
            child.parent = null;
        }
        return node;
    };

    node.add = (...children) => { children.forEach(node.addChild); return node; };
    node.remove = (...children) => { children.forEach(node.removeChild); return node; };

    node.swapChildren = (a, b) => {
        const ia = node.children.indexOf(a);
        const ib = node.children.indexOf(b);
        if (ia >= 0 && ib >= 0) [node.children[ia], node.children[ib]] = [node.children[ib], node.children[ia]];
        return node;
    };

    Object.defineProperties(node, {
        layer: {
            get: () => node._layer,
            set: (v) => { node._layer = v; if (node.parent) node.parent.children.sort((a,b)=>a._layer-b._layer); }
        },
        halfWidth:  { get: () => node.width / 2 },
        halfHeight: { get: () => node.height / 2 },
        centerX:    { get: () => node.x + node.width * 0.5 },
        centerY:    { get: () => node.y + node.height * 0.5 },
        gx:         { get: () => (node.parent ? node.x + node.parent.gx : node.x) },
        gy:         { get: () => (node.parent ? node.y + node.parent.gy : node.y) },
    });

    return node;
};

// ------------------------------------------------------------
// Leaf factories
// ------------------------------------------------------------
export const rectangle = (w = 32, h = 32, fill = 128, stroke = null, sw = 0) =>
    createNode({ _type: "rect", width: w, height: h, _style: { fill, stroke, sw } });

export const circle = (d = 32, fill = 128, stroke = null, sw = 0) =>
    createNode({ _type: "circle", width: d, height: d, _style: { fill, stroke, sw } });

export const line = (ax = 0, ay = 0, bx = 32, by = 32, stroke = 0, sw = 1, join = "round") =>
    createNode({ _type: "line", ax, ay, bx, by, _style: { stroke, sw, join } });

export const text = (content = "Hello!", fontSize = 12, fontName = "sans-serif", fill = 0) =>
    createNode({ _type: "text", content, fontSize, fontName, _style: { fill }, width: 0, height: 0 });

export const sprite = (img /* p5.Image */) => {
    const w = img ? img.width : 0;
    const h = img ? img.height : 0;
    return createNode({ _type: "sprite", img, width: w, height: h });
};

export const group = (...children) => {
    const g = createNode({ _type: "group" });
    g.add(...children);
    return g;
};

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
export const remove = (...nodes) => nodes.forEach(n => n && n.parent && n.parent.removeChild(n));
export const byLayer = (a, b) => (a.layer === b.layer ? 0 : a.layer < b.layer ? -1 : 1);

export const grid = (
    columns = 0, rows = 0, cellW = 32, cellH = 32,
    centerCell = false, xOffset = 0, yOffset = 0,
    make = () => rectangle(16, 16), afterEach
) => {
    const container = group();
    const length = columns * rows;
    for (let i = 0; i < length; i += 1) {
        const x = (i % columns) * cellW;
        const y = Math.floor(i / columns) * cellH;
        const s = make();
        container.addChild(s);
        if (!centerCell) {
            s.x = x + xOffset; s.y = y + yOffset;
        } else {
            s.x = x + (cellW / 2) - s.halfWidth + xOffset;
            s.y = y + (cellH / 2) - s.halfHeight + yOffset;
        }
        if (afterEach) afterEach(s);
    }
    let maxW = 0, maxH = 0;
    container.children.forEach(c => { maxW = Math.max(maxW, c.x + c.width); maxH = Math.max(maxH, c.y + c.height); });
    container.width = maxW; container.height = maxH;
    return container;
};

// ------------------------------------------------------------
// Renderer
// ------------------------------------------------------------
const createRenderer = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 480, worldWin = { left: -10, right: 10, bottom: -10, top: 10 }) => {
    const view = { left: 0, right: 1, bottom: 0, top: 1 };
    const ctx2 = createGraphicsContext2(worldWin, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx2.viewport;

    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const COMPOSITE = M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);

    const pixelToWorld = M2D.makePixelToWorld(COMPOSITE);

    const drawNode = (node, parentAlpha = 1) => {
        if (!node.visible) return;

        sk.push();

        // Local transform at node's pivoted origin
        sk.translate(node.x + node.width * node.pivotX, node.y + node.height * node.pivotY);
        // negate rotation for Y-up visual consistency
        sk.rotate(-node.rotation);
        sk.scale(node.scaleX, node.scaleY);

        // style state
        const dc = sk.drawingContext;
        dc.globalAlpha = node.alpha * parentAlpha;

        if (node.shadow) {
            dc.shadowColor = node.shadowColor;
            dc.shadowOffsetX = node.shadowOffsetX;
            dc.shadowOffsetY = node.shadowOffsetY;
            dc.shadowBlur = node.shadowBlur;
        } else {
            dc.shadowColor = "transparent";
            dc.shadowOffsetX = 0; dc.shadowOffsetY = 0; dc.shadowBlur = 0;
        }

        if (node.blendMode != null) sk.blendMode(node.blendMode);

        switch (node._type) {
            case "rect": {
                const { fill, stroke, sw } = node._style || {};
                if (fill != null) sk.fill(fill); else sk.noFill();
                if (stroke != null && (sw ?? 1) > 0) { sk.stroke(stroke); sk.strokeWeight(pixelToWorld(sw || 1)); } else { sk.noStroke(); }
                sk.rect(-node.width * node.pivotX, -node.height * node.pivotY, node.width, node.height);
                break;
            }
            case "circle": {
                const { fill, stroke, sw } = node._style || {};
                if (fill != null) sk.fill(fill); else sk.noFill();
                if (stroke != null && (sw ?? 1) > 0) { sk.stroke(stroke); sk.strokeWeight(pixelToWorld(sw || 1)); } else { sk.noStroke(); }
                const cx = -node.width * node.pivotX + node.width / 2;
                const cy = -node.height * node.pivotY + node.height / 2;
                sk.ellipse(cx, cy, node.width, node.height);
                break;
            }
            case "line": {
                const { stroke, sw, join } = node._style || {};
                sk.noFill();
                if (stroke != null) sk.stroke(stroke); else sk.noStroke();
                sk.strokeWeight(pixelToWorld(sw || 1));
                const prevJoin = dc.lineJoin; if (join) dc.lineJoin = join;
                sk.line(node.ax, node.ay, node.bx, node.by);
                dc.lineJoin = prevJoin;
                break;
            }
            case "text": {
                const { fill } = node._style || {};
                if (fill != null) sk.fill(fill); else sk.noFill();
                sk.noStroke();
                sk.textSize(node.fontSize);
                sk.textFont(node.fontName);
                sk.textAlign(sk.LEFT, sk.TOP);
                if (!node._measured) {
                    const w = sk.textWidth(node.content);
                    const h = node.fontSize;
                    node.width = Math.max(node.width, w);
                    node.height = Math.max(node.height, h);
                    node._measured = true;
                }
                sk.push();
                sk.scale(1, -1);
                sk.text(node.content, -node.width * node.pivotX, -node.height * node.pivotY);
                sk.pop();
                break;
            }
            case "sprite": {
                sk.push();
                sk.scale(1, -1);
                if (node.img) sk.image(node.img, -node.width * node.pivotX, -node.height * node.pivotY, node.width, node.height);
                sk.pop();
                break;

            }
            default: break; // groups only recurse
        }

        if (node.children && node.children.length) {
            node.children.sort(byLayer);
            // move origin to parent's top-left (relative to pivot) for children
            sk.translate(-node.width * node.pivotX, -node.height * node.pivotY);
            node.children.forEach(child => drawNode(child, node.alpha * parentAlpha));
        }

        sk.pop();
    };

    const render = (root) => {
        // Device-space pass can be done by caller; we only set world transform
        sk.resetMatrix();
        sk.applyMatrix(...M2D.toArgs(COMPOSITE));
        drawNode(root, 1);
    };

    return { render, pixelToWorld, COMPOSITE };
};

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export const createScenegraph = (
    sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 480,
    worldWin = { left: -10, right: 10, bottom: -10, top: 10 }
) => {
    const root = createNode({ _type: "group", alpha: 1 });
    const renderer = createRenderer(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);

    return {
        // root & renderer
        root,
        render: () => renderer.render(root),
        pixelToWorld: renderer.pixelToWorld,
        COMPOSITE: renderer.COMPOSITE,

        // node factories
        rectangle, circle, line, text, sprite, group,

        // utils
        remove, grid, byLayer,
    };
};

export default createScenegraph;
