// src/lib/esm/quadtree.js
// Functional, closure-based Quadtree for AABB + optional circle queries.
// Coordinates are world-space, axis-aligned, top-left {x,y,w,h} for nodes and ranges.
// Items can be inserted with either an AABB {x,y,w,h} or a circle {cx,cy,r}.
// When given a circle, we convert to AABB internally.
// No classes; pure factory + helpers.

const _aabbFromCircle = (c) => {
    const d = c.r * 2;
    return { x: c.cx - c.r, y: c.cy - c.r, w: d, h: d };
};

const _contains = (outer, inner) =>
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h;

const _intersects = (a, b) =>
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;

const _intersectsCircleAABB = (circle, box) => {
    // circle: {cx,cy,r}, box: {x,y,w,h}
    const nx = Math.max(box.x, Math.min(circle.cx, box.x + box.w));
    const ny = Math.max(box.y, Math.min(circle.cy, box.y + box.h));
    const dx = circle.cx - nx;
    const dy = circle.cy - ny;
    return dx * dx + dy * dy <= circle.r * circle.r;
};

const _aabb = (obj) => {
    if (obj && obj.w != null) return obj;           // {x,y,w,h}
    if (obj && obj.r != null) return _aabbFromCircle(obj); // {cx,cy,r}
    throw new Error('quadtree: expected AABB {x,y,w,h} or circle {cx,cy,r}');
};

export const createQuadtree = (bounds, opts = {}) => {
    const CAPACITY = opts.capacity ?? 8;
    const MAX_DEPTH = opts.maxDepth ?? 8;

    const root = {
        depth: 0,
        bounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
        items: [],
        children: null, // [nw, ne, sw, se]
    };

    const _mkChildBounds = (b) => {
        const hw = b.w * 0.5, hh = b.h * 0.5, x = b.x, y = b.y;
        return [
            { x: x,       y: y,       w: hw, h: hh }, // NW
            { x: x + hw,  y: y,       w: hw, h: hh }, // NE
            { x: x,       y: y + hh,  w: hw, h: hh }, // SW
            { x: x + hw,  y: y + hh,  w: hw, h: hh }, // SE
        ];
    };

    const _subdivide = (node) => {
        const bs = _mkChildBounds(node.bounds);
        node.children = bs.map((b) => ({
            depth: node.depth + 1,
            bounds: b,
            items: [],
            children: null,
        }));
        // Re-distribute items into children if they fit completely
        const remaining = [];
        for (const it of node.items) {
            let placed = false;
            for (const child of node.children) {
                if (_contains(child.bounds, it.aabb)) {
                    child.items.push(it);
                    placed = true;
                    break;
                }
            }
            if (!placed) remaining.push(it);
        }
        node.items = remaining;
    };

    const _insertInto = (node, item) => {
        if (!_intersects(node.bounds, item.aabb)) return false;

        if (node.children) {
            // Try to descend if contained by a child
            for (const child of node.children) {
                if (_contains(child.bounds, item.aabb)) return _insertInto(child, item);
            }
            // Else keep item at current node
            node.items.push(item);
            return true;
        }

        node.items.push(item);
        if (node.items.length > CAPACITY && node.depth < MAX_DEPTH) {
            _subdivide(node);
        }
        return true;
    };

    const _collectInRange = (node, rangeAABB, out) => {
        if (!_intersects(node.bounds, rangeAABB)) return;
        // Add items that intersect range
        for (const it of node.items) {
            if (_intersects(it.aabb, rangeAABB)) out.push(it.payload);
        }
        if (node.children) {
            for (const child of node.children) _collectInRange(child, rangeAABB, out);
        }
    };

    const _collectCircle = (node, circle, out) => {
        // fast reject: node.bounds vs circle
        if (!_intersectsCircleAABB(circle, node.bounds)) return;
        for (const it of node.items) {
            if (_intersectsCircleAABB(circle, { x: it.aabb.x, y: it.aabb.y, w: it.aabb.w, h: it.aabb.h })) {
                out.push(it.payload);
            }
        }
        if (node.children) {
            for (const child of node.children) _collectCircle(child, circle, out);
        }
    };

    const clear = () => {
        root.items.length = 0;
        root.children = null;
    };

    const insert = (payload, shape) => {
        const aabb = _aabb(shape);
        return _insertInto(root, { payload, aabb: { x: aabb.x, y: aabb.y, w: aabb.w, h: aabb.h } });
    };

    // Optional; simpler in fast-moving scenes to just clear+rebuild each frame.
    const rebuild = (items) => {
        clear();
        for (const it of items) insert(it.payload, it.shape);
    };

    const queryAABB = (range, out = []) => {
        _collectInRange(root, _aabb(range), out);
        return out;
    };

    const queryCircle = (circle, out = []) => {
        _collectCircle(root, circle, out);
        return out;
    };

    // Optional visualizer (device/world agnostic; you pass the correct matrix before calling).
    const debugDraw = (sk, strokeW = 1) => {
        const drawNode = (node) => {
            const b = node.bounds;
            sk.noFill();
            sk.stroke(0, 255, 255, 180);
            sk.strokeWeight(strokeW);
            sk.rect(b.x, b.y, b.w, b.h);
            if (node.children) node.children.forEach(drawNode);
        };
        drawNode(root);
    };

    return { clear, insert, rebuild, queryAABB, queryCircle, debugDraw, root };
};
