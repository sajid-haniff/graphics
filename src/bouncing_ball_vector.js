import {createGraphicsContext} from "./graphics_context";

export const sketchBuilder = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

    let position = sk.createVector(100, 100);
    let velocity = sk.createVector(2.5, 7);

    /* setup drawing area */
    let win  = { left: -100, right: 100, top: 100, bottom: -100}
    let view = { left:   0, right:  1, top:  1, bottom:   0}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');
            sk.background(40);

        },
        draw: () => {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);


            //sk.drawingContext.transform(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            //sk.drawingContext.transform(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            //sk.drawingContext.transform(sx, 0, 0, sy, tx, ty);

            // Add the current speed to the position.
            position.add(velocity);

            if ((position.x > win.right) || (position.x < win.left)) {
                velocity.x = velocity.x * -1;
            }
            if ((position.y > win.top) || (position.y < win.bottom)) {
                velocity.y = velocity.y * -1;
            }

            // Display circle at x position
            sk.stroke(0);
            sk.strokeWeight(2);
            sk.fill(127);
            sk.ellipse(position.x, position.y, 48, 48);

        }
    }
}
