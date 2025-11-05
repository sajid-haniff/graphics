// ================================================
// File: src/ai/search/astar.js
// --------------------------------
/** A* graph-search (admissible heuristic recommended). */
import { makeMinHeap, reconstructPath, pushSnapshot, expandFromProblem, defaultHeuristic } from './common.js';


export const createAStar = () => {
    const search = (problem) => {
        const h = problem.heuristic || defaultHeuristic;
        const { initial, isGoal, cb } = problem;
        const expand = expandFromProblem(problem);
        const heap = makeMinHeap(n => n.g + n.h);
        heap.push({ s: initial, g: 0, h: h(initial), p: null });
        pushSnapshot(cb, { type: 'enqueue', frontierSize: heap.size(), node: initial, g: 0, h: h(initial), f: h(initial) });
        const parent = new Map();
        const bestG = new Map([[initial, 0]]);
        const closed = new Set();
        let expanded = 0, frontierMax = 1, touched = 1;


        while (heap.size()) {
            const cur = heap.pop();
            const { s, g, h: hs, p } = cur;
            const f = g + hs;
            pushSnapshot(cb, { type: 'dequeue', frontierSize: heap.size(), node: s, g, h: hs, f });
            if (p != null && (!parent.has(s) || g <= (bestG.get(s) ?? Infinity))) parent.set(s, p);
            if (isGoal(s)) {
                const path = reconstructPath(parent, initial, s);
                pushSnapshot(cb, { type: 'solution', frontierSize: heap.size(), node: s, path, g, h: hs, f });
                return { path, cost: g, expanded, frontierMax, touched };
            }
            if (closed.has(s)) continue;
            closed.add(s);
            expanded++;
            pushSnapshot(cb, { type: 'expand', frontierSize: heap.size(), exploredSize: closed.size, node: s, g, h: hs, f });
            for (const { state: s2, cost: step } of expand(s)) {
                const ng = g + (step ?? 1);
                if (closed.has(s2)) continue;
                if (ng < (bestG.get(s2) ?? Infinity)) {
                    bestG.set(s2, ng);
                    const h2 = h(s2);
                    heap.push({ s: s2, g: ng, h: h2, p: s });
                    touched++;
                    frontierMax = Math.max(frontierMax, heap.size());
                    pushSnapshot(cb, { type: 'relax', frontierSize: heap.size(), node: s2, parent: s, g: ng, h: h2, f: ng + h2 });
                }
            }
        }
        pushSnapshot(cb, { type: 'fail', frontierSize: 0 });
        return { path: null, cost: Infinity, expanded, frontierMax, touched };
    };
    return { search };
};