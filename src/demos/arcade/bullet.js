import { wrap } from './utils';
import { neonDot } from './neon';

export const createBullet = (sk, startPos, dirVec, THEME, pixelToWorld, win, speed = 0.5, life = 60) => {
    const position = sk.createVector(startPos.x, startPos.y);
    const velocity = sk.createVector(dirVec.x * speed, dirVec.y * speed);
    let frames = life;

    return {
        position,
        update() {
            position.add(velocity);
            position.x = wrap(position.x, win.left, win.right);
            position.y = wrap(position.y, win.bottom, win.top);
            frames -= 1;
        },
        draw() {
            sk.push();
            sk.translate(position.x, position.y);
            neonDot(sk, 1, THEME.bullet, pixelToWorld);
            sk.pop();
        },
        dead() { return frames <= 0; }
    };
};
