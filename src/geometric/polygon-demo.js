import {createGraphicsContext2} from "../graphics_context2";
import * as vec3 from "../lib/esm/vec3";

export const createPolygonDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

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

            // Define vertices of a more complex polygon
            /*const vertices = [
                [-70, -50, 0],
                [0, -70, 0],
                [70, -50, 0],
                [50, 0, 0],
                [70, 50, 0],
                [0, 70, 0],
                [-70, 50, 0],
                [-50, 0, 0]
            ];*/
            const vertices = [
                [-50, -50, 0],
                [50, -50, 0],
                [70, 0, 0],
                [50, 50, 0],
                [-50, 50, 0],
                [-70, 0, 0]
            ];

            // Create and draw the polygon
            const polygon = ctx.createPolygon(vertices);

            // Set fill and stroke colors
            sk.fill(0, 150, 255, 100); // Light blue fill with transparency
            sk.stroke(255, 204, 0); // Yellow stroke
            sk.strokeWeight(2); // Thicker stroke

            // Draw the filled polygon
            sk.beginShape();
            vertices.forEach(([x, y]) => sk.vertex(x, y));
            sk.endShape(sk.CLOSE);

            // Draw the edges of the polygon
            polygon.draw();

            // Draw the normals
            sk.stroke(255, 0, 0); // Red color for normals
            sk.strokeWeight(1);
            polygon.edges.forEach(({edge, normal}) => {
                const midX = (edge.start[0] + edge.end[0]) / 2;
                const midY = (edge.start[1] + edge.end[1]) / 2;
                sk.line(midX, midY, midX + normal[0] * 10, midY + normal[1] * 10); // Scale normal for visibility
            });

            // Initialize the clipper
            const clipper = ctx.cyrusBeckClipper(polygon);

            // Define test cases for different lines
            const testLines = [
                {p1: vec3.fromValues(-75, -75, 0), p2: vec3.fromValues(75, 75, 0)},  // Partially inside
                {p1: vec3.fromValues(-25, -25, 0), p2: vec3.fromValues(25, 25, 0)},  // Completely inside
                {p1: vec3.fromValues(75, 75, 0), p2: vec3.fromValues(100, 100, 0)},  // Completely outside
                {p1: vec3.fromValues(0, -75, 0), p2: vec3.fromValues(0, 75, 0)},     // Intersecting top and bottom
                {p1: vec3.fromValues(-75, 0, 0), p2: vec3.fromValues(75, 0, 0)},     // Intersecting left and right
            ];

            // Perform clipping and print results
            testLines.forEach(({p1, p2}, index) => {
                const line = ctx.createLine({type: 'points', p1, p2});
                const clippedLine = clipper(line);

                // Draw the original line in red
                sk.stroke(255, 0, 0); // Red color for original line
                sk.strokeWeight(2);
                sk.line(p1[0], p1[1], p2[0], p2[1]);

                if (clippedLine) {

                    // Drawing the clipped line with a vibrant blue color and a stroke weight of 3
                    sk.stroke(30, 144, 255); // DodgerBlue color
                    sk.strokeWeight(3);
                    clippedLine.draw();

                } else {
                    console.log(`Test Case ${index + 1}: Line is outside the polygon`);
                }
            });
        }
    };
};
