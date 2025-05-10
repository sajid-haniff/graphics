import { createGraphicsContext2 } from '../graphics_context2';
import { assets } from './library/utilities';

export const createLoadImagesDemo = (sk, CANVAS_WIDTH = 256, CANVAS_HEIGHT = 256) => {
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0, right: 1, top: 1, bottom: 0 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    let tigerImage = null;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.noLoop();

            const imagePaths = [
                'images/cat.png',
                'images/hedgehog.png',
                'images/tiger.png'
            ];

            assets.load(imagePaths).then(() => {
                tigerImage = assets.get('images/tiger.png');
                sk.redraw();
            });
        },

        display() {
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(255);
            if (tigerImage) {
                sk.image(tigerImage, 64, 64);
            }
        }
    };
};
