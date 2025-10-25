// /src/lib/esm/spatial/quadtree.js
// -----------------------------------------------------------------------------
// Elegant, fast Quadtree (no classes). Stores Rect-like objects: { x, y, width, height }.
// Quadrant order: 0: TR, 1: TL, 2: BL, 3: BR (common classic layout).
// Coordinate system agnostic: works for Y-up or Y-down (we compare box edges only).
//
// DESIGN GOALS
// - Minimal allocations (reuses arrays, avoids temporaries).
// - Simple API for game loops: clear → insert → retrieve.
// - Correctness for overlapping rectangles (rect can live in multiple children).
// - Small surface area, easy to debug (traverse(), stats()).
//
// TYPICAL USAGE (per frame)
//   const qt = createQuadtree({ x: world.left, y: world.bottom, width: W, height: H }, 8, 6);
//   qt.clear();
//   for (const r of rocks) qt.insert(r.aabb);  // each is {x,y,width,height}
//   if (ship) qt.insert(ship.aabb);
//   for (const b of bullets) {
//     const candidates = qt.retrieve(b.aabb, tmp); tmp.length = 0;
//     // narrow phase: for (const t of candidates) if (intersects(b.aabb, t)) {...}
//   }
//
// NOTE: The quadtree returns *candidates*. You still run your narrow phase
// (AABB check, circle overlap, poly tests, etc.) to confirm collisions.
//
// -----------------------------------------------------------------------------

/**
 * Axis-Aligned Bounding Box (AABB) intersection test.
 * Fast broad-phase predicate used after retrieving candidates.
 * @param {{x:number,y:number,width:number,height:number}} a
 * @param {{x:number,y:number,width:number,height:number}} b
 * @returns {boolean} true if a and b overlap
 */
export const intersects = (a, b) =>
    a && b &&
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

/**
 * Factory for a quadtree node.
 * @param {{x:number,y:number,width:number,height:number}} bounds  Root/node bounds in world space.
 * @param {number} [maxObjects=8]  Max objects per node before splitting.
 * @param {number} [maxLevels=6]   Maximum subdivision depth.
 * @param {number} [level=0]       Current depth (internal; callers omit).
 * @returns {{
 *   clear: ()=>void,
 *   insert: (rect:{x:number,y:number,width:number,height:number})=>void,
 *   retrieve: (rect:{x:number,y:number,width:number,height:number}, out?:any[])=>any[],
 *   traverse: (fn:(node:{bounds:any,level:number,objects:any[]})=>void)=>void,
 *   stats: ()=>{nodes:number,objects:number},
 *   bounds: {x:number,y:number,width:number,height:number}
 * }}
 */
