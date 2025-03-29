import {V} from '../lib/esm/V.js';
import {createLocalSpace} from './createLocalSpace';
import {createSteeringBehaviors} from './steeringBehavior';
import {boundaries} from './boundaries';

export const createVehicle = (sk, pos = V.create(), maxSpeed = 2, maxForce = 0.01, behaviorType = 'seek', color = [127, 127, 7]) => {
    const localSpace = createLocalSpace(pos, V.zero());  // Initialize position and velocity

    const steeringBehaviors = createSteeringBehaviors(sk, maxSpeed, maxForce);  // Initialize steering behaviors

    // Select the appropriate steering behavior
    const selectBehavior = (type, vehicle, target) => {
        const behavior = steeringBehaviors[type];
        if (!behavior) {
            console.warn(`Unknown behavior type: ${type}`);
            return V.zero();
        }

        // Handle wander separately if parameters are needed
        if (type === 'wander') return behavior(vehicle, 10, 40, 3.8);

        return behavior(vehicle, target);
    };

    // Update vehicle's position and velocity
    const update = (target) => {
        const steer = selectBehavior(behaviorType, localSpace, target);

        localSpace.update(steer, maxSpeed);  // Update position and velocity based on steering

        // Handle screen boundaries
        boundaries(localSpace, -100, 100, 100, -100);
    };

    // Display the vehicle (triangle pointing in the direction of movement)
    const display = () => {
        sk.push();
        sk.translate(localSpace.getPosition()[0], localSpace.getPosition()[1]);
        sk.rotate(localSpace.heading());  // Rotate to face the direction of velocity

        sk.fill(...color);
        sk.stroke(200);
        sk.triangle(14, 0, 0, -3, 0, 3);

        sk.pop();
    };

    return {
        update,
        display,
        getPosition: () => localSpace.getPosition(),
        getVelocity: () => localSpace.getVelocity(),
        getHeading: () => localSpace.heading()
    };
};
