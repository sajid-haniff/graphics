import * as vec2 from '../lib/esm/vec2'
import { createLocalSpace } from './createLocalSpace';  // Import local space factory
import { createSteeringBehaviors } from './steeringBehavior';

export const createVehicle = (sk, pos = vec2.create(), maxSpeed = 5, maxForce = 0.1, behaviorType = 'seek') => {
    const localSpace = createLocalSpace(pos, vec2.create());  // Initialize position and velocity
    let headingAngle = 0;  // Variable to store the heading angle
    const steeringBehaviors = createSteeringBehaviors(sk, maxSpeed, maxForce); // Create behaviors instance

    // Function to select the appropriate steering behavior
    const selectBehavior = (type, vehicle, target) => {
        switch (type) {
            case 'seek':
                return steeringBehaviors.seek(vehicle, target);
            case 'flee':
                return steeringBehaviors.flee ? steeringBehaviors.flee(vehicle, target) : vec2.create();
            case 'arrive':
                return steeringBehaviors.arrive ? steeringBehaviors.arrive(vehicle, target) : vec2.create();
            default:
                console.warn(`Unknown behavior type: ${type}`);
                return vec2.create();  // No steering force if unknown
        }
    };

    // Update vehicle's position and velocity
    const update = (target) => {
        //const steer = seek(target);  // Get the steering force
        //localSpace.update(steer, maxSpeed);  // Update position and velocity based on steering

        const steer = selectBehavior(behaviorType, localSpace, target);  // Get the steering force based on the selected behavior
        localSpace.update(steer, maxSpeed);  // Update position and velocity based on steering

    };

    // Display the vehicle (triangle pointing in the direction of movement)
    const display = () => {
        sk.push();
        //console.log(localSpace.getPosition()[0], localSpace.getPosition()[1])
        //console.log(localSpace.heading())
        sk.translate(localSpace.getPosition()[0], localSpace.getPosition()[1]);
        sk.rotate(localSpace.heading());  // Rotate vehicle to face direction of velocity
        //sk.rotate(headingAngle);  // Rotate vehicle to face direction of velocity
        sk.fill(127);
        sk.stroke(200);
        sk.triangle(14, 0, 0, -3, 0, 3);  // Draw triangle representing vehicle

        sk.stroke(255, 0, 0);  // Red color for the line
        //sk.line(0, 0, localSpace.getVelocity()[0] * 10, localSpace.getVelocity()[1] * 10);

        sk.pop();
    };

    return {
        update,
        display
    };
};
