import * as vec2 from '../lib/esm/vec2'

export const createLocalSpace = (pos = vec2.create(), vel = vec2.create()) => {
    // We store `position` and `velocity` as local variables in the closure
    let position = pos;
    let velocity = vel;

    // Function to calculate the heading based on the velocity
    const heading = () => {
        return Math.atan2(velocity[1], velocity[0]);  // atan2(y, x)
    };

    // Function to update the position and velocity
    const update = (steer, maxSpeed) => {
        // Add steering force to velocity
        vec2.add(velocity, velocity, steer);

        // Limit velocity to maxSpeed
        if (vec2.length(velocity) > maxSpeed) {
            vec2.normalize(velocity, velocity);  // Normalize the velocity vector
            vec2.scale(velocity, velocity, maxSpeed);  // Scale it to the maxSpeed
        }

        // Update position by adding velocity
        vec2.add(position, position, velocity);
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
