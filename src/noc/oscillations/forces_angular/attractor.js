import p5 from '../../../lib/p5';

export const createAttractor = sk => {
    let position = sk.createVector(0, 0);
    let mass = 20;
    let G = 1;

    const attract = (mover) => {
        // Calculate direction of force
        let force = p5.Vector.sub(position, mover.position);
        // Distance between objects
        let distance = force.mag();
        // Limiting the distance to eliminate "extreme" results for very close or very far objects
        distance = sk.constrain(distance, 5, 25);
        // Calculate gravitational force magnitude
        let strength = (G * mass * mover.mass) / (distance ** 2);
        // Get force vector --> magnitude * direction
        force.setMag(strength);

        return force;
    };

    const display = () => {

        sk.ellipseMode(sk.CENTER);
        sk.stroke(0);
        sk.fill(175, 200, 8);
        sk.ellipse(position.x, position.y, mass * 2);
    };

    return { attract, display };
};


