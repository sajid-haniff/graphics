import * as p5 from '../../../lib/p5';


export const createVehicle = (sk, x, y, mass) => {
    let radius = mass * 8;
    let position = sk.createVector(x, y);
    let angle = 0;
    let aVelocity = 0;
    let aAcceleration = 0;
    let velocity = sk.createVector(sk.random(-1, 1), sk.random(-1, 1));
    let acceleration = sk.createVector(0, 0);

    const applyForce = (force) => {
        let f = p5.Vector.div(force, mass);
        acceleration.add(f);
    };

    const update = () => {
        velocity.add(acceleration);
        position.add(velocity);
        aAcceleration = acceleration.x / 10.0;
        aVelocity += aAcceleration;
        aVelocity = sk.constrain(aVelocity, -0.1, 0.1);
        angle += aVelocity;
        acceleration.mult(0);
    };

    const display = () => {
        sk.stroke(0);
        sk.fill(175, 200);
        sk.rectMode(sk.CENTER);
        sk.push();
        sk.translate(position.x, position.y);
        sk.rotate(angle);
        sk.ellipse(0, 0, radius * 2);
        sk.line(0, 0, radius, 0);
        sk.pop();
    };

    return { applyForce, update, display, position };
};


