import { createGraphicsContext2 } from '../graphics_context2';

/*
 * Recursive Fractal Tree Drawing:
 *
 * The `drawBranch` function uses recursion to draw a tree with branching structures.
 *
 * Recursion Process:
 * 1. **Base Case**: When `level` reaches 0, the recursion stops (no more branches are drawn).
 * 2. **Recursive Case**: At each level, the function draws a branch and then calls itself twice:
 *    - One recursive call for the right branch.
 *    - Another recursive call for the left branch.
 *
 * Recursive Steps:
 * - Each branch starts from the current position and is drawn vertically upwards (positive Y).
 * - After drawing a branch, the `translate()` function moves to the end of that branch.
 * - The drawing context is saved using `push()` before rotating, and restored with `pop()` after each recursive branch is drawn.
 * - The angle of rotation is determined by the `angle` variable (45 degrees in this case).
 * - Each recursive call reduces the branch length by a constant factor (`branchLengthFactor`), making the branches progressively smaller as the recursion deepens.
 *
 * Color Gradients:
 * - The color of each branch is determined by the current recursion level.
 * - The color transitions from red (at the base) to yellow (at the tips).
 *
 * Visual Hierarchy:
 * - The trunk is the thickest, and each subsequent branch becomes thinner as it splits further.
 *
 * Matrix Transformations:
 * - `applyMatrix()` is used to set up the correct coordinate system and viewport for drawing, ensuring the Y-axis is positive upwards.
 */

export const fractalTreeDemo = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {
    // Define window and viewport
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };

    // Create the graphics context
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const angle = sk.PI / 4;  // 45-degree angle for branching
    const branchLengthFactor = 0.67;

    // Recursive function to draw branches
    const drawBranch = (length, level, maxLevel) => {
        if (level > 0) {
            // Set the color based on the recursion level
            const r = sk.map(level, 0, maxLevel, 255, 255);
            const g = sk.map(level, 0, maxLevel, 0, 255);  // Transition from red to yellow
            const b = sk.map(level, 0, maxLevel, 0, 0);

            sk.stroke(r, g, b);
            sk.strokeWeight(level);  // Thicker branches at the base, thinner as they split

            // Draw the branch upwards (as your coordinate system defines Y as upward)
            sk.line(0, 0, 0, length);

            // Move to the end of the branch
            sk.translate(0, length);

            // Right branch
            sk.push();
            sk.rotate(angle);  // Rotate right
            drawBranch(length * branchLengthFactor, level - 1, maxLevel);  // Recursively draw the right branch
            sk.pop();

            // Left branch
            sk.push();
            sk.rotate(-angle);  // Rotate left
            drawBranch(length * branchLengthFactor, level - 1, maxLevel);  // Recursively draw the left branch
            sk.pop();
        }
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);  // Black background
            sk.stroke(255);    // Initial stroke color
        },
        display() {
            sk.background(0);  // Clear the background for each frame

            // Apply your standard matrix transformations (flip Y and apply viewport transformations)
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);  // Flip Y-axis to match positive Y as upward
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);  // Set up the scaling
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);  // Apply viewport scaling and translation

            // Move to the bottom center to start drawing the tree
            sk.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 10);  // Adjust position based on viewport scaling

            // Start drawing the tree (recursively)
            drawBranch(100, 10, 10);  // Length 100, 10 recursion levels
        }
    };
};


