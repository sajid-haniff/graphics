/**
 * General CSP Solver (Norvig-style, UI-agnostic)
 *
 * Factory:
 *   export const createCSP = () => ({ solve });
 *
 * Problem shape (Norvig/AIMA-compatible):
 * {
 *   variables:  string[],                     // e.g., ['WA','NT','SA', ...]
 *   domains:    Record<string, any[]>,        // e.g., { WA: ['red','green','blue'], ... }
 *   neighbors:  Record<string, string[]>,     // e.g., { WA: ['NT','SA'], ... }
 *   constraints:(A, a, B, b) => boolean,      // must be symmetric & pure; returns true iff (A=a, B=b) are consistent
 *   cb?:        (assignment, domains, problem) => void, // optional: called after each *consistent* extension
 *   timeStep?:  number                         // ignored by solver; available for visualizers
 * }
 *
 * Return value:
 *   solve(problem) → assignment | null
 *     - assignment: Record<string, any> with a value for every variable
 *     - null: unsatisfiable
 *
 * Algorithms used:
 *   - Backtracking search
 *   - MRV (Minimum Remaining Values) for variable selection
 *       Chooses the unassigned variable with the smallest current domain.
 *   - LCV (Least Constraining Value) for value ordering
 *       Orders candidate values by how few neighbor-domain values they eliminate (ascending).
 *   - AC-3 (Arc Consistency) as inference
 *       Prunes domains before search and after each assignment. If any domain empties, fails early.
 *
 * Guarantees & behavior:
 *   - Non-destructive: input `domains` is shallow-cloned up front and at each recursive step.
 *   - Deterministic given input order (ties in MRV/LCV break by input order).
 *   - `constraints` is only ever called with already-assigned neighbor pairs in `isConsistent`,
 *     and with candidate pairs during AC-3 `revise`.
 *   - `neighbors` should list *directed* arcs for AC-3. For undirected problems, include both directions
 *     (e.g., WA↔NT). If only one direction is listed, propagation will be asymmetric.
 *
 * Complexity notes:
 *   - Worst case is exponential in |variables|; MRV/LCV/AC-3 significantly reduce branching.
 *   - AC-3 runs in O(|arcs| * d^3) in the trivial bound (usually much better in practice), where d is max domain size.
 *
 * Edge cases & expectations:
 *   - Empty domain for any variable ⇒ immediate failure.
 *   - Variables absent from `domains` or `neighbors` ⇒ treated as [] / [] (and will fail).
 *   - `constraints` must be *pure* (no side effects) and symmetric: constraints(A,a,B,b) === constraints(B,b,A,a).
 *
 * Minimal usage:
 *   import { createCSP } from './createCSP.js';
 *   const { solve } = createCSP();
 *   const solution = solve({ variables, domains, neighbors, constraints });
 *
 * Optional visualization hook:
 *   If `cb` is provided, it is called with (assignmentSnapshot, domainsSnapshot, problem) after each consistent extension
 *   *and* after AC-3 pruning on that branch. Use this to animate or log progress; the solver doesn't depend on it.
 */

/**
 * General CSP Solver (Norvig-style, UI-agnostic)
 * Factory: export const createCSP = () => ({ solve });
 * Algorithms: Backtracking + MRV (+ degree tiebreak) + LCV + AC-3
 */

