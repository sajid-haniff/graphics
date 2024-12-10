export const boundaries = (vehicle, windowLeft = -100, windowRight = 100, windowTop = 100, windowBottom = -100, buffer = 5) => {
    const position = vehicle.getPosition();

    // Apply wrap-around with a buffer zone
    if (position[0] < windowLeft - buffer) {
        position[0] = windowRight + buffer;
    } else if (position[0] > windowRight + buffer) {
        position[0] = windowLeft - buffer;
    }

    if (position[1] < windowBottom - buffer) {
        position[1] = windowTop + buffer;
    } else if (position[1] > windowTop + buffer) {
        position[1] = windowBottom - buffer;
    }

    // Update the vehicle's position directly
    vehicle.setPosition(position);

    // Optional: Add visual debugging for the boundary
    if (vehicle.debugMode) {
        console.log(`Vehicle position adjusted to: [${position[0]}, ${position[1]}]`);
    }
};



