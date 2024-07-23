import {createGraphicsContext2} from "../graphics_context2";
import * as vec3 from "../lib/esm/vec3";

/**
 * Create a demo to visualize the incircle and excircle of a triangle.
 * @param {object} sk - The p5.js sketch object.
 * @param {number} [CANVAS_WIDTH=600] - The width of the canvas.
 * @param {number} [CANVAS_HEIGHT=600] - The height of the canvas.
 * @returns {object} An object containing setup and display methods for the demo.
 */
export const createInCirclesDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {

    // Define the drawing area and viewport
    let win = {left: -100, right: 100, top: 100, bottom: -100};
    let view = {left: 0.1, right: 0.9, top: 0.9, bottom: 0.1};

    // Create a graphics context for drawing
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

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
         * Display function to draw the triangle, incircle, and excircle.
         */
        display: () => {
            // Apply transformations to the drawing context
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

            // Draw the triangle
            ctx.moveTo(vertices[0][0], vertices[0][1]);
            vertices.forEach(([x, y]) => ctx.lineTo(x, y));
            ctx.lineTo(vertices[0][0], vertices[0][1]);

            // Calculate and draw the excircle
            const { center: ex_center, radius: ex_radius } = ctx.excircle(A, B, C);
            sk.noFill();
            sk.stroke(0, 204, 255); // Cyan color for the excircle
            sk.strokeWeight(1);
            sk.circle(ex_center[0], ex_center[1], 2 * ex_radius);

            // Calculate the incircle and its excircle vertices
            const { R, S, T } = ctx.incircle(A, B, C);
            const { center: in_center, radius: in_radius } = ctx.excircle(R, S, T);

            // Draw incircle vertices
            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(127);
            [R, S, T].forEach(point => sk.ellipse(point[0], point[1], 5, 5));

            // Draw the incircle's excircle
            sk.noFill();
            sk.stroke(255, 102, 102); // Light red color for the incircle's excircle
            sk.strokeWeight(1);
            sk.circle(in_center[0], in_center[1], 2 * in_radius);
        }
    };
};
