// ================================================
// File: src/ai/search/ucs.js
// --------------------------------
/**
 * Uniform-Cost Search (Dijkstra) — graph search on path cost g.
 * Time: O((V+E) log V).
 */
import { makeMinHeap, reconstructPath, pushSnapshot, expandFromProblem } from './common.js';


export const createUcs = () => {
    const search = (problem) => {
        const { initial, isGoal, cb } = problem;
        const expand = expandFromProblem(problem);
        const heap = makeMinHeap(n => n.g);
        heap.push({ s: initial, g: 0, p: null });
        pushSnapshot(cb, { type: 'enqueue', frontierSize: heap.size(), node: initial, g: 0, f: 0 });
        const parent = new Map();
        const bestG = new Map([[initial, 0]]);
        const closed = new Set();
        let expanded = 0, frontierMax = 1, touched = 1;


        while (heap.size()) {
            const cur = heap.pop();
            const { s, g, p } = cur;
            pushSnapshot(cb, { type: 'dequeue', frontierSize: heap.size(), node: s, g, f: g });
            if (p != null && (!parent.has(s) || g <= (bestG.get(s) ?? Infinity))) parent.set(s, p);
            if (isGoal(s)) {
                const path = reconstructPath(parent, initial, s);
                pushSnapshot(cb, { type: 'solution', frontierSize: heap.size(), node: s, path, g, f: g });
                return { path, cost: g, expanded, frontierMax, touched };
            }
            if (closed.has(s)) continue;
            closed.add(s);
            expanded++;
            pushSnapshot(cb, { type: 'expand', frontierSize: heap.size(), exploredSize: closed.size, node: s, g, f: g });
            for (const { state: s2, cost: step } of expand(s)) {
                const ng = g + (step ?? 1);
                if (closed.has(s2)) continue;
                if (ng < (bestG.get(s2) ?? Infinity)) {
                    bestG.set(s2, ng);
                    heap.push({ s: s2, g: ng, p: s });
                    touched++;
                    frontierMax = Math.max(frontierMax, heap.size());
                    pushSnapshot(cb, { type: 'relax', frontierSize: heap.size(), node: s2, parent: s, g: ng, f: ng });
                }
            }
        }
        pushSnapshot(cb, { type: 'fail', frontierSize: 0 });
        return { path: null, cost: Infinity, expanded, frontierMax, touched };
    };
    return { search };
};