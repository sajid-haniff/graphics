// ================================================
// File: src/ai/search/rbfs.js
// --------------------------------
/** Recursive Best-First Search (RBFS). */
import { reconstructPath, pushSnapshot, expandFromProblem, defaultHeuristic } from './common.js';


export const createRbfs = () => {
    const search = (problem) => {
        const h = problem.heuristic || defaultHeuristic;
        const { initial, isGoal, cb } = problem;
        const expand = expandFromProblem(problem);


        const parent = new Map();


        const rbfs = (s, g, flimit) => {
            const hs = h(s);
            const f = Math.max(g + hs, flimit?.baseF ?? -Infinity);
            pushSnapshot(cb, { type: 'expand', frontierSize: 0, node: s, g, h: hs, f });
            if (isGoal(s)) return { found: true, goal: s, g, newF: f };


            let successors = expand(s).map(({ state: s2, cost }) => ({ s: s2, g: g + (cost ?? 1), f: g + (cost ?? 1) + h(s2) }));
            if (!successors.length) return { found: false, newF: Infinity };


            while (successors.length) {
                successors.sort((a, b) => (a.f - b.f));
                let best = successors[0];
                if (best.f > flimit.limit) return { found: false, newF: best.f };
                const alt = successors.length > 1 ? successors[1].f : Infinity;
                if (!parent.has(best.s)) parent.set(best.s, s);
                const res = rbfs(best.s, best.g, { limit: Math.min(flimit.limit, alt), baseF: best.f });
                best.f = res.newF;
                if (res.found) return res;
            }
            return { found: false, newF: Infinity };
        };


        const res = rbfs(initial, 0, { limit: Infinity, baseF: -Infinity });
        if (res.found) {
            const path = reconstructPath(parent, initial, res.goal);
            pushSnapshot(cb, { type: 'solution', frontierSize: 0, node: res.goal, path, g: res.g, f: res.g + (problem.heuristic?.(res.goal) ?? 0) });
            return { path, cost: res.g, expanded: NaN, frontierMax: NaN, touched: NaN };
        }
        pushSnapshot(cb, { type: 'fail', frontierSize: 0 });
        return { path: null, cost: Infinity, expanded: NaN, frontierMax: NaN, touched: NaN };
    };
    return { search };
};