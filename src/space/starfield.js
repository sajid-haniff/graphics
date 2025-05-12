import { createGraphicsContext2 } from '../graphics_context2';

export const createStarfieldDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {
    const win = {
        left: -CANVAS_WIDTH / 2,
        right: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        bottom: -CANVAS_HEIGHT / 2
    };
    let view = { left: 0.1, right: 0.9, top: 0.9, bottom: 0.1 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const NUM_STARS = 800;
    const stars = [];

    const createStar = () => {
        let x = sk.random(-CANVAS_WIDTH, CANVAS_WIDTH);
        let y = sk.random(-CANVAS_HEIGHT, CANVAS_HEIGHT);
        let z = sk.random(CANVAS_WIDTH);
        let pz = z;

        return {
            update(speed) {
                z -= speed;
                if (z < 1) {
                    z = CANVAS_WIDTH;
                    x = sk.random(-CANVAS_WIDTH, CANVAS_WIDTH);
                    y = sk.random(-CANVAS_HEIGHT, CANVAS_HEIGHT);
                    pz = z;
                }
            },
            draw() {
                const sx = sk.map(x / z, -1, 1, -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2);
                const sy = sk.map(y / z, -1, 1, -CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2);
                const r = sk.map(z, 0, CANVAS_WIDTH, 16, 0);

                sk.noStroke();
                sk.fill(255);
                sk.ellipse(sx, sy, r, r);

                const px = sk.map(x / pz, -1, 1, -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2);
                const py = sk.map(y / pz, -1, 1, -CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2);

                sk.stroke(255);
                sk.line(px, py, sx, sy);

                pz = z;
            }
        };
    };

    for (let i = 0; i < NUM_STARS; i++) {
        stars.push(createStar());
    }

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);
        },
        display() {
            const speed = sk.map(sk.mouseX, 0, CANVAS_WIDTH, 0, 50);

            // Reset transform
            sk.resetMatrix();

            // Standard transformation pipeline
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT); // Flip Y
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0); // Normalize
            sk.applyMatrix(sx, 0, 0, sy, tx, ty); // Viewport

            sk.background(0);

            for (let i = 0; i < NUM_STARS; i++) {
                stars[i].update(speed);
                stars[i].draw();
            }
        }
    };
};
