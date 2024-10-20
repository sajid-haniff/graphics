import { createGraphicsContext2 } from '../graphics_context2';

export const createCurvedGridDemo = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {
    // Define the drawing area and viewport
    let win = { left: -100, right: 100, top: 100, bottom: -100 };
    let view = { left: 0.1, right: 0.9, top: 0.9, bottom: 0.1 };

    // Create a graphics context for drawing
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    return {
        setup: () => {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.noLoop();  // Draw only once
            sk.background(0);  // Black background
        },

        display: () => {
            // Apply custom transformations
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.stroke(0, 255, 0); // Green lines
            sk.noFill();
            let gridSize = 20;

            for (let i = -100; i <= 100; i += gridSize) {
                sk.beginShape();
                for (let j = -100; j <= 100; j += gridSize) {
                    // Create curvature by using a bezier vertex depending on i and j values
                    let x1 = i;
                    let y1 = j;
                    let x2 = i * Math.cos(j * 0.1);
                    let y2 = j * Math.sin(i * 0.1);
                    sk.vertex(x1, y1);
                    sk.bezierVertex(x1, y1, x2, y2, x2, y2);
                }
                sk.endShape();
            }

            // Draw the same along the other axis for symmetry
            for (let j = -100; j <= 100; j += gridSize) {
                sk.beginShape();
                for (let i = -100; i <= 100; i += gridSize) {
                    let x1 = i;
                    let y1 = j;
                    let x2 = i * Math.cos(j * 0.1);
                    let y2 = j * Math.sin(i * 0.1);
                    sk.vertex(x1, y1);
                    sk.bezierVertex(x1, y1, x2, y2, x2, y2);
                }
                sk.endShape();
            }
        }
    };
};
