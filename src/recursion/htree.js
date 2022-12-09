import {createGraphicsContext} from "../graphics_context";

export const hTreeBuilder = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

    /* setup drawing area */
    let win = {left: -100, right: 100, top: 100, bottom: -100}
    let view = {left: 0, right: 0.5, top: 1, bottom: 0.5}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');

            sk.pixelDensity(1);
            sk.noStroke();
            sk.noLoop();
            sk.background(40);

            sk.strokeWeight(1.5);
            sk.stroke(255);
        },
        display: function() {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            this.drawHTree(4, 100, 0, 0);
        },
        drawHTree: function(n, lineLength, x, y) {

            if (n === 0)
                return

            let x0 = x - lineLength / 2;
            let x1 = x + lineLength / 2
            let y0 = y - lineLength / 2
            let y1 = y + lineLength / 2

            sk.line(x0, y, x1, y);
            sk.line(x0, y0, x0, y1)
            sk.line(x1, y0, x1, y1)

            this.drawHTree(n-1, lineLength/2, x0, y0)
            this.drawHTree(n-1, lineLength/2, x0, y1)
            this.drawHTree(n-1, lineLength/2, x1, y0)
            this.drawHTree(n-1, lineLength/2, x1, y1)

        }
    }
}