export const createQuadtree = (bounds, maxObjects = 8, maxLevels = 6, level = 0) => {
    // Node-local storage closed over this factory instance.
    /** @type {any[]} */
    let objects = [];   // Rects stored directly in this node
    /** @type {ReturnType<typeof createQuadtree>[]} */
    let nodes = [];     // Children (created lazily on split)

    // Precompute geometry for fast index tests.
    const width2  = bounds.width  * 0.5;
    const height2 = bounds.height * 0.5;
    const xmid = bounds.x + width2;  // vertical divider
    const ymid = bounds.y + height2; // horizontal divider

    /**
     * Remove all objects and children from this node (and descendants).
     * Call once per frame before reinserting your scene's objects.
     * O(N) over all nodes/objects in the subtree.
     */
    const clear = () => {
        objects.length = 0;
        for (let i = 0; i < nodes.length; i++) nodes[i]?.clear();
        nodes.length = 0; // drop children (recreated on demand)
    };

    /**
     * Subdivide this node into 4 children (if not already split).
     * Quadrant order: 0 TR, 1 TL, 2 BL, 3 BR.
     * Internal; invoked automatically when exceeding maxObjects.
     */
    const split = () => {
        const w = width2, h = height2;
        const x = bounds.x, y = bounds.y;

        // Order: 0: TR, 1: TL, 2: BL, 3: BR
        nodes[0] = createQuadtree({ x: x + w, y: y,     width: w, height: h }, maxObjects, maxLevels, level + 1);
        nodes[1] = createQuadtree({ x: x,     y: y,     width: w, height: h }, maxObjects, maxLevels, level + 1);
        nodes[2] = createQuadtree({ x: x,     y: y + h, width: w, height: h }, maxObjects, maxLevels, level + 1);
        nodes[3] = createQuadtree({ x: x + w, y: y + h, width: w, height: h }, maxObjects, maxLevels, level + 1);
    };

    /**
     * Determine which child quadrants a rect overlaps.
     * IMPORTANT: We push *all* overlapping children (not strict containment).
     * This avoids missing candidates when a rect straddles the center lines.
     * @param {{x:number,y:number,width:number,height:number}} rect
     * @param {number[]} [out=[]]  Optional reusable array to avoid allocs.
     * @returns {number[]} indices of overlapping children (0..3)
     */
    const getIndex = (rect, out = []) => {
        out.length = 0;

        // Top/bottom overlap relative to ymid.
        // We use overlap (not < / > exclusively) so that any straddling rect is
        // routed to both relevant halves.
        const overlapsTop    = rect.y < ymid;
        const overlapsBottom = rect.y + rect.height > ymid;

        // Left/right overlap relative to xmid.
        const overlapsLeft  = rect.x < xmid;
        const overlapsRight = rect.x + rect.width > xmid;

        if (overlapsTop && overlapsRight)   out.push(0); // TR
        if (overlapsTop && overlapsLeft)    out.push(1); // TL
        if (overlapsBottom && overlapsLeft) out.push(2); // BL
        if (overlapsBottom && overlapsRight)out.push(3); // BR

        return out;
    };

    /**
     * Insert a rectangle into the quadtree. If this node is split, forwards to
     * all overlapping children. If not split yet, stores locally until capacity
     * exceeds maxObjects, then splits and redistributes.
     * Amortized O(log N) for well-distributed data.
     * @param {{x:number,y:number,width:number,height:number}} rect
     */
    const insert = (rect) => {
        if (!rect) return;

        if (nodes.length) {
            // Already split ⇒ forward into children that overlap this rect.
            const idx = getIndex(rect);
            if (idx.length) {
                for (let i = 0; i < idx.length; i++) nodes[idx[i]].insert(rect);
                return;
            }
        }

        // Store locally.
        objects.push(rect);

        // Split if over capacity (and allowed by maxLevels).
        if (objects.length > maxObjects && level < maxLevels) {
            if (!nodes.length) split();

            // Redistribute objects that belong to children.
            // Stable in-place loop; only splice when moving to children.
            let i = 0;
            while (i < objects.length) {
                const obj = objects[i];
                const idx = getIndex(obj);
                if (idx.length) {
                    // Move to all overlapping children.
                    objects.splice(i, 1);
                    for (let k = 0; k < idx.length; k++) nodes[idx[k]].insert(obj);
                } else {
                    i++;
                }
            }
        }
    };

    /**
     * Retrieve *candidate* rectangles that may collide with the given rect.
     * You must still run a narrow-phase test (AABB, circle, poly, etc.).
     * @param {{x:number,y:number,width:number,height:number}} rect
     * @param {any[]} [out=[]]  Optional array to fill (reused per call to avoid GC).
     * @returns {any[]} The output array filled with candidate rects (deduplicated).
     */
    const retrieve = (rect, out = []) => {
        if (!rect) return out;

        // Add all objects stored in this node.
        for (let i = 0; i < objects.length; i++) out.push(objects[i]);

        // Recurse into relevant children.
        if (nodes.length) {
            const idx = getIndex(rect);
            if (idx.length) {
                for (let i = 0; i < idx.length; i++) nodes[idx[i]].retrieve(rect, out);
            } else {
                // Straddles center ⇒ must check all children.
                for (let i = 0; i < nodes.length; i++) nodes[i].retrieve(rect, out);
            }
        }

        // Deduplicate by reference (a rect can be in multiple children).
        if (out.length > 1) {
            const seen = new Set();
            let w = 0;
            for (let r = 0; r < out.length; r++) {
                const o = out[r];
                if (!seen.has(o)) { seen.add(o); out[w++] = o; }
            }
            out.length = w;
        }
        return out;
    };

    /**
     * Visit every node in the subtree depth-first.
     * Useful for drawing debug bounds or gathering metrics.
     * @param {(node:{bounds:any, level:number, objects:any[]})=>void} fn
     */
    const traverse = (fn) => {
        fn({ bounds, level, objects });
        for (let i = 0; i < nodes.length; i++) nodes[i]?.traverse(fn);
    };

    /**
     * Count total nodes and objects in this subtree (for profiling).
     * @returns {{nodes:number, objects:number}}
     */
    const stats = () => {
        let nodesCount = 1, objCount = objects.length;
        for (let i = 0; i < nodes.length; i++) {
            const s = nodes[i].stats();
            nodesCount += s.nodes;
            objCount += s.objects;
        }
        return { nodes: nodesCount, objects: objCount };
    };

    // Public API for this node instance.
    return { clear, insert, retrieve, traverse, stats, bounds };
};

// -----------------------------------------------------------------------------
// OPTIONAL: tiny p5 debug renderer (device/world agnostic depending on matrix).
// Call with world-composite applied if you want it in world space.
//
// Example:
//   sk.resetMatrix(); sk.applyMatrix(...M2D.toArgs(COMPOSITE));
//   drawQuadtree(sk, qt, pixelToWorld(1), '#00FF88');
//
// -----------------------------------------------------------------------------

/**
 * Draw the quadtree node bounds (for debugging).
 * Applies whatever transform is currently active on `sk`.
 * @param {import('p5')} sk  p5 instance (via your injected `sk`)
 * @param {ReturnType<typeof createQuadtree>} qt
 * @param {number} strokeW  stroke weight in world/device units depending on current matrix
 * @param {string} color    stroke color
 */
export const drawQuadtree = (sk, qt, strokeW = 1, color = '#0F0') => {
    sk.push();
    sk.noFill();
    sk.stroke(color);
    sk.strokeWeight(strokeW);
    qt.traverse(({ bounds }) => {
        sk.rectMode(sk.CORNER);
        sk.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    });
    sk.pop();
};
