export const createODESystem = (numEqns) => {
    const q = Array(numEqns).fill(0); // Array of dependent variables
    let s = 0;                        // Independent variable

    return {
        getNumEqns: () => numEqns,
        getS: () => s,
        getQ: (index) => q[index],
        getAllQ: () => [...q],       // Return a copy of dependent variables
        setS: (value) => s = value,
        setQ: (value, index) => q[index] = value,
    };
};
