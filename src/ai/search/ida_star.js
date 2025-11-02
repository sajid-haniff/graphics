// ================================================
// File: src/ai/search/iddfs.js
// --------------------------------
/** Iterative Deepening DFS (IDDFS). */
import { reconstructPath, pushSnapshot, expandFromProblem } from './common.js';


export const createIddfs = () => {
    const dls = (problem, limit, stats) => {
        const { initial, isGoal, cb } = problem;
        const expand = expandFromProblem(problem);
        const parent = new Map();
        const visited = new Set();


        const recur = (s, g, d, p) => {
            stats.frontierMax = Math.max(stats.frontierMax, d + 1);
            pushSnapshot(cb, { type: 'expand', frontierSize: 0, node: s, g });
            if (isGoal(s)) return { found: true, goal: s, g };
            if (d === limit) return { found: false };
            visited.add(s);
            stats.expanded++;
            for (const { state: s2, cost: step } of expand(s)) {
                if (!visited.has(s2)) {
                    if (!parent.has(s2)) parent.set(s2, s);
                    const res = recur(s2, g + (step ?? 1), d + 1, s);
                    if (res?.found) return res;
                }
            }
            return { found: false };
        };


        const r = recur(initial, 0, 0, null);
        if (r?.found) {
            const path = reconstructPath(parent, initial, r.goal);
            pushSnapshot(cb, { type: 'solution', frontierSize: 0, node: r.goal, path, g: r.g });
            return { path, cost: r.g };
        }
        return { path: null, cost: Infinity };
    };


    const search = (problem) => {
        let depth = 0;
        const stats = { expanded: 0, frontierMax: 0 };
        while (true) { // termination handled inside when no new nodes revealed
            const r = dls(problem, depth, stats);
            if (r.path) return { ...r, expanded: stats.expanded, frontierMax: stats.frontierMax, touched: NaN };
            if (depth > 1e6) break; // safety
            depth++;
        }
        pushSnapshot(problem.cb, { type: 'fail', frontierSize: 0 });
        return { path: null, cost: Infinity, expanded: stats.expanded, frontierMax: stats.frontierMax, touched: NaN };
    };


    return { search };
};