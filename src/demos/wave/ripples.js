import { createGraphicsContext2 } from '../../graphics_context2';

export const createRippleWaterDemo = (sk, CANVAS_WIDTH = 320, CANVAS_HEIGHT = 240) => {
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0, right: 1, top: 1, bottom: 0 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const cols = CANVAS_WIDTH;
    const rows = CANVAS_HEIGHT;

    // Two buffers: current and previous height maps
    let current = new Array(cols * rows).fill(0);
    let previous = new Array(cols * rows).fill(0);

    const damping = 0.99;

    // Helper to convert 2D to 1D index
    const idx = (x, y) => y * cols + x;



    const disturb = (x, y, magnitude = 500) => {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const px = x + dx;
                const py = y + dy;
                if (px > 1 && px < cols - 1 && py > 1 && py < rows - 1) {
                    previous[idx(px, py)] = magnitude;
                }
            }
        }
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.pixelDensity(1);
        },

        mousePressed() {
            const x = Math.floor(sk.mouseX);
            const y = Math.floor(sk.mouseY);
            disturb(x, y);
        },

        display() {
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.loadPixels();

            for (let y = 1; y < rows - 1; y++) {
                for (let x = 1; x < cols - 1; x++) {
                    const i = idx(x, y);
                    const val =
                        (
                            previous[idx(x - 1, y)] +
                            previous[idx(x + 1, y)] +
                            previous[idx(x, y - 1)] +
                            previous[idx(x, y + 1)]
                        ) / 2 - current[i];

                    current[i] = val * damping;

                    const brightness = sk.constrain(current[i], -255, 255);
                    const c = sk.color(brightness, brightness, 255);

                    const pix = i * 4;
                    sk.pixels[pix + 0] = sk.red(c);
                    sk.pixels[pix + 1] = sk.green(c);
                    sk.pixels[pix + 2] = sk.blue(c);
                    sk.pixels[pix + 3] = 255;
                }
            }

            sk.updatePixels();

            // Swap buffers
            const temp = previous;
            previous = current;
            current = temp;
        }
    };
};
