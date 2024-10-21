import {createGraphicsContext} from "../graphics_context";

export const createFractalCircleDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

    /* setup drawing area */
    let win = { left: -100, right: 100, top: 100, bottom: -100 };
    let view = { left: 0, right: 1, top: 1, bottom: 0 };

    const { sx, sy, tx, ty } = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);


    // Recursive Function Explanation:
    // The drawCircle function recursively draws two smaller circles at each level.
    // 1. Base Case: If 'level' reaches 1, the recursion stops (no more circles are drawn).
    // 2. Recursive Case: For each call, the function draws a circle and then calls itself twice:
    //    - One circle is drawn to the left (x - radius / 2).
    //    - Another circle is drawn to the right (x + radius / 2).
    //    With each recursion, the radius and level decrease, creating a fractal-like pattern of circles.

    const drawCircle = (x, radius, level) => {
        const tt = (126 * level) / 4.0;
        sk.fill(tt);
        sk.ellipse(x, 0, radius * 2, radius * 2);
        if (level > 1) {
            // Recursively draw smaller circles
            level = level - 1;
            drawCircle(x - radius / 2, radius / 2, level);
            drawCircle(x + radius / 2, radius / 2, level);
        }
    };

    return {

        setup: () => {
            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');

            sk.pixelDensity(1);
            sk.noStroke();
            sk.background(40);
        },

        display: () => {
            sk.push();
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            // Call the local drawCircle function
            drawCircle(0, 100, 5);

            sk.pop();
        }
    };
};


