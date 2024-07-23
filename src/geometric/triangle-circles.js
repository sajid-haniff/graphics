import { createGraphicsContext2 } from "../graphics_context2";
import * as vec3 from "../lib/esm/vec3";

/**
 * Create a demo to visualize the incircle, excircle, and nine-point circle of a triangle.
 * @param {object} sk - The p5.js sketch object.
 * @param {number} [CANVAS_WIDTH=600] - The width of the canvas.
 * @param {number} [CANVAS_HEIGHT=600] - The height of the canvas.
 * @returns {object} An object containing setup and display methods for the demo.
 */
export const createTriangleCirclesDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {

    // Define the drawing area and viewport
    const win = { left: -100, right: 100, top: 100, bottom: -100 };
    const view = { left: 0.1, right: 0.9, top: 0.9, bottom: 0.1 };

    // Create a graphics context for drawing
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    return {
        /**
         * Setup function to initialize the canvas and background.
         */
        setup: () => {
            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');
            sk.background(40);
            sk.noLoop(); // Prevent continuous looping
        },

        /**
         * Display function to draw the triangle, incircle, excircle, and nine-point circle.
         */
        display: () => {
            // Apply transformations to the drawing context
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            // Define vertices of the triangle
            const A = vec3.fromValues(-98, -50, 0);
            const B = vec3.fromValues(98, -70, 0);
            const C = vec3.fromValues(-56, 98, 0);
            const vertices = [A, B, C];

            // Draw the triangle
            sk.stroke(255, 204, 0); // Yellow color for the triangle
            sk.strokeWeight(1);
            sk.noFill();
            ctx.moveTo(vertices[0][0], vertices[0][1]);
            vertices.forEach(([x, y]) => ctx.lineTo(x, y));
            ctx.lineTo(vertices[0][0], vertices[0][1]);

            // Calculate and draw the excircle
            const { center: excenter, radius: exradius } = ctx.excircle(A, B, C);
            sk.stroke(0, 204, 255); // Cyan color for the excircle
            sk.strokeWeight(1);
            sk.noFill();
            sk.circle(excenter[0], excenter[1], 2 * exradius);

            // Calculate the incircle and its vertices
            const { R, S, T } = ctx.incircle(A, B, C);
            const { center: incenter, radius: inradius } = ctx.excircle(R, S, T);

            // Draw incircle vertices
            sk.stroke(127); // Gray color for incircle vertices
            sk.strokeWeight(2);
            sk.fill(127);
            //[R, S, T].forEach(point => sk.ellipse(point[0], point[1], 5, 5));

            // Draw the incircle's excircle
            sk.stroke(255, 102, 102); // Light red color for the incircle's excircle
            sk.strokeWeight(1);
            sk.noFill();
            //sk.circle(incenter[0], incenter[1], 2 * inradius);

            // Calculate and draw the nine-point circle
            const { midpoints, feetOfAltitudes, midpointsToOrthocenter, ninePointCircle } = ctx.computeNinePointCircle(A, B, C);
            const { midAB, midBC, midCA } = midpoints;
            const { footA, footB, footC } = feetOfAltitudes;
            const { midAO, midBO, midCO } = midpointsToOrthocenter;
            const { ccenter, rradius } = ninePointCircle;

            // Draw the nine-point circle and its components
            sk.stroke(255, 0, 0); // Red color for the nine-point circle
            sk.noFill();
            sk.circle(ccenter[0], ccenter[1], 2 * rradius);

            // Draw midpoints and feet of altitudes
            sk.stroke(0, 0, 255); // Blue color for midpoints and feet of altitudes
            sk.fill(224); // Light gray color for points
            [midAB, midBC, midCA, footA, footB, footC, midAO, midBO, midCO].forEach(point => {
                sk.ellipse(point[0], point[1], 5, 5);
            });

            // Draw lines from vertices to feet of altitudes
            sk.strokeWeight(1);
            ctx.moveTo(A[0], A[1]);
            ctx.lineTo(footA[0], footA[1]);
            ctx.moveTo(B[0], B[1]);
            ctx.lineTo(footB[0], footB[1]);
            ctx.moveTo(C[0], C[1]);
            ctx.lineTo(footC[0], footC[1]);
        }
    };
};
