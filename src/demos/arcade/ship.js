import { rotatePoint } from './utils';
import { createBullet } from './bullet';
import { createPolygon } from './polygon';

export const createShip = (sk, input, onDeath) => {
    const ship = createPolygon({
        sk,
        points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: -20 },
            { x: -10, y: 10 }
        ],
        color: '#0F0',
        position: { x: 0.5, y: 0.5 },
        size: 0.05,
        tag: 'ship'
    });

    let rotation = 0;
    let velocity = sk.createVector(0, 0);
    const rotationSpeed = 5;
    const thrust = 0.0025;
    const friction = 0.985;
    let lastShot = 0;

    ship.update = (objects) => {
        if (input.left()) rotation -= rotationSpeed;
        if (input.right()) rotation += rotationSpeed;

        if (input.forward()) {
            const angle = -sk.radians(rotation);
            velocity.x += Math.sin(angle) * thrust;
            velocity.y += Math.cos(angle) * thrust;
        }

        ship.position.x += velocity.x;
        ship.position.y += velocity.y;

        velocity.mult(friction);

        if (ship.position.x > 1) ship.position.x = 0;
        if (ship.position.x < 0) ship.position.x = 1;
        if (ship.position.y > 1) ship.position.y = 0;
        if (ship.position.y < 0) ship.position.y = 1;

        if (input.fire() && sk.millis() - lastShot > 300) {
            objects.push(createBullet(sk, ship.position, rotation));
            lastShot = sk.millis();
        }

        // Collision
        for (const obj of objects) {
            if (obj.tag === 'asteroid') {
                const d = sk.dist(ship.position.x, ship.position.y, obj.position.x, obj.position.y);
                if (d < 0.05) {
                    ship.dead = true;
                    onDeath();
                }
            }
        }
    };

    ship.draw = (sk) => {
        sk.push();
        sk.translate(ship.position.x, ship.position.y);
        sk.rotate(sk.radians(rotation));
        sk.stroke(ship.color);
        sk.noFill();
        sk.beginShape();
        for (const pt of ship.points) sk.vertex(pt.x * ship.size, pt.y * ship.size);
        sk.endShape(sk.CLOSE);
        sk.pop();
    };

    ship.isDead = () => ship.dead;

    return ship;
};
