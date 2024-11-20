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

    const flee = (vehicle, target) => {
        // Use the seek behavior and negate the resulting force
        const seekSteer = seek(vehicle, target);
        vec2.scale(seekSteer, seekSteer, -1);  // Negate the seek force to create a flee behavior
        return seekSteer;
    };

    const pursuit = (vehicle, targetVehicle) => {
        const targetPos = vec2.clone(targetVehicle.getPosition());
        const targetVel = vec2.clone(targetVehicle.getVelocity());

        // Calculate the distance between the vehicles
        const toTarget = vec2.create();
        vec2.sub(toTarget, targetPos, vehicle.getPosition());
        const distance = vec2.length(toTarget);

        // Estimate the prediction time (time to reach the target's current position)
        const speed = vec2.length(vehicle.getVelocity());
        const predictionTime = speed > 0 ? distance / speed : 0;

        // Predict the future position of the target
        const predictedTarget = vec2.create();
        vec2.scaleAndAdd(predictedTarget, targetPos, targetVel, predictionTime);

        // Seek the predicted target position
        return seek(vehicle, predictedTarget);
    };

    const evade = (vehicle, targetVehicle) => {
        // Evade uses the same logic as pursuit but inverts the direction
        const pursuitSteer = pursuit(vehicle, targetVehicle);
        vec2.scale(pursuitSteer, pursuitSteer, -1);  // Negate the pursuit force to create an evade behavior
        return pursuitSteer;
    };

    const wander = (vehicle, wanderRadius = 5, wanderDistance = 10, wanderJitter = 0.1) => {
        const wanderTarget = vec2.create();
        vec2.random(wanderTarget, wanderRadius);  // Generate a random vector within the circle defined by wanderRadius

        // Project the wander target ahead of the vehicle
        const vehicleHeading = vec2.clone(vehicle.getVelocity());
        if (vec2.length(vehicleHeading) > 0) {
            vec2.normalize(vehicleHeading, vehicleHeading);
            vec2.scale(vehicleHeading, vehicleHeading, wanderDistance);
            vec2.add(wanderTarget, wanderTarget, vehicleHeading);
        }

        // Add some random jitter to the wander target
        wanderTarget[0] += sk.random(-wanderJitter, wanderJitter);
        wanderTarget[1] += sk.random(-wanderJitter, wanderJitter);

        // Seek the wander target
        return seek(vehicle, wanderTarget);
    };



    return {
        seek,
        flee,
        pursuit,
        evade,
        wander
    };
};