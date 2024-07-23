export const createCSP = () => {
    const FAILURE = 'FAILURE';
    let stepCounter = 0;

    const solve = (csp) => {

        const {variables, constraints, cb, timeStep = 1} = csp;

        const result = backtrack({}, variables, csp);
        if (result === FAILURE) return result;

        // Unwrap values from array containers.
        for (const key in result) {
            result[key] = result[key][0];
        }
        return result;
    };

    const backtrack = (_assigned, unassigned, csp) => {
        const assigned = {..._assigned};

        if (finished(unassigned)) return assigned;

        const nextKey = selectUnassignedVariable(unassigned);
        const values = orderValues(nextKey, assigned, unassigned, csp);
        const {[nextKey]: _, ...remainingUnassigned} = unassigned;

        for (const value of values) {
            stepCounter++;
            assigned[nextKey] = [value];
            const consistent = enforceConsistency(assigned, remainingUnassigned, csp);
            const newUnassigned = {}, newAssigned = {};
            for (const key in consistent) {
                if (assigned[key]) {
                    newAssigned[key] = [...assigned[key]];
                } else {
                    newUnassigned[key] = [...consistent[key]];
                }
            }
            if (csp.cb) {
                setTimeout(() => csp.cb(newAssigned, newUnassigned, csp), stepCounter * csp.timeStep);
            }
            if (anyEmpty(consistent)) continue;
            const result = backtrack(newAssigned, newUnassigned, csp);
            if (result !== FAILURE) return result;
        }
        return FAILURE;
    };

    const finished = (unassigned) => Object.keys(unassigned).length === 0;

    const anyEmpty = (consistent) => Object.values(consistent).some(domain => domain.length === 0);

    const partialAssignment = (assigned, unassigned) => {
        const partial = {};
        Object.entries(unassigned).forEach(([key, value]) => {
            partial[key] = [...value];
        });
        Object.entries(assigned).forEach(([key, value]) => {
            partial[key] = [...value];
        });
        return partial;
    };

    const enforceConsistency = (assigned, unassigned, csp) => {
        const removeInconsistentValues = (head, tail, constraint, variables) => {
            const hv = variables[head], tv = variables[tail];
            const validTailValues = tv.filter(t => hv.some(h => constraint(h, t)));
            const removed = tv.length !== validTailValues.length;
            variables[tail] = validTailValues;
            return removed;
        };

        const incomingConstraints = (node) => csp.constraints.filter(([h,]) => h === node);

        let queue = [...csp.constraints];
        const variables = partialAssignment(assigned, unassigned);
        while (queue.length) {
            const [head, tail, constraint] = queue.shift();
            if (removeInconsistentValues(head, tail, constraint, variables)) {
                queue = queue.concat(incomingConstraints(tail));
            }
        }
        return variables;
    };

    /*
    const selectUnassignedVariable = (unassigned) => {
        // Convert the unassigned object into an array of [key, values] pairs
        const entries = Object.entries(unassigned);

        // Find the minimum length of the values arrays
        const minLength = Math.min(...entries.map(([, values]) => values.length));

        // Find the key corresponding to the minimum length
        const [minKey] = entries.find(([, values]) => values.length === minLength);

        return minKey;
    };

// Example usage
    const unassigned = {
        X: [1, 2, 3],
        Y: [1, 2],
        Z: [1, 2, 3, 4]
    };
*/

    const selectUnassignedVariable = (unassigned) => {
        const entries = Object.entries(unassigned);
        const [minKey] = entries.reduce((acc, [key, values]) => {
            if (values.length < acc[1].length) {
                return [key, values];
            }
            return acc;
        }, entries[0]);
        return minKey;
    };

    const orderValues = (nextKey, assigned, unassigned, csp) => {
        const countValues = vars => Object.values(vars).reduce((sum, vals) => sum + vals.length, 0);

        const valuesEliminated = (val) => {
            assigned[nextKey] = [val];
            const newLength = countValues(enforceConsistency(assigned, unassigned, csp));
            delete assigned[nextKey];
            return newLength;
        };

        const cache = {};
        const values = unassigned[nextKey];
        values.forEach(val => {
            cache[val] = valuesEliminated(val);
        });

        return values.sort((a, b) => cache[b] - cache[a]);
    };

    return {solve};
};

// Export the factory function as a module if in a Node.js environment
if (typeof module === 'object' && module.exports) {
    module.exports = createCSP;
}

// Example usage
const csp = createCSP();
const problem = {
    variables: {
        X: [1, 2, 3],
        Y: [1, 2, 3],
        Z: [1, 2, 3],
    },
    constraints: [
        ['X', 'Y', (x, y) => x !== y],
        ['Y', 'Z', (y, z) => y !== z],
    ],
    cb: (assigned, unassigned, csp) => console.log(assigned, unassigned),
    timeStep: 1000,
};

const solution = csp.solve(problem);
console.log('Solution:', solution);
