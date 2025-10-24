import { createPolygon } from './polygon';
import { rotatePoint } from './utils';

export const createBullet = (sk, pos, angleDeg) => {
    const angle = -sk.radians(angleDeg);
    const dir = sk.createVector(Math.sin(angle), Math.cos(angle));
    const velocity = dir.copy().mult(0.01);

    const bullet = createPolygon({
        sk,
        points: [{ x: 0, y: 0 }, { x: 0, y: -0.01 }],
        position: { x: pos.x, y: pos.y },
        velocity,
        color: '#0F0',
        size: 1,
        tag: 'bullet'
    });

    bullet.update = () => {
        bullet.position.x += bullet.velocity.x;
        bullet.position.y += bullet.velocity.y;

        if (
            bullet.position.x < 0 || bullet.position.x > 1 ||
            bullet.position.y < 0 || bullet.position.y > 1
        ) {
            bullet.dead = true;
        }
    };

    bullet.isDead = () => bullet.dead;

    return bullet;
};
