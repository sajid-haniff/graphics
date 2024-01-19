import {createGraphicsContext2} from "../../graphics_context2";

export const sketchBuilder = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

    let position     = sk.createVector(0, 100);
    let velocity     = sk.createVector();
    let acceleration = sk.createVector(0.1, -0.1);
    let top_speed = 10;

    /* setup drawing area */
    let win  = { left: -100, right: 100, top: 100, bottom: -100}
    let view = { left:   0, right:  1, top:  1, bottom:   0}

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');
            sk.background(40);

        },
        update: () => {

            velocity.add(acceleration);
            velocity.limit(top_speed);
            position.add(velocity);
        },
        display: () => {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);


            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(127);
            sk.ellipse(position.x, position.y, 48, 48);
        },
        checkEdges: () => {

            if ((position.x > win.right) || (position.x < win.left)) {
                velocity.x = velocity.x * -1;
            }
            if ((position.y > win.top) || (position.y < win.bottom)) {
                velocity.y = velocity.y * -1;
            }
        }
    }
}
