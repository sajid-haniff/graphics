import { createGraphicsContext2 } from '../../graphics_context2'; // Importing the context system

export const createSineWaveDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 360) => {
    // Define window and viewport, using the same pattern as other demos
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };

    // Create the graphics context for drawing
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // Initialize variables for angle and velocity
    let startAngle = 0;
    const angleVel = 0.25;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(51); // Initial background
        },
        display() {  // This method should be 'display' instead of 'draw'

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(51); // Refresh background every frame

            startAngle += 0.015;
            let angle = startAngle;

            // Apply transformations based on the context
            //sk.translate(tx, ty);
            //sk.scale(sx, sy);

            // Loop to draw ellipses across the width of the canvas
            for (let x = 0; x <= CANVAS_WIDTH; x += 24) {
                let y = sk.map(sk.sin(angle), -1, 1, 0, CANVAS_HEIGHT);
                sk.stroke(164);
                sk.fill(255, 50);
                sk.strokeWeight(2);
                sk.ellipse(x, y, 48, 48);
                angle += angleVel;
            }
        }
    };
};
