// Runge-Kutta 4th-order solver for ODE systems
export const rungeKutta4 = (ode, ds) => {
    const numEqns = ode.getNumEqns();
    const s = ode.getS();
    const q = ode.getAllQ();

    // Compute the four Runge-Kutta steps
    const dq1 = ode.getRightHandSide(s, q, q, ds, 0.0);
    const dq2 = ode.getRightHandSide(s + 0.5 * ds, q, dq1, ds, 0.5);
    const dq3 = ode.getRightHandSide(s + 0.5 * ds, q, dq2, ds, 0.5);
    const dq4 = ode.getRightHandSide(s + ds, q, dq3, ds, 1.0);

    // Update the independent variable `s`
    ode.setS(s + ds);

    // Update the dependent variables `q`
    for (let j = 0; j < numEqns; j++) {
        q[j] += (dq1[j] + 2 * dq2[j] + 2 * dq3[j] + dq4[j]) / 6;
        ode.setQ(q[j], j);
    }
};