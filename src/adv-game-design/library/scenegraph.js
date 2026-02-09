// src/adv-game-design/library/scenegraph.js
// Functional scenegraph (no classes) for this repo's p5 + M2D stack.
// Stable renderer inspired by the original "display" module, plus:
//  - filmstrip(image, w, h[, spacing]) utility
//  - sprite(...) supports:
//      * single Image (DOM or p5.Image)
//      * array of Images
//      * TexturePacker-style atlas frame: { frame:{x,y,w,h,...}, source:image }
//      * array of atlas frames
//      * tileset rect: { image, x, y, width, height }
//      * filmstrip sheet: { image, data:[[sx,sy],...], width, height }
//  - tilingSprite(width, height, source, x, y) with local clipping
//
// Rules:
// - p5 APIs must be accessed via the provided `sk`.
// - World is Y-up (Cartesian coordinates). 
//   In standard screen space (p5/HTML5 Canvas), Y increases downwards.
//   This library maps the world so that Y increases upwards, matching standard 2D physics
//   and mathematical conventions.
// - This is achieved via a COMPOSITE transform (REFLECT_Y · DEVICE · WORLD) 
//   applied at the root of the render tree.
// - As a result, rotation is clockwise for positive values in this Y-up space,
//   so we negate `node.rotation` at draw time to maintain standard CCW behavior.
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
        rotation: 0,           // radians; negated at draw time (Y-up)
        scaleX: 1, scaleY: 1,
        pivotX: 0.5, pivotY: 0.5,

        // Visual
        alpha: 1,
        visible: true,
        shadow: false,
        shadowColor: "rgba(0,0,0,0.35)",
        shadowOffsetX: 3, shadowOffsetY: 3, shadowBlur: 3,
        blendMode: null,       // e.g., sk.MULTIPLY; restored by push/pop

        // Graph
        parent: null,
        children: [],
        _layer: 0,

        // Methods
        addChild: null,
        removeChild: null,
        add: null,
        remove: null,
        swapChildren: null,

        // Optional node kind marker (used by renderer)
        _type: undefined
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
        if (ia >= 0 && ib >= 0) {
            [node.children[ia], node.children[ib]] = [node.children[ib], node.children[ia]];
        }
        return node;
    };

    Object.defineProperties(node, {
        layer: {
            get: () => node._layer,
            set: (v) => {
                node._layer = v;
                if (node.parent) {
                    node.parent.children.sort((a, b) => a._layer - b._layer);
                }
            }
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

// ------------------------------------------------------------
// Sprite factory
// Mirrors the old display sprite source shapes but in node form.
// ------------------------------------------------------------
const isAtlasFrame = (src) => !!(src && src.frame && src.source);
const isFilmstripObject = (src) =>
    !!(src && src.image && src.data && src.width && src.height);
const isTilesetRect = (src) =>
    !!(src && src.image &&
        src.x !== undefined && src.y !== undefined &&
        src.width !== undefined && src.height !== undefined);

// Enhanced sprite: Image | Image[] | filmstrip | atlas frame(s) | tileset rect
export const sprite = (source) => {
    const node = createNode({ _type: "sprite" });

    // Internal frame state (matches "display" semantics, but without timers)
    node._frames = null; // Array<Image> OR Array<[sx,sy]> OR Array<atlasFrame>
    node._img    = null; // underlying image (DOM Image or p5.Graphics)
    node._sx = 0; node._sy = 0;
    node._sw = 0; node._sh = 0;

    const initFromImage = (img) => {
        node._img = img || null;
        const w = img ? img.width  : 0;
        const h = img ? img.height : 0;
        node._sx = 0; node._sy = 0; node._sw = w; node._sh = h;
        node.width = w; node.height = h;
    };

    // Array<Image>
    const initFromImageArray = (frames) => {
        node._frames = frames.slice();
        initFromImage(frames[0]);
    };

    // { frame: {x,y,w,h}, source: Image }
    const initFromAtlasFrame = (frameObj) => {
        const img   = frameObj.source;
        const frame = frameObj.frame || { x: 0, y: 0, w: 0, h: 0 };
        node._img = img || null;
        node._sx  = frame.x || 0;
        node._sy  = frame.y || 0;
        node._sw  = frame.w || 0;
        node._sh  = frame.h || 0;
        node.width  = node._sw;
        node.height = node._sh;
    };

    // Array<{ frame, source }>
    const initFromAtlasFrameArray = (frames) => {
        node._frames = frames.slice();
        initFromAtlasFrame(frames[0]);
    };

    // { image, x, y, width, height }
    const initFromTilesetRect = (ts) => {
        node._img = ts.image || null;
        node._sx  = ts.x || 0;
        node._sy  = ts.y || 0;
        node._sw  = ts.width  || 0;
        node._sh  = ts.height || 0;
        node.width  = node._sw;
        node.height = node._sh;
    };

    // { image, data: [[x,y],...], width, height }
    const initFromFilmstrip = (fs) => {
        node._img    = fs.image;
        node._frames = fs.data.slice(); // [ [sx,sy], ... ]
        node._sw     = fs.width;
        node._sh     = fs.height;
        node.width   = fs.width;
        node.height  = fs.height;
        const [sx, sy] = node._frames[0];
        node._sx = sx; node._sy = sy;
    };

    // --- Detect source shape (order matters) -------------------
    if (!source) {
        initFromImage(null);

    } else if (Array.isArray(source)) {
        const first = source[0];
        if (!first) {
            initFromImage(null);
        } else if (isAtlasFrame(first)) {
            initFromAtlasFrameArray(source);
        } else if (first && first.width !== undefined) {
            initFromImageArray(source);
        } else {
            initFromImage(null);
        }

    } else if (isAtlasFrame(source)) {
        initFromAtlasFrame(source);

    } else if (isFilmstripObject(source)) {
        initFromFilmstrip(source);

    } else if (isTilesetRect(source)) {
        initFromTilesetRect(source);

    } else if (source.width !== undefined) { // Image (DOM or p5.Image)
        initFromImage(source);

    } else {
        initFromImage(null);
    }

    // Frame control: similar to display's gotoAndStop, but time is driven by caller.
    node.gotoAndStop = (i) => {
        if (!node._frames || !node._frames.length) return;

        const len   = node._frames.length;
        const index = ((i % len) + len) % len;
        const first = node._frames[0];

        if (Array.isArray(first)) {
            // filmstrip frames: [sx, sy]
            const [sx, sy] = node._frames[index];
            node._sx = sx; node._sy = sy;

        } else if (isAtlasFrame(first)) {
            // array of atlas frames
            initFromAtlasFrame(node._frames[index]);

        } else {
            // array of images
            initFromImage(node._frames[index]);
        }
    };

    // Optional convenience alias (closer to old display API)
    node.show = (i) => node.gotoAndStop(i);

    return node;
};

// ------------------------------------------------------------
// Groups
// ------------------------------------------------------------
export const group = (...children) => {
    const g = createNode({ _type: "group" });
    g.add(...children);
    return g;
};

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
export const remove = (...nodes) =>
    nodes.forEach((n) => n && n.parent && n.parent.removeChild(n));

export const byLayer = (a, b) =>
    (a.layer === b.layer ? 0 : a.layer < b.layer ? -1 : 1);

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
            s.x = x + xOffset;
            s.y = y + yOffset;
        } else {
            s.x = x + (cellW / 2) - s.halfWidth  + xOffset;
            s.y = y + (cellH / 2) - s.halfHeight + yOffset;
        }
        if (afterEach) afterEach(s);
    }

    let maxW = 0, maxH = 0;
    container.children.forEach((c) => {
        maxW = Math.max(maxW, c.x + c.width);
        maxH = Math.max(maxH, c.y + c.height);
    });
    container.width = maxW;
    container.height = maxH;

    return container;
};

