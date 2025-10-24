import { createGraphicsContext2 } from '../../graphics_context2';
import { createShip } from './ship';
import { createAsteroid } from './asteroid';
import { skKeyMap } from './utils';

export const createAsteroidsDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 480) => {
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const objects = [];
    const input = skKeyMap(sk);
    let score = 0;
    let gameOver = false;

    const ship = createShip(sk, input, () => {
        gameOver = true;
    });

    objects.push(ship);

    for (let i = 0; i < 4; i++) {
        const a = createAsteroid(sk, 80);
        objects.push(a);
    }

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.colorMode(sk.RGB);
        },
        display() {
            sk.background(0);
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            for (let i = objects.length - 1; i >= 0; i--) {
                const obj = objects[i];
                obj.update?.(objects);
                obj.draw?.(sk);
                if (obj.isDead?.()) objects.splice(i, 1);
            }

            if (!gameOver && !objects.find(o => o.tag === 'asteroid')) {
                for (let i = 0; i < 4; i++) {
                    const a = createAsteroid(sk, 80);
                    objects.push(a);
                }
            }
        }
    };
};