export const createCSP = () => {
    // ---------- Public API ----------
    const solve = (problem) => {
        const { variables, domains, neighbors, constraints } = problem || {};
        if (!Array.isArray(variables) || !domains || !neighbors || typeof constraints !== 'function') return null;

        // Ensure adjacency lists exist and precheck for empty domains
        for (const v of variables) {
            if (!Array.isArray(domains[v])) return null;
            if (!neighbors[v]) neighbors[v] = [];
            if (domains[v].length === 0) return null;
        }

        const D0 = cloneDomains(domains);
        if (!ac3(problem, D0)) return null;         // initial pruning
        return backtrack({}, problem, D0);           // search
    };

    // ---------- Backtracking ----------
    const backtrack = (A, problem, D) => {
        const vars = problem.variables;
        if (isComplete(A, vars)) return A;

        const X = selectUnassignedVariable(A, problem, D);
        if (X == null) return null;

        const vals = orderDomainValues(X, A, problem, D);
        const nbs = problem.neighbors[X] || [];
        const C = problem.constraints;

        for (let i = 0; i < vals.length; i++) {
            const v = vals[i];
            if (!isConsistentFast(X, v, A, nbs, C)) continue;

            const A2 = { ...A, [X]: v };
            const D2 = cloneDomains(D);
            D2[X] = [v];

            if (!ac3(problem, D2)) continue;

            if (typeof problem.cb === 'function') {
                try { problem.cb(A2, D2, problem); } catch (_) {}
            }

            const res = backtrack(A2, problem, D2);
            if (res) return res;
        }
        return null;
    };

    // ---------- Heuristics ----------
    // MRV with degree tiebreak: pick smallest domain; on ties, most unassigned neighbors
    const selectUnassignedVariable = (A, problem, D) => {
        const { variables, neighbors } = problem;
        let best = null, bestSize = Infinity, bestDeg = -1;

        for (const v of variables) {
            if (v in A) continue;
            const dom = D[v] || EMPTY;
            const sz = dom.length;
            if (sz < bestSize) {
                best = v; bestSize = sz; bestDeg = countUnassignedNeighbors(v, neighbors, A);
                if (sz === 1) break; // can't beat this
            } else if (sz === bestSize) {
                const deg = countUnassignedNeighbors(v, neighbors, A);
                if (deg > bestDeg) { best = v; bestDeg = deg; }
            }
        }
        return best;
    };

    const countUnassignedNeighbors = (v, neighbors, A) => {
        const nbs = neighbors[v] || EMPTY;
        let k = 0;
        for (let i = 0; i < nbs.length; i++) if (!(nbs[i] in A)) k++;
        return k;
    };

    // LCV: fewest ruled-out neighbor values first
    const orderDomainValues = (X, A, problem, D) => {
        const vals = D[X] ? [...D[X]] : EMPTY;
        if (vals.length <= 1) return vals;

        const C = problem.constraints;
        const neighbors = problem.neighbors[X] || EMPTY;

        const countRuled = (val) => {
            let out = 0;
            for (let i = 0; i < neighbors.length; i++) {
                const nb = neighbors[i];
                if (nb in A) {
                    out += C(X, val, nb, A[nb]) ? 0 : 1;
                } else {
                    const Dj = D[nb] || EMPTY;
                    for (let j = 0; j < Dj.length; j++) {
                        if (!C(X, val, nb, Dj[j])) out++;
                    }
                }
            }
            return out;
        };

        // Stable sort by ruled-out count
        return vals
            .map(v => ({ v, c: countRuled(v) }))
            .sort((a, b) => a.c - b.c)
            .map(o => o.v);
    };

    // ---------- Consistency ----------
    const isConsistentFast = (X, v, A, nbs, C) => {
        for (let i = 0; i < nbs.length; i++) {
            const nb = nbs[i];
            if (!(nb in A)) continue;
            if (!C(X, v, nb, A[nb])) return false;
        }
        return true;
    };

    // ---------- AC-3 (with O(1) queue) ----------
    const ac3 = (problem, D) => {
        const Q = [];
        const N = problem.neighbors;

        // init queue with all directed arcs
        for (const Xi in N) {
            const nbs = N[Xi] || EMPTY;
            for (let j = 0; j < nbs.length; j++) Q.push([Xi, nbs[j]]);
        }

        for (let head = 0; head < Q.length; head++) {
            const [Xi, Xj] = Q[head];
            if (revise(problem, D, Xi, Xj)) {
                const di = D[Xi] || EMPTY;
                if (di.length === 0) return false;
                const nbs = N[Xi] || EMPTY;
                for (let k = 0; k < nbs.length; k++) {
                    const Xk = nbs[k];
                    if (Xk !== Xj) Q.push([Xk, Xi]);
                }
            }
        }
        return true;
    };

    const revise = (problem, D, Xi, Xj) => {
        const C  = problem.constraints;
        const Di = D[Xi] || EMPTY;
        const Dj = D[Xj] || EMPTY;
        if (Di.length === 0 || Dj.length === 0) return false;

        let revised = false;
        const keep = [];

        outer:
            for (let i = 0; i < Di.length; i++) {
                const x = Di[i];
                for (let j = 0; j < Dj.length; j++) {
                    if (C(Xi, x, Xj, Dj[j])) { keep.push(x); continue outer; }
                }
                revised = true; // no support in Dj for x
            }

        if (revised) D[Xi] = keep;
        return revised;
    };

    // ---------- Utilities ----------
    const cloneDomains = (D) => {
        const out = {};
        for (const k in D) out[k] = [...D[k]];
        return out;
    };

    const isComplete = (A, vars) => {
        for (let i = 0; i < vars.length; i++) if (!(vars[i] in A)) return false;
        return true;
    };

    const EMPTY = [];

    // ---------- Expose ----------
    return { solve };
};


/*
USAGE EXAMPLES (copy/modify in your app)

const australia = {
  variables: ['WA','NT','SA','Q','NSW','V','T'],
  domains: { WA:['red','green','blue'], NT:['red','green','blue'], SA:['red','green','blue'],
             Q:['red','green','blue'], NSW:['red','green','blue'], V:['red','green','blue'], T:['red','green','blue'] },
  neighbors: {
    WA:['NT','SA'], NT:['WA','SA','Q'], SA:['WA','NT','Q','NSW','V'],
    Q:['NT','SA','NSW'], NSW:['Q','SA','V'], V:['SA','NSW'], T:[]
  },
  constraints: (A,a,B,b) => a !== b
};

const chain = {
  variables:['X','Y','Z'],
  domains:{ X:[1,2,3], Y:[1,2,3], Z:[1,2,3] },
  neighbors:{ X:['Y'], Y:['X','Z'], Z:['Y'] },
  constraints:(A,a,B,b)=>a!==b
};
*/
