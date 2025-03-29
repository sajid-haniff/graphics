import { V } from '../lib/esm/V';

export const createSteeringBehaviors = (sk, maxSpeed, maxForce) => {

    // Seek Behavior
    const seek = (vehicle, target) => {
        const desired = V.sub(target, vehicle.getPosition());
        const distance = V.length(desired);

        const speed = distance < 10 ? sk.map(distance, 0, 100, 0, maxSpeed) : maxSpeed;
        const desiredVelocity = V.scale(V.normalize(desired), speed);

        const steer = V.limit(V.sub(desiredVelocity, vehicle.getVelocity()), maxForce);
        return steer;
    };

    // Flee Behavior (Inverse of Seek)
    const flee = (vehicle, target) => V.scale(seek(vehicle, target), -1);

    // Enhanced Flee with Randomness
    const fleeX = (vehicle, target, fleeDistance = 100, wanderJitter = 0.5) => {
        const desired = V.sub(vehicle.getPosition(), target);
        desired[0] += sk.random(-wanderJitter, wanderJitter);
        desired[1] += sk.random(-wanderJitter, wanderJitter);

        if (V.length(desired) > fleeDistance) return V.zero();

        const desiredVelocity = V.scale(V.normalize(desired), maxSpeed);
        return V.limit(V.sub(desiredVelocity, vehicle.getVelocity()), maxForce);
    };

    // Pursuit Behavior (Predicting Target's Future Position)
    const pursuit = (vehicle, targetVehicle) => {
        const toTarget = V.sub(targetVehicle.getPosition(), vehicle.getPosition());
        const predictionTime = V.length(vehicle.getVelocity()) > 0 ? V.length(toTarget) / V.length(vehicle.getVelocity()) : 0;

        const predictedTarget = V.add(
            targetVehicle.getPosition(),
            V.scale(targetVehicle.getVelocity(), predictionTime)
        );

        return seek(vehicle, predictedTarget);
    };

    // Evade Behavior (Inverse of Pursuit)
    const evade = (vehicle, targetVehicle) => V.scale(pursuit(vehicle, targetVehicle), -1);

    // Persistent Wander Target
    const wanderTarget = V.create(10, 0);

    // Wander Behavior
    const wander = (vehicle, wanderRadius = 10, wanderDistance = 30, wanderJitter = 2.8) => {
        // Apply jitter to wanderTarget
        wanderTarget[0] += sk.random(-wanderJitter, wanderJitter);
        wanderTarget[1] += sk.random(-wanderJitter, wanderJitter);

        // Keep wanderTarget on the circle
        V.set(wanderTarget, ...V.scale(V.normalize(wanderTarget), wanderRadius));

        // Project the wander target ahead of the vehicle
        const vehicleHeading = V.scale(V.normalize(vehicle.getVelocity()), wanderDistance);
        const circleCenter = V.add(vehicle.getPosition(), vehicleHeading);
        const worldTarget = V.add(circleCenter, wanderTarget);

        drawWanderDebug(sk, vehicle, worldTarget, circleCenter, wanderRadius);

        return seek(vehicle, worldTarget);
    };

    // Debug Visualization for Wander
    const drawWanderDebug = (sk, vehicle, worldTarget, circleCenter, wanderRadius) => {
        const position = vehicle.getPosition();
        const velocity = vehicle.getVelocity();

        sk.push();
        sk.stroke(100, 100, 255);
        sk.noFill();
        sk.ellipse(circleCenter[0], circleCenter[1], wanderRadius * 2, wanderRadius * 2);

        sk.fill(255, 0, 0);
        sk.ellipse(worldTarget[0], worldTarget[1], 4, 4);

        sk.stroke(0, 255, 0);
        sk.line(position[0], position[1], worldTarget[0], worldTarget[1]);

        const velocityEnd = V.add(position, V.scale(velocity, 10));
        sk.stroke(255, 255, 0);
        sk.line(position[0], position[1], velocityEnd[0], velocityEnd[1]);
        sk.pop();
    };

    return { seek, flee, fleeX, pursuit, evade, wander };
};
