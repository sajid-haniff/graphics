// ================================================
// File: src/ai/search/dfs.js
// --------------------------------
/**
 * Depth-First Search.
 * Options: { tree = false, depthLimit = Infinity }
 * Time: O(b^m), Space: O(b*m).
 */
import { makeStack, reconstructPath, pushSnapshot, expandFromProblem } from './common.js';


export const createDfs = (opts = {}) => {
    const { tree = false, depthLimit = Infinity } = opts;
    const search = (problem) => {
        const { initial, isGoal, cb } = problem;
        const expand = expandFromProblem(problem);
        const st = makeStack();
        st.push({ s: initial, g: 0, d: 0, p: null });
        pushSnapshot(cb, { type: 'enqueue', frontierSize: st.size(), node: initial, g: 0 });
        const parent = new Map();
        const explored = new Set();
        let expanded = 0, frontierMax = 1, touched = 1;


        while (st.size()) {
            const { s, g, d, p } = st.pop();
            pushSnapshot(cb, { type: 'dequeue', frontierSize: st.size(), node: s, g });
            if (p != null && !parent.has(s)) parent.set(s, p);
            if (isGoal(s)) {
                const path = reconstructPath(parent, initial, s);
                pushSnapshot(cb, { type: 'solution', frontierSize: st.size(), node: s, path, g });
                return { path, cost: g, expanded, frontierMax, touched };
            }
            if (!tree) { if (explored.has(s)) continue; explored.add(s); }
            expanded++;
            pushSnapshot(cb, { type: 'expand', frontierSize: st.size(), exploredSize: explored.size, node: s, g });
            if (d >= depthLimit) continue;
            const nbrs = expand(s);
            for (let i = nbrs.length - 1; i >= 0; i--) {
                const { state: s2, cost: step } = nbrs[i];
                if (!tree && explored.has(s2)) continue;
                st.push({ s: s2, g: g + (step ?? 1), d: d + 1, p: s });
                touched++;
                frontierMax = Math.max(frontierMax, st.size());
                pushSnapshot(cb, { type: 'discover', frontierSize: st.size(), node: s2, parent: s });
            }
        }
        pushSnapshot(cb, { type: 'fail', frontierSize: 0 });
        return { path: null, cost: Infinity, expanded, frontierMax, touched };
    };
    return { search };
};