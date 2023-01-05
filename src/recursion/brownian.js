import {createGraphicsContext} from "../graphics_context";

export const brownianBuilder = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

    /* setup drawing area */
    let win = {left: -100, right: 100, top: 100, bottom: -100}
    let view = {left: 0.5, right: 1.0, top: 1, bottom: 0.5}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    return {

        setup: () => {

            // const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            // canvas.id('canvas');

            sk.pixelDensity(1);
            sk.noStroke();
            // sk.noLoop();
            sk.background(40);

            sk.strokeWeight(0.5);
            sk.stroke(255);
        },
        display: function() {

            sk.push();
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            let hurstExponent = 0.49;
            let scaleFactor = 2 ** (2.0 * hurstExponent)
            this.curve(-100, 0, 100.0, 0, 800, scaleFactor)
            sk.pop()
            sk.noLoop()
        },
        curve: function(x0, y0, x1, y1, variance, scaleFactor) {

            if (( x1 - x0) < 0.1)
            {
                sk.line(x0, y0, x1, y1);
            }
            else
            {
                let xm = (x0 + x1) / 2.0
                let ym = (y0 + y1) / 2.0
                let delta = sk.randomGaussian(0, Math.sqrt(variance))

                this.curve(x0, y0, xm, ym+delta, variance/scaleFactor, scaleFactor)
                this.curve(xm, ym+delta, x1, y1, variance/scaleFactor, scaleFactor)
            }
        }
    }
}
