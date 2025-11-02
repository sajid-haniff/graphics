// ================================================
// File: src/ai/search/common.js
// --------------------------------
/**
 * Shared helpers for AIMA-style search algorithms.
 * - Functional, no mutation of caller data.
 * - Stable tie-breaking via monotonically increasing pushId.
 *
 * ASCII grid example (for demos):
 *
 *  S . # . G    States are encoded as "r,c" (row,col). '#' are walls.
 *  . . # . .    neighbors("r,c") returns 4-neighborhood cells that are in-bounds
 *  . . . . .    and not walls: up/down/left/right.
 *
 * Heuristic (Manhattan): h(s) = |r_s - r_g| + |c_s - c_g|.
 */

// --- Path utility -----------------------------------------------------------
export const reconstructPath = (parent, start, goal) => {
    if (!goal || (start == null) || (goal == null)) return null;
    const out = [];
    let cur = goal;
    while (cur != null) {
        out.push(cur);
        if (cur === start) break;
        cur = parent.get(cur);
    }
    return (out[out.length - 1] === start) ? out.reverse() : null;
};

// --- Heuristic default ------------------------------------------------------
export const defaultHeuristic = () => 0;

// --- Snapshot emitter (safe/no-op when absent) ------------------------------
export const pushSnapshot = (cb, obj) => { if (cb) cb({ ...obj }); };

// --- FIFO queue -------------------------------------------------------------
export const makeQueue = () => {
    const a = [];
    let head = 0;
    return {
        size: () => a.length - head,
        push: (v) => { a.push(v); },
        shift: () => (head < a.length ? a[head++] : undefined),
        peek: () => (head < a.length ? a[head] : undefined),
        toArray: () => a.slice(head),
    };
};

// --- LIFO stack -------------------------------------------------------------
export const makeStack = () => {
    const a = [];
    return {
        size: () => a.length,
        push: (v) => { a.push(v); },
        pop: () => a.pop(),
        peek: () => a[a.length - 1],
        toArray: () => a.slice(),
    };
};

// --- Stable min-heap (by keyFn) --------------------------------------------
export const makeMinHeap = (keyFn) => {
    const h = [];
    let pushId = 0;
    const keyWrap = (v) => ({ v, k: keyFn(v), id: pushId++ });
    const less = (i, j) => {
        const a = h[i], b = h[j];
        if (a.k === b.k) return a.id < b.id; // stable
        return a.k < b.k;
    };
    const swap = (i, j) => { const t = h[i]; h[i] = h[j]; h[j] = t; };
    const up = (i) => { while (i) { const p = ((i - 1) >> 1); if (less(i, p)) { swap(i, p); i = p; } else break; } };
    const down = (i) => {
        for (;;) {
            const l = (i << 1) + 1, r = l + 1;
            let m = i;
            if (l < h.length && less(l, m)) m = l;
            if (r < h.length && less(r, m)) m = r;
            if (m === i) break; swap(i, m); i = m;
        }
    };
    return {
        size: () => h.length,
        push: (v) => { h.push(keyWrap(v)); up(h.length - 1); },
        pop: () => { if (!h.length) return undefined; const top = h[0].v; const last = h.pop(); if (h.length && last) { h[0] = last; down(0); } return top; },
        peek: () => (h.length ? h[0].v : undefined),
        toArray: () => h.map(e => e.v),
    };
};

// --- Neighbor expansion adaptor --------------------------------------------
export const expandFromProblem = (problem) => (s) => {
    if (problem.neighbors) return problem.neighbors(s).map(e => ({ state: e.state, action: e.action, cost: e.cost ?? 1 }));
    const acts = problem.actions?.(s) || [];
    return acts.map(a => {
        const s2 = problem.result?.(s, a);
        const c = problem.stepCost?.(s, a, s2) ?? 1;
        return { state: s2, action: a, cost: c };
    });
};

// (Explicit export list to make tree-shakers happy in some bundlers)
export {
    reconstructPath as __reconstructPath,
    defaultHeuristic as __defaultHeuristic,
    pushSnapshot as __pushSnapshot,
    makeQueue as __makeQueue,
    makeStack as __makeStack,
    makeMinHeap as __makeMinHeap,
    expandFromProblem as __expandFromProblem,
};
