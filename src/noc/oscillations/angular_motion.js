import {createGraphicsContext2} from "../../graphics_context2";

export const sketchBuilder = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

    let angle = 0;
    let aVelocity = 0;
    let aAcceleration = 0.001;


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

            angle += aVelocity;
            aVelocity += aAcceleration;
        },
        display: () => {

            sk.background(40);
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.rotate(angle);

            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(127);

            sk.line(-60, 0, 60, 0)
            sk.ellipse(60, 0, 16, 16);
            sk.ellipse(-60, 0, 16, 16);

        }
    }
}
