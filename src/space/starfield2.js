import { createGraphicsContext2 } from '../graphics_context2';
import { computeStandardTransform } from '../computeStandardTransform.js';

export const createStarfieldDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {
    const win = {
        left: -CANVAS_WIDTH / 2,
        right: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        bottom: -CANVAS_HEIGHT / 2
    };
    const view = { left: 0.1, right: 0.9, top: 0.9, bottom: 0.1 };

    const NUM_STARS = 800;
    const stars = [];
    const maxZ = CANVAS_WIDTH;
    let matrix;

    const createStar = () => {
        let x = sk.random(-CANVAS_WIDTH, CANVAS_WIDTH);
        let y = sk.random(-CANVAS_HEIGHT, CANVAS_HEIGHT);
        let z = sk.random(maxZ);
        let pz = z;

        return {
            update(speed) {
                z -= speed;
                if (z < 1) {
                    z = maxZ;
                    x = sk.random(-CANVAS_WIDTH, CANVAS_WIDTH);
                    y = sk.random(-CANVAS_HEIGHT, CANVAS_HEIGHT);
                    pz = z;
                }
            },
            draw() {
                const sx = sk.map(x / z, -1, 1, -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2);
                const sy = sk.map(y / z, -1, 1, -CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2);
                const r = sk.map(z, 0, maxZ, 8, 0.5);

                const hue = sk.map(z, 0, maxZ, 180, 0); // 180 (blue) → 0 (red)
                const sat = 255;
                const bri = sk.map(z, 0, maxZ, 255, 80);

                sk.colorMode(sk.HSB);
                sk.stroke(hue, sat, bri);
                sk.fill(hue, sat, bri, 180); // Semi-glow
                sk.strokeWeight(1.2);
                sk.ellipse(sx, sy, r, r);

                const px = sk.map(x / pz, -1, 1, -CANVAS_WIDTH / 2, CANVAS_WIDTH / 2);
                const py = sk.map(y / pz, -1, 1, -CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2);

                sk.stroke(hue, sat, bri, 180);
                sk.line(px, py, sx, sy);

                sk.colorMode(sk.RGB);
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
            sk.colorMode(sk.RGB);
            sk.background(0);
            matrix = computeStandardTransform(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);
        },
        display() {
            const speed = sk.map(sk.mouseX, 0, CANVAS_WIDTH, 0, 40);

            sk.resetMatrix();
            sk.applyMatrix(...matrix);

            // Motion blur: leave trails
            sk.noStroke();
            sk.fill(0, 30); // translucent black background for trails
            sk.rect(win.left, win.bottom, win.right - win.left, win.top - win.bottom);

            for (let i = 0; i < NUM_STARS; i++) {
                stars[i].update(speed);
                stars[i].draw();
            }
        }
    };
};
