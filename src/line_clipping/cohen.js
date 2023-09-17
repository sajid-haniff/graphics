import {createGraphicsContext2} from "../graphics_context2";
import * as vec3 from "../lib/esm/vec3";

export const sketchBuilder2 = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {

    /* setup drawing area */
    let win  = { left: -100, right: 100, top: 100, bottom: -100}
    let view = { left:   0.1, right:  0.9, top:  0.9, bottom:   0.1}

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    const arrow = (f, h, t, w) => {
        ctx.lineRel(-w - t / 2, -f);
        ctx.lineRel(w, 0);
        ctx.lineRel(0, -h);
        ctx.lineRel(t, 0);
        ctx.lineRel(0, h);
        ctx.lineRel(w, 0);
        ctx.lineRel(-w - t / 2, f);
    }



    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');

            let button = sk.createButton('click me');
            button.position(0, 0);
            button.class("pure-button pure-button-primary");

            sk.background(40);
            sk.noLoop();

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

            //sk.stroke(1);
            //sk.strokeWeight(2);
            //sk.fill(127);
            //sk.ellipse(0, 0, 48, 48);

            /* Clip to Window using Cohen Sutherland Line Clipping */
            //ctx.clip_draw(-155, 0, 155, 0);
            //ctx.clip_draw(-155, 0, 0, 120);
            //ctx.clip_draw(0,120, 155, 0);

            sk.stroke(25, 204, 123);
            sk.strokeWeight(2);

            //ctx.moveTo(0, -30);
            //arrow(30, 30, 10, 15);

            sk.stroke(255, 20, 12);
            sk.strokeWeight(2);
            //ctx.moveTo(0 ,0);
            //ctx.polySpiral(3, 114, 5, 65);
            //ctx.polySpiral(2, 170, 5, 50);
            //ctx.polySpiral(3, 87, 2, 100);




            let P = vec3.fromValues(99, 99, 1.0 );
            let Q = vec3.fromValues(99, -50, 1.0 );
            let R = 20;
            ctx.moveTo(-0, 99);
            ctx.arcTo(P,Q, R);


             P = vec3.fromValues(99, -99, 1.0 );
             Q = vec3.fromValues(0, -99, 1.0 );
             R = 20;
            ctx.arcTo(P,Q, R);


            P = vec3.fromValues(-99, -99, 1.0 );
            Q = vec3.fromValues(-99, 0, 1.0 );
            R = 20;
            //ctx.moveTo(o, -99);
            ctx.arcTo(P,Q, R);

            P = vec3.fromValues(-99, 99, 1.0 );
            Q = vec3.fromValues(0, 99, 1.0 );
            R = 20;
            //ctx.moveTo(o, -99);
            ctx.arcTo(P,Q, R);


/*
            let P = vec3.fromValues(0, 0, 1.0 );
            let Q = vec3.fromValues(-60, 80.0, 1.0 );
            let R = 15;
            ctx.moveTo(80, 85);
            ctx.arcTo(P,Q, R);
*/




            //ctx.drawArc(67, 42, 10, 117, 2*117);
            //ctx.drawArc(-100, -100, 200, 0, 90);
            //ctx.drawArc(100, -100, 200, -180, -90);



        }
    }
}
