import {createGraphicsContext} from "./graphics_context";

export const sketchBuilder = (sk, CANVAS_WIDTH, CANVAS_HEIGHT) => {

    let x = 100;
    let y = 100;
    let x_speed = 2.5;
    let y_speed = 2;

    /* setup drawing area */
    let win  = { left: -100, right: 100, top: 100, bottom: -100}
    let view = { left:   0, right:  1, top:  1, bottom:   0}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    return {

        draw: (sk) => {

            sk.drawingContext.transform(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.drawingContext.transform(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.drawingContext.transform(sx, 0, 0, sy, tx, ty);



            x = x + x_speed;
            y = y + y_speed;

            if ((x > win.right) || (x < win.left)) {
                x_speed = x_speed * -1;
            }
            if ((y > win.top) || (y < win.bottom)) {
                y_speed = y_speed * -1;
            }

            // Display circle at x position
            sk.stroke(0);
            sk.strokeWeight(2);
            sk.fill(127);
            sk.ellipse(x, y, 48, 48);

        }
    }
}
