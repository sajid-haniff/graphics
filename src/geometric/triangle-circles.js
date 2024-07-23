import {createGraphicsContext2} from "../graphics_context2";
import * as vec3 from "../lib/esm/vec3";

export const createTriangleCirclesDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {

    /* setup drawing area */
    let win = {left: -100, right: 100, top: 100, bottom: -100}
    let view = {left: 0.1, right: 0.9, top: 0.9, bottom: 0.1}

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');

            sk.background(40);
            sk.noLoop();

        },
        display: () => {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            // Set stroke properties for the window
            sk.stroke(255, 204, 0);
            sk.strokeWeight(1);

            // Define vertices of the triangle
            const A = vec3.fromValues(-98, -50, 0);
            const B = vec3.fromValues(98, -70, 0);
            const C = vec3.fromValues(-56, 98, 0);

            const vertices = [A, B, C];

            // Draw Triangle
            ctx.moveTo(vertices[0][0], vertices[0][1]);
            vertices.forEach(([x, y]) => ctx.lineTo(x, y));
            ctx.lineTo(vertices[0][0], vertices[0][1]);

            // Calculate and draw the excircle
            const {center, radius} = ctx.excircle(A, B, C);
            sk.noFill();
            sk.stroke(0, 204, 255); // Cyan color for the excircle
            sk.strokeWeight(1);
            sk.circle(center[0], center[1], 2 * radius);

            // Calculate the incircle vertices and its excircle
            const {R, S, T} = ctx.incircle(A, B, C);
            const {center: in_center, radius: in_radius} = ctx.excircle(R, S, T);

            // Draw incircle vertices
            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(127);
            //[R, S, T].forEach(point => sk.ellipse(point[0], point[1], 5, 5));

            // Draw the incircle's excircle
            sk.noFill();
            sk.stroke(255, 102, 102); // Light red color for the incircle's excircle
            sk.strokeWeight(1);
            //sk.circle(in_center[0], in_center[1], 2 * in_radius);

            // Example usage:
            const line1 = ctx.createLine({
                type: 'points',
                p1: vec3.fromValues(0, 6, 0),
                p2: vec3.fromValues(6, 1, 0)
            });

            //line1.draw();

            const line2 = ctx.createLine({
                type: 'points',
                p1: vec3.fromValues(1, 3, 0),
                p2: vec3.fromValues(5, 5, 0)
            });

            //line2.draw();


            /*
                        const result = line1.intersect(line2);

                        if (result.type === 'none') {
                            console.log('No intersection.');
                        } else if (result.type === 'one') {
                            console.log('Intersection point:', result.point);
                        } else if (result.type === 'many') {
                            console.log('Overlapping segment:', result.interval);
                        }*/

            const {
                midpoints,
                feetOfAltitudes,
                midpointsToOrthocenter,
                ninePointCircle
            } = ctx.computeNinePointCircle(A, B, C);

            const {midAB, midBC, midCA} = midpoints;
            const {footA, footB, footC} = feetOfAltitudes;
            const {midAO, midBO, midCO} = midpointsToOrthocenter;
            const {ccenter, rradius} = ninePointCircle;

            sk.noFill();
            sk.stroke(1);
            sk.fill(224);
            //sk.circle(ccenter[0], ccenter[1], 2 * rradius);

            sk.stroke(0, 0, 255);
            sk.ellipse(midAO[0], midAO[1], 5, 5);
            sk.ellipse(midBO[0], midBO[1], 5, 5);
            sk.ellipse(midCO[0], midCO[1], 5, 5);

            sk.ellipse(midAB[0], midAB[1], 5, 5);
            sk.ellipse(midBC[0], midBC[1], 5, 5);
            sk.ellipse(midCA[0], midCA[1], 5, 5);

            sk.ellipse(footA[0], footA[1], 5, 5);
            sk.ellipse(footB[0], footB[1], 5, 5);
            sk.ellipse(footC[0], footC[1], 5, 5);

            ctx.moveTo(A[0], A[1]);
            ctx.lineTo(footA[0], footA[1]);
            ctx.moveTo(B[0], B[1]);
            ctx.lineTo(footB[0], footB[1]);
            ctx.moveTo(C[0], C[1]);
            ctx.lineTo(footC[0], footC[1]);

            sk.stroke(124, 0, 0);
            sk.noFill();
            sk.circle(ccenter[0], ccenter[1], 2 * rradius);

        }
    }
}
