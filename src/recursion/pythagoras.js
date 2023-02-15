import {createGraphicsContext} from "../graphics_context";
import {moveTo, lineTo} from "../graphics_context";
import {degsToRads} from "../math_utils"
import * as vec3 from "../lib/esm/vec3";

export const pythagorasTreeBuilder = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

    /* setup drawing area */
    let win = {left: -8, right: 8, top: 8, bottom: -8}
    let view = {left: 0.0, right: 1, top: 1, bottom: 0}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    return {

        setup: () => {

            // const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            // canvas.id('canvas');

            sk.pixelDensity(1);
            sk.noStroke();
            // sk.noLoop();
            sk.background(40);

            sk.strokeWeight(0.04);
            sk.stroke(245);
        },
        display: function () {

            sk.push();
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);


            let a = vec3.fromValues(-1/5, -1, 0);
            let b = vec3.fromValues(1.5, -1, 0);
            this.pythagoras(a, b, 7)
            sk.pop()
            sk.noLoop()
        },
        pythagoras: function (A, B, n) {

            if (n > 0) {
                /* C = B + (A.y - B.y, B.x - A.x) */
                let C = vec3.add(vec3.create(), B, vec3.fromValues(A[1] - B[1], B[0] - A[0], 0));

                /* D = A + C - B */
                let D = vec3.add(vec3.create(), A, vec3.subtract(vec3.create(), C, B));


               // let tmp = vec3.lerp(vec3.create(), A, C, 0.5);

                //let E = vec3.add(vec3.create(), D, tmp);

                let tmp1 = vec3.subtract(vec3.create(), C, A);
                let tmp2 = vec3.scale(vec3.create(), tmp1, 0.5);
                let E = vec3.add(vec3.create(), D, tmp2);
                
                //sk.fill(255, 204, 255);
                //sk.beginShape(sk.LINES);
                //sk.vertex(A[0], A[1]);
               // sk.vertex(B[0], B[1]);
                //sk.vertex(C[0], C[1]);
               // sk.vertex(D[0], D[1]);
               // sk.endShape();

                moveTo(A[0], A[1]);
                lineTo(B[0], B[1], sk);
                lineTo(C[0], C[1], sk);
                lineTo(D[0], D[1], sk);
                lineTo(A[0], A[1], sk);

                //sk.ellipse(A[0], A[1], .75, .75);
                //sk.ellipse(C[0], C[1], .5, .5);
                //sk.ellipse(D[0], D[1], .5, .5);
                //sk.ellipse(E[0], E[1], .5, .5);

                this.pythagoras(D, E, n - 1);
                this.pythagoras(E, C, n - 1);
            }
        }
    }
}
