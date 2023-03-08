import {createGraphicsContext2} from "../graphics_context2";

export const sketchBuilder2 = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

    /* setup drawing area */
    let win  = { left: -100, right: 100, top: 100, bottom: -100}
    let view = { left:   0.1, right:  0.9, top:  0.9, bottom:   0.1}

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');
            sk.background(40);

        },
        display: () => {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.stroke(255, 204, 0);
            sk.strokeWeight(2);

            /* Draw Window */
            ctx.moveTo(-100, 100);
            ctx.lineTo(100,100);
            ctx.lineTo(100, -100);
            ctx.lineTo(-100,-100);
            ctx.lineTo(-100,100)

            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(127);
            sk.ellipse(0, 0, 48, 48);

            /* Clip to Window using Cohen Sutherland Line Clipping */
            ctx.clip_draw(-155, 0, 155, 0);
            ctx.clip_draw(-155, 0, 0, 120);
            ctx.clip_draw(0,120, 155, 0);
        }
    }
}
