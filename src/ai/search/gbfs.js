// ================================================
// File: src/ai/search/gbfs.js
// --------------------------------
/** Greedy Best-First Search — orders frontier by h(s). */
import { makeMinHeap, reconstructPath, pushSnapshot, expandFromProblem, defaultHeuristic } from './common.js';


export const createGbfs = () => {
    const search = (problem) => {
        const h = problem.heuristic || defaultHeuristic;
        const { initial, isGoal, cb } = problem;
        const expand = expandFromProblem(problem);
        const heap = makeMinHeap(n => n.h);
        heap.push({ s: initial, g: 0, h: h(initial), p: null });
        pushSnapshot(cb, { type: 'enqueue', frontierSize: heap.size(), node: initial, g: 0, h: h(initial), f: h(initial) });
        const parent = new Map();
        const closed = new Set();
        let expanded = 0, frontierMax = 1, touched = 1;


        while (heap.size()) {
            const cur = heap.pop();
            const { s, g, h: hs, p } = cur;
            pushSnapshot(cb, { type: 'dequeue', frontierSize: heap.size(), node: s, g, h: hs, f: hs });
            if (p != null && !parent.has(s)) parent.set(s, p);
            if (isGoal(s)) {
                const path = reconstructPath(parent, initial, s);
                pushSnapshot(cb, { type: 'solution', frontierSize: heap.size(), node: s, path, g, h: hs, f: hs });
                return { path, cost: g, expanded, frontierMax, touched };
            }
            if (closed.has(s)) continue;
            closed.add(s);
            expanded++;
            pushSnapshot(cb, { type: 'expand', frontierSize: heap.size(), exploredSize: closed.size, node: s, g, h: hs, f: hs });
            for (const { state: s2, cost: step } of expand(s)) {
                if (closed.has(s2)) continue;
                const h2 = h(s2);
                heap.push({ s: s2, g: g + (step ?? 1), h: h2, p: s });
                touched++;
                frontierMax = Math.max(frontierMax, heap.size());
                pushSnapshot(cb, { type: 'discover', frontierSize: heap.size(), node: s2, parent: s, g: g + (step ?? 1), h: h2, f: h2 });
            }
        }
        pushSnapshot(cb, { type: 'fail', frontierSize: 0 });
        return { path: null, cost: Infinity, expanded, frontierMax, touched };
    };
    return { search };
};