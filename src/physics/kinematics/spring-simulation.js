import { createGraphicsContext2 } from '../../graphics_context2';
import { createSpringSystem } from './spring-system.js';

export const simulateSpringSystem = (sk, CANVAS_WIDTH = 1000, CANVAS_HEIGHT = 1000) => {
    // World (logical) and view (normalized) bounds
    const win = { left: -100, right: 100, top: 100, bottom: -100 };
    const view = { left: 0.1, right: 0.9, top: 0.9, bottom: 0.1 };

    // Create graphics context
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // Spring system parameters
    const mass = 2.0, damping = 0.2, springConstant = 20.0;
    const initialPosition = -80.2;
    let spring = createSpringSystem(mass, damping, springConstant, initialPosition);

    const dt = 0.1; // Time step
    let timeElapsed = 0; // Track total elapsed time

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(255);
        },
        display() {
            // Prepare transformations
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            // Clear canvas
            sk.background(51);

            // Update spring system for one step
            if (timeElapsed <= 100.0) { // Total simulation time
                spring.update(dt);
                timeElapsed += dt;

                // Retrieve current position and velocity
                const position = spring.getX();
                const velocity = spring.getV();

                // Log data (optional, for debugging)
                console.log(`Time: ${timeElapsed.toFixed(2)}s, Position: ${position.toFixed(4)}, Velocity: ${velocity.toFixed(4)}`);

                // Visualize spring motion
                sk.fill(150, 100, 255);
                sk.noStroke();
                //const mappedX = sx * position + tx; // Map position to canvas coordinates
                sk.ellipse(position, 0, 20, 20); // Draw a circle representing the mass
            } else {
                sk.push();

                // Reset transformations for text rendering
                sk.resetMatrix();

                // Display simulation complete message
                sk.fill(255, 0, 0);
                sk.textAlign(sk.CENTER, sk.CENTER);
                sk.text('Simulation Complete', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

                // Restore previous transformations
                sk.pop();
            }
        },
    };
};
