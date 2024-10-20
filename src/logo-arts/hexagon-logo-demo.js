import {createGraphicsContext2} from "../graphics_context2";

export const createHexagonLogoDemo = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

    // Set up the window and viewport
    let win = { left: -100, right: 100, top: 100, bottom: -100 };
    let view = { left: 0.1, right: 0.9, top: 0.9, bottom: 0.1 };

    // Create a graphics context
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // Helper function to calculate hue based on angle
    const hue = (angle) => {
        const red = Math.round(127 * (1 + Math.cos(angle)));
        const green = Math.round(127 * (1 + Math.cos((120 + angle) * Math.PI / 180)));
        const blue = Math.round(127 * (1 + Math.cos((240 + angle) * Math.PI / 180)));
        return [red, green, blue];
    };

    // Recursive hexagon drawing function
    const hexagon = (side) => {
        if (side < 2) return;

        sk.stroke(...hue(3 * sk.dist(0, 0, sk.mouseX, sk.mouseY)));
        sk.strokeWeight(1);
        sk.beginShape();
        for (let i = 0; i < 6; i++) {
            let angle = sk.radians(60 * i);
            let x = sk.cos(angle) * side;
            let y = sk.sin(angle) * side;
            sk.vertex(x, y);
        }
        sk.endShape(sk.CLOSE);

        sk.push();
        sk.translate(side / 2, 0);
        sk.rotate(sk.radians(60));
        hexagon(side / 2);
        sk.pop();
    };

    return {
        setup: () => {
            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('hexagon-logo');
            sk.background(0);
            sk.noLoop(); // No continuous drawing loop
        },

        display: () => {
            // Override the default p5.js transformation using applyMatrix
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(0);
            sk.stroke(0, 255, 0);
            sk.noFill();

            // Translate and rotate for hexagon drawing
            sk.translate((win.right + win.left) / 2, (win.top + win.bottom) / 2);
            sk.rotate(sk.radians(30));

            // Draw the hexagon
            hexagon(100);
        }
    };
};
