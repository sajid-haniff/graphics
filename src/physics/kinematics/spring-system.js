import { createODESystem } from './ode-system.js';
import { rungeKutta4 } from './rk4-solver.js';

// Factory to create a spring system (ODE implementation)
export const createSpringSystem = (mass, damping, springConstant, initialPosition) => {
    const numEqns = 2; // 2 equations: position (x) and velocity (v)
    const ode = createODESystem(numEqns);

    // Initialize position and velocity
    ode.setQ(initialPosition, 0); // Initial position x
    ode.setQ(0, 1);               // Initial velocity v

    const getRightHandSide = (s, q, deltaQ, ds, qScale) => {
        const x = q[0] + qScale * deltaQ[0];
        const v = q[1] + qScale * deltaQ[1];

        return [
            ds * v,                               // dx/dt = v
            ds * (-damping * v - springConstant * x) / mass, // dv/dt = (-damping*v - k*x) / m
        ];
    };

    ode.getRightHandSide = getRightHandSide;

    return {
        update: (dt) => rungeKutta4(ode, dt, getRightHandSide),
        getTime: () => ode.getS(),
        getX: () => ode.getQ(0),
        getV: () => ode.getQ(1),
    };
};
