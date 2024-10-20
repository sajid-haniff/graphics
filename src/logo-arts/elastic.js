import { createGraphicsContext2 } from '../graphics_context2';

export const createLogoDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {
    const win = { left: -CANVAS_WIDTH / 2, right: CANVAS_WIDTH / 2, top: CANVAS_HEIGHT / 2, bottom: -CANVAS_HEIGHT / 2 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // Setting up initial variables
    const dotSize = 4; // size for the Dust function

    // Define the object with methods
    const logoDemo = {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);  // Set screen color to black (SetSC Black)
            //sk.noLoop(); // Prevent continuous looping
        },

        display() {
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            // Reset the drawing context
            sk.background(0);  // Set screen color to black
            sk.stroke(0, 255, 0);  // Set pen color to green
            sk.strokeWeight(1);  // Set pen size to 1

            logoDemo.dust(256);   // Correct reference to Dust function
            sk.stroke(255, 0, 0);  // Set pen color to red
            logoDemo.burst(40, 400);  // Correct reference to Burst
            sk.stroke(0, 255, 0);  // Set pen color to green
            logoDemo.net();  // Correct reference to Net function
        },

        dust(n) {
            for (let i = 0; i < n; i++) {
                sk.ellipse(sk.random(-CANVAS_WIDTH / 2, CANVAS_WIDTH / 2), sk.random(-CANVAS_HEIGHT/2, CANVAS_HEIGHT/2), dotSize, dotSize);
            }
        },

        burst(spokes, radius) {
            const angleStep = sk.TWO_PI / spokes;
            for (let i = 0; i < spokes; i++) {
                sk.line(0, 0, sk.cos(i * angleStep) * radius, sk.sin(i * angleStep) * radius);
            }
        }
        ,

        net() {
            for (let angle = 0; angle <= 360; angle += 6) {
                const x1 = 280 * sk.cos(sk.radians(angle));
                const y1 = 0;
                const x2 = 0;
                const y2 = 280 * sk.sin(sk.radians(angle));

                sk.noFill();
                sk.beginShape();
                sk.vertex(x1, y1);
                sk.vertex(x2, y2);
                sk.endShape();

                setTimeout(() => {}, 500);  // Wait for 4 frames
            }
        }
    };

    return logoDemo;
};
