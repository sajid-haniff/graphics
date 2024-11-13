import * as vec2 from '../lib/esm/vec2'

export const createSteeringBehaviors = (sk, maxSpeed, maxForce) => {
    const seek = (vehicle, target) => {
        const desired = vec2.create();
        const steer = vec2.create();

        // Calculate desired = target - position
        vec2.sub(desired, target, vehicle.getPosition());

        // Get the distance between the vehicle's position and the target
        const distance = vec2.length(desired);

        // If we are closer than 100 pixels, adjust the magnitude of the desired vector
        if (distance < 100) {
            // Linearly interpolate the speed based on distance
            const speed = sk.map(distance, 0, 100, 0, maxSpeed);
            vec2.normalize(desired, desired);  // Normalize the direction vector
            vec2.scale(desired, desired, speed);  // Scale the desired velocity based on distance
        } else {
            // Otherwise, proceed at maximum speed
            vec2.normalize(desired, desired);
            vec2.scale(desired, desired, maxSpeed);
        }

        // Calculate steering force = desired - velocity
        vec2.sub(steer, desired, vehicle.getVelocity());

        // Limit the steering force to maxForce
        if (vec2.length(steer) > maxForce) {
            vec2.normalize(steer, steer);
            vec2.scale(steer, steer, maxForce);
        }

        return steer;
    };

    return {
        seek,
    };
};