// Filmstrip helper that returns a sheet description compatible with sprite(...)
export const filmstrip = (image, frameW, frameH, spacing = 0) => {
    const positions = [];
    const columns = Math.floor(image.width  / frameW);
    const rows    = Math.floor(image.height / frameH);
    const n = columns * rows;

    for (let i = 0; i < n; i += 1) {
        let x = (i % columns) * frameW;
        let y = Math.floor(i / columns) * frameH;
        if (spacing > 0) {
            x += spacing + (spacing * (i % columns));
            y += spacing + (spacing * Math.floor(i / columns));
        }
        positions.push([x, y]);
    }
    return { image, data: positions, width: frameW, height: frameH };
};

// Tiling sprite with local clipping (similar intent to display's tilingSprite)
export const tilingSprite = (width, height, source, x = 0, y = 0) => {
    const tileW = (source && source.width)  ||
        (source && source.image && source.width)  || 0;
    const tileH = (source && source.height) ||
        (source && source.image && source.height) || 0;

    const cols = width  >= tileW ? Math.round(width  / tileW) + 1 : 2;
    const rows = height >= tileH ? Math.round(height / tileH) + 1 : 2;

    const container = group();
    container._type = "tilingContainer"; // renderer will clip
    container.x = x; container.y = y;
    container.width = width; container.height = height;

    const tiles = [];
    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            const s = sprite(source);
            s.x = c * tileW;
            s.y = r * tileH;
            container.addChild(s);
            tiles.push(s);
        }
    }

    let _tileX = 0, _tileY = 0;
    Object.defineProperties(container, {
        tileX: {
            get() { return _tileX; },
            set(value) {
                const diff = value - _tileX;
                tiles.forEach((t) => {
                    t.x += diff;
                    if (t.x > (cols - 1) * tileW) t.x = 0 - tileW + diff;
                    if (t.x < 0 - tileW - diff)   t.x = (cols - 1) * tileW;
                });
                _tileX = value;
            }
        },
        tileY: {
            get() { return _tileY; },
            set(value) {
                const diff = value - _tileY;
                tiles.forEach((t) => {
                    t.y += diff;
                    if (t.y > (rows - 1) * tileH) t.y = 0 - tileH + diff;
                    if (t.y < 0 - tileH - diff)   t.y = (rows - 1) * tileH;
                });
                _tileY = value;
            }
        }
    });

    return container;
};

