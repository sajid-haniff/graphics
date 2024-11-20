

export const boundaries = (vehicle, windowLeft = -90, windowRight = 90, windowTop = 90, windowBottom = 90, d = 10) => {
    const position = vehicle.getPosition();

    // Check x-axis boundaries and wrap around
    if (position[0] < windowLeft) {
        position[0] = windowRight;
    } else if (position[0] > windowRight) {
        position[0] = windowLeft;
    }

    // Check y-axis boundaries and wrap around
    if (position[1] < windowBottom) {
        position[1] = windowTop;
    } else if (position[1] > windowTop) {
        position[1] = windowBottom;
    }

    // Update the vehicle's position directly
    vehicle.setPosition(position);
};
