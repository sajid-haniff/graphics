import { createPolygon } from './polygon';
import { randomAsteroidShape } from './utils';

export const createAsteroid = (sk, radius) => {
    const points = randomAsteroidShape(sk, radius);
    const a = createPolygon({
        sk,
        points,
        color: '#0F0',
        size: radius / 1000,
        position: {
            x: sk.random(),
            y: sk.random()
        },
        velocity: sk.createVector(sk.random(-0.002, 0.002), sk.random(-0.002, 0.002)),
        tag: 'asteroid'
    });

    a.update = () => {
        a.position.x += a.velocity.x;
        a.position.y += a.velocity.y;

        if (a.position.x > 1) a.position.x = 0;
        if (a.position.x < 0) a.position.x = 1;
        if (a.position.y > 1) a.position.y = 0;
        if (a.position.y < 0) a.position.y = 1;
    };

    return a;
};
