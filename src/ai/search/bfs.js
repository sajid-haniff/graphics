// ================================================
// File: src/ai/search/bfs.js
// --------------------------------
/**
 * Breadth-First Search (graph-search).
 * Time: O(b^d), Space: O(b^d).
 * Tie-breaking: FIFO by insertion order.
 */
import { makeQueue, reconstructPath, pushSnapshot, expandFromProblem } from './common.js';


export const createBfs = () => {
    const search = (problem) => {
        const { initial, isGoal, cb } = problem;
        const expand = expandFromProblem(problem);
        const frontier = makeQueue();
        frontier.push({ s: initial, g: 0, p: null });
        pushSnapshot(cb, { type: 'enqueue', frontierSize: frontier.size(), node: initial, g: 0 });
        const parent = new Map();
        const cost = new Map([[initial, 0]]);
        const explored = new Set();
        let expanded = 0, frontierMax = 1, touched = 1;


        while (frontier.size()) {
            const node = frontier.shift();
            const { s, g, p } = node;
            pushSnapshot(cb, { type: 'dequeue', frontierSize: frontier.size(), node: s, g });
            if (p != null && !parent.has(s)) parent.set(s, p);
            if (isGoal(s)) {
                const path = reconstructPath(parent, initial, s);
                pushSnapshot(cb, { type: 'solution', frontierSize: frontier.size(), node: s, path, g });
                return { path, cost: g, expanded, frontierMax, touched };
            }
            if (explored.has(s)) continue;
            explored.add(s);
            expanded++;
            pushSnapshot(cb, { type: 'expand', frontierSize: frontier.size(), exploredSize: explored.size, node: s, g });


            for (const { state: s2, cost: step } of expand(s)) {
                if (explored.has(s2)) continue;
                if (!cost.has(s2)) {
                    cost.set(s2, g + (step ?? 1));
                    frontier.push({ s: s2, g: g + (step ?? 1), p: s });
                    touched++;
                    frontierMax = Math.max(frontierMax, frontier.size());
                    pushSnapshot(cb, { type: 'discover', frontierSize: frontier.size(), node: s2, parent: s, g: g + (step ?? 1) });
                }
            }
        }
        pushSnapshot(cb, { type: 'fail', frontierSize: 0 });
        return { path: null, cost: Infinity, expanded, frontierMax, touched };
    };
    return { search };
};