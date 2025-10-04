import { createGraphicsContext2 } from '../graphics_context2';
import { assets } from './library/utilities';
import { loadImageFromOrigin } from './library/utilities';


export const createLoadImagesDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 360) => {
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    let tiger = null;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(51);

            assets.load(["images/tiger.png"]).then(() => {
                tiger = assets["images/tiger.png"];
                console.log("Tiger loaded");
            });

        },
        display() {
            // Apply transforms
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(30);

            if (tiger) {
                const ctx2d = sk.drawingContext;
                ctx2d.drawImage(tiger, 0, 64, 64, 64);
            }
            else {
                console.log("Tiger not loaded yet");
            }
        }
    };
};
