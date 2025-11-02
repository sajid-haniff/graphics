// ================================================
// File: src/ai/search/bidirectional.js
// --------------------------------
/** Bidirectional BFS meeting in the middle. */
import { makeQueue, reconstructPath, pushSnapshot } from './common.js';


export const createBidirectional = () => {
    const search = (problem) => {
        const { initial, isGoal, cb } = problem;
        if (!problem.neighbors) throw new Error('Bidirectional search requires neighbors(s) function.');
        const neighbors = problem.neighbors;


        const f = makeQueue();
        const b = makeQueue();
        f.push(initial); b.push(problem.goal ?? null);


        const parentF = new Map();
        const parentB = new Map();
        const seenF = new Set([initial]);
        const seenB = new Set(problem.goal != null ? [problem.goal] : []);


        let meet = null, expanded = 0, frontierMax = 2, touched = seenF.size + seenB.size;
        pushSnapshot(cb, { type: 'enqueue', frontierSize: f.size() + b.size(), node: initial });


        const step = (q, seen, otherSeen, parent, forward) => {
            if (!q.size()) return false;
            const s = q.shift();
            pushSnapshot(cb, { type: 'dequeue', frontierSize: f.size() + b.size(), node: s });
            expanded++;
            for (const { state: s2 } of neighbors(s)) {
                if (!seen.has(s2)) {
                    seen.add(s2); parent.set(s2, s); q.push(s2); touched++;
                    frontierMax = Math.max(frontierMax, f.size() + b.size());
                    pushSnapshot(cb, { type: 'discover', frontierSize: f.size() + b.size(), node: s2, parent: s });
                    if (otherSeen.has(s2)) { meet = s2; return true; }
                }
            }
            return false;
        };


        while (f.size() || b.size()) {
            if (step(f, seenF, seenB, parentF, true)) break;
            if (problem.goal != null && step(b, seenB, seenF, parentB, false)) break;
            if (meet != null) break;
            if (!f.size() && !b.size()) break;
        }


        if (meet != null) {
// Build forward path start->meet
            const pathF = reconstructPath(parentF, initial, meet) || [initial];
// Build backward path goal->meet, then reverse and drop meeting node to avoid dup
            const goal = problem.goal;
            const pathB = reconstructPath(parentB, goal, meet) || [goal];
            const path = pathF.concat(pathB.slice(0, -1).reverse());
            pushSnapshot(cb, { type: 'solution', frontierSize: f.size() + b.size(), node: meet, path });
            return { path, cost: path.length - 1, expanded, frontierMax, touched };
        }


        pushSnapshot(cb, { type: 'fail', frontierSize: f.size() + b.size() });
        return { path: null, cost: Infinity, expanded, frontierMax, touched };
    };
    return { search };
};