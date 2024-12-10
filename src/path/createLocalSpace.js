import * as vec2 from '../lib/esm/vec2';

export const createLocalSpace = (pos = vec2.create(), vel = vec2.create(), mass = 3, maxTurnRate = Math.PI / 10) => {
    let position = pos;
    let velocity = vel;

    // Function to calculate the heading based on the velocity
    const heading = () => {
        return Math.atan2(velocity[1], velocity[0]);  // atan2(y, x)
    };

    // Function to update the position and velocity
    const update = (steer, maxSpeed, deltaTime = 1) => {
        // Calculate acceleration: a = F / m
        const acceleration = vec2.create();
        vec2.scale(acceleration, steer, 1 / mass);

        // Update velocity: v = v + a * deltaTime
        vec2.scale(acceleration, acceleration, deltaTime);
        vec2.add(velocity, velocity, acceleration);

        // Limit velocity to maxSpeed
        if (vec2.length(velocity) > maxSpeed) {
            vec2.normalize(velocity, velocity);  // Normalize the velocity vector
            vec2.scale(velocity, velocity, maxSpeed);  // Scale it to the maxSpeed
        }

        // Apply maximum turn rate constraint
        const currentHeading = Math.atan2(velocity[1], velocity[0]);  // Current direction
        const desiredHeading = Math.atan2(acceleration[1] + velocity[1], acceleration[0] + velocity[0]);  // Desired direction based on new velocity

        let angleDifference = desiredHeading - currentHeading;

        // Ensure angleDifference is within [-PI, PI]
        if (angleDifference > Math.PI) {
            angleDifference -= 2 * Math.PI;
        } else if (angleDifference < -Math.PI) {
            angleDifference += 2 * Math.PI;
        }

        // Clamp the turn rate to the maximum allowed
        if (Math.abs(angleDifference) > maxTurnRate) {
            angleDifference = Math.sign(angleDifference) * maxTurnRate;
        }

        // Compute the new heading after clamping
        const newHeading = currentHeading + angleDifference;

        // Update the velocity to match the new heading while preserving speed
        const speed = vec2.length(velocity);
        velocity[0] = speed * Math.cos(newHeading);
        velocity[1] = speed * Math.sin(newHeading);

        // Update position: p = p + v * deltaTime
        vec2.add(position, position, vec2.scale(vec2.create(), velocity, deltaTime));
    };

    // Function to set a new position
    const setPosition = (newPos) => {
        vec2.copy(position, newPos);  // Copy new position into the position vector
    };

    // Expose public methods and variables through closure
    return {
        getPosition: () => position,  // Expose current position
        getVelocity: () => velocity,  // Expose current velocity
        heading,                      // Expose heading function
        update,                       // Expose update function
        setPosition                   // Expose setPosition function
    };
};
