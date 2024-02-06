// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Importing createVector if it's from a separate module, assuming p5.js or similar
// import { createVector } from 'some-library';

export const CannonBall = (x, y) => {
    let position = createVector(x, y);
    let velocity = createVector();
    let acceleration = createVector();
    const r = 8;
    const topspeed = 10;

    // Standard Euler integration
    const update = () => {
        velocity.add(acceleration);
        velocity.limit(topspeed);
        position.add(velocity);
        acceleration.mult(0);
    };

    const applyForce = (force) => {
        acceleration.add(force);
    };

    const display = () => {
        stroke(0);
        strokeWeight(2);
        push();
        translate(position.x, position.y);
        ellipse(0, 0, r * 2, r * 2);
        pop();
    };

    return { update, applyForce, display };
};