// ------------------------------------------------------------
// Renderer
// ------------------------------------------------------------
const createRenderer = (
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 480,
    worldWin = { left: -10, right: 10, bottom: -10, top: 10 }
) => {
    const view = { left: 0, right: 1, bottom: 0, top: 1 };
    const ctx2 = createGraphicsContext2(worldWin, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx2.viewport;

    // The COMPOSITE matrix maps world-space units to screen pixels while flipping the Y-axis.
    // 1. WORLD: Maps world coordinates to a [0, 1] normalized view volume.
    // 2. DEVICE: Scales the normalized view to the CANVAS_WIDTH and CANVAS_HEIGHT.
    // 3. REFLECT_Y: Flips the Y-axis so that Y=0 is at the bottom and Y=CANVAS_HEIGHT is at the top.
    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const COMPOSITE = M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);

    const pixelToWorld = M2D.makePixelToWorld(COMPOSITE);

    const drawNode = (node, parentAlpha = 1) => {
        if (!node.visible) return;

        sk.push();

        // Local transform at node's pivoted origin
        sk.translate(
            node.x + node.width * node.pivotX,
            node.y + node.height * node.pivotY
        );
        sk.rotate(-node.rotation); // negate for Y-up
        sk.scale(node.scaleX, node.scaleY);

        const dc = sk.drawingContext;
        dc.globalAlpha = node.alpha * parentAlpha;

        if (node.shadow) {
            dc.shadowColor = node.shadowColor;
            dc.shadowOffsetX = node.shadowOffsetX;
            dc.shadowOffsetY = node.shadowOffsetY;
            dc.shadowBlur = node.shadowBlur;
        } else {
            dc.shadowColor = "transparent";
            dc.shadowOffsetX = 0;
            dc.shadowOffsetY = 0;
            dc.shadowBlur = 0;
        }

        if (node.blendMode != null) sk.blendMode(node.blendMode);

        // Special: tiling container with clip
        if (node._type === "tilingContainer") {
            dc.save();
            dc.beginPath();
            dc.rect(
                -node.width * node.pivotX,
                -node.height * node.pivotY,
                node.width,
                node.height
            );
            dc.clip();
            sk.translate(-node.width * node.pivotX, -node.height * node.pivotY);
            node.children.sort(byLayer);
            node.children.forEach((child) => drawNode(child, node.alpha * parentAlpha));
            dc.restore();
            sk.pop();
            return;
        }

        switch (node._type) {
            case "rect": {
                const { fill, stroke, sw } = node._style || {};
                if (fill != null) sk.fill(fill); else sk.noFill();
                if (stroke != null && (sw ?? 1) > 0) {
                    sk.stroke(stroke);
                    sk.strokeWeight(pixelToWorld(sw || 1));
                } else {
                    sk.noStroke();
                }
                sk.rect(
                    -node.width * node.pivotX,
                    -node.height * node.pivotY,
                    node.width,
                    node.height
                );
                break;
            }

            case "circle": {
                const { fill, stroke, sw } = node._style || {};
                if (fill != null) sk.fill(fill); else sk.noFill();
                if (stroke != null && (sw ?? 1) > 0) {
                    sk.stroke(stroke);
                    sk.strokeWeight(pixelToWorld(sw || 1));
                } else {
                    sk.noStroke();
                }
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

                const prevJoin = dc.lineJoin;
                if (join) dc.lineJoin = join;

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
                    node.width  = Math.max(node.width, w);
                    node.height = Math.max(node.height, h);
                    node._measured = true;
                }

                sk.push();
                sk.scale(1, -1);
                sk.text(
                    node.content,
                    -node.width * node.pivotX,
                    -node.height * node.pivotY
                );
                sk.pop();
                break;
            }

            case "sprite": {
                sk.push();
                sk.scale(1, -1);

                if (node._img) {
                    const fullW = node._img.width  || 0;
                    const fullH = node._img.height || 0;

                    const dx = -node.width  * node.pivotX;
                    const dy = -node.height * node.pivotY;
                    const dw = node.width;
                    const dh = node.height;

                    const hasSrc = node._sw && node._sh;
                    const matchesFull =
                        node._sx === 0 &&
                        node._sy === 0 &&
                        node._sw === fullW &&
                        node._sh === fullH;

                    const isFull = !hasSrc || matchesFull;

                    if (isFull) {
                        // drawImage(image, dx, dy, dw, dh)
                        dc.drawImage(node._img, dx, dy, dw, dh);
                    } else {
                        // drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
                        dc.drawImage(
                            node._img,
                            node._sx, node._sy, node._sw, node._sh,
                            dx, dy, dw, dh
                        );
                    }
                }

                sk.pop();
                break;
            }

            default:
                break; // groups only recurse
        }

        if (node.children && node.children.length) {
            node.children.sort(byLayer);
            // move origin to parent's top-left (relative to pivot) for children
            sk.translate(-node.width * node.pivotX, -node.height * node.pivotY);
            node.children.forEach((child) => drawNode(child, node.alpha * parentAlpha));
        }

        sk.pop();
    };

    const render = (root) => {
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
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 480,
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
        remove, grid, byLayer, filmstrip, tilingSprite,
    };
};

export default createScenegraph;
