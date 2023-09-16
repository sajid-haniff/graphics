import {createGraphicsContext} from "../graphics_context";

export const circleRecursionBuilder = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

    /* setup drawing area */
    let win = {left: -100, right: 100, top: 100, bottom: -100}
    let view = {left: 0, right: 1, top: 1, bottom: 0}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');

            sk.pixelDensity(1);
            sk.noStroke();
            //sk.noLoop();
            sk.background(40);

        },
        display: function() {

           sk.push();
           sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
           sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
           sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            this.drawCircle(0, 100, 5);

           sk.pop()
        },
        drawCircle: function(x, radius, level) {

            const tt = (126 * level) / 4.0;
            sk.fill(tt);
            sk.ellipse(x, 0, radius * 2, radius * 2);
            if (level > 1) {
                // 'level' decreases by 1 at every step and thus makes the terminating condition
                // attainable
                level = level - 1;
                this.drawCircle(x - radius / 2, radius / 2, level);
                this.drawCircle(x + radius / 2, radius / 2, level);
            }
        }
    }
}
