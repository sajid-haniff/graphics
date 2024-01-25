import {degsToRads} from './math_utils'
import {createGraphicsContext, lineTo, moveTo} from "./graphics_context";
//import {glMatrix, mat2, mat2d, mat3, mat4, quat, quat2, vec2, vec3, vec4} from "./lib/gl-matrix"
import  * as glMatrix from "./lib/esm/common";
import * as vec2 from "./lib/esm/vec2.js";

export const rosetteBuilder = (NUM_VERTEX, sk) => {
    let X = [];
    let Y = [];

    let angle = 360 / NUM_VERTEX;
    let rad = degsToRads(angle);
    let theta = 0;
    let radius = 9.0;

    let win  = { left: -10, right: 10, top: 10, bottom: -10}
    let view = { left:   0, right:  1, top:  1, bottom:   0}

    let width  = 400;
    let height = 400;
    const {sx, sy, tx, ty} = createGraphicsContext(win, view, width, height);

    //sk.drawingContext.transform(1, 0, 0, -1, 0, height);
    //sk.drawingContext.transform(width, 0, 0, height,0, 0);
    //sk.drawingContext.transform(sx, 0, 0, sy, tx, ty);
    //sk.push();

    (() => {
        for (let i = 0; i < NUM_VERTEX; i++) {
            X[i] = radius * Math.cos(theta);
            Y[i] = radius * Math.sin(theta);
            theta += rad;
        }
    })();

    //const radian = glMatrix.toRadian(360);
    //const v2 = vec2.fromValues(2,3);
    //  const v3 = vec2.fromValues(2,3,4);


    //const radian = glMatrix.toRadian(360);
    //const v2 = vec2.fromValues(2,3);



    //console.log("testing " + vec2.str(v2));
    //console.log("testing " + v2[1]);

    return {
        draw: (sk) => {

            //sk.pop();


            sk.drawingContext.transform(1, 0, 0, -1, 0, height);
            sk.drawingContext.transform(width, 0, 0, height,0, 0);
            sk.drawingContext.transform(sx, 0, 0, sy, tx, ty);

            sk.stroke(255, 0, 0);
            sk.strokeWeight(0.1);

            for (let i = 0; i < NUM_VERTEX - 1; i++)
            {
                for (let j = i + 1; j < NUM_VERTEX; j++)
                {
                    //sk.line(X[i], Y[i], X[j], Y[j]);
                    moveTo(X[i], Y[i]);
                    lineTo(X[j],Y[j], sk);
                }
            }

            sk.stroke(255, 0, 0);
            sk.strokeWeight(0.1);

            for (let i = 0; i < 18; i++) {
                sk.circle(X[i], Y[i], 0.2);
            }
            //sk.push();

        }
    }
}
