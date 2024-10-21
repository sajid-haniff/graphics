import {createGraphicsContext2} from '../graphics_context2';

export const createGridDemo = (sk, CANVAS_WIDTH = 1000, CANVAS_HEIGHT = 1000) => {
    // Define window and viewport, using the same pattern as other demos
    const win = {left: -100, right: 100, top: 100, bottom: -100};
    const view = {left: 0.0, right: 1.0, top: 1.0, bottom: 0.0};

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    const EVEN_COLOR = sk.color(0, 102, 153);
    const ODD_COLOR = sk.color(153, 204, 255);
    const BLACK = sk.color(0);
    const WHITE = sk.color(255);
    const GRAY = sk.color(128);

    const SIDE_LENGTH = 400; // Adjust to fit the canvas
    let gridSize = 20; // Default order

    // Utility Functions
    const isEven = (num) => num % 2 === 0;

    const drawSquare = (side) => {
        sk.beginShape();
        sk.vertex(-side / 2, -side / 2);
        sk.vertex(side / 2, -side / 2);
        sk.vertex(side / 2, side / 2);
        sk.vertex(-side / 2, side / 2);
        sk.endShape(sk.CLOSE);
    };

    const drawTileBg = (col, row, side) => {
        sk.fill(isEven(col + row) ? EVEN_COLOR : ODD_COLOR);
        sk.noStroke();
        drawSquare(side);
    };

    const drawTileDot = (col, row, side, cols) => {
        //sk.fill(isEven(col + row) ? BLACK : WHITE);
        const midCol = Math.floor(cols / 2) - 1;  // Middle column index
        const midRow = Math.floor(cols / 2) - 1;  // Middle row index

        // Determine initial color based on standard checkerboard pattern
        let shouldBeWhite = isEven(col + row);

        // Flip color if col > midCol
        if (col > midCol) {
            shouldBeWhite = !shouldBeWhite;
        }

        // Flip color again if row > midRow
        if (row > midRow) {
            shouldBeWhite = !shouldBeWhite;
        }

        // Set the fill color based on the result
        sk.fill(shouldBeWhite ? BLACK : WHITE);

        sk.noStroke();
        sk.push();
        sk.translate(side / 2, -side / 2);  // Move to the center or custom offset of the tile
        sk.ellipse(0, 0, side / 2, side / 2);  // Draw a dot centered at (0, 0)
        sk.pop();
    };

    const drawTileSquare = (col, row, side) => {
        sk.noFill();
        sk.stroke(GRAY);
        sk.strokeWeight(side / 30);
        sk.push();
        sk.translate(1 * side, -1 * side)
        drawSquare(side);
        sk.pop();
    };

    const grid = (cols, rows, side, drawTile, customOffset = side / 2) => {
        const win = {left: -100, top: 100};
        const offset = customOffset;  // Default to halfSide unless a custom value is passed

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x_center = win.left + col * side + offset;
                const y_center = win.top - row * side - offset;

                sk.push();
                sk.translate(x_center, y_center);  // Move to the center or custom offset of the tile
                drawTile(col, row, side, cols);           // Draw tile at (0, 0) relative to this position
                sk.pop();
            }
        }
    };

    // Main exported demo object
    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(51); // Initial background
            sk.noLoop(); // Only render once
        },
        display() {

            // First matrix: Flips the Y-axis, effectively flipping the drawing vertically.
            // Second matrix: Scales and translates to match the canvas width and height.
            // Third matrix: Applies scaling and translation based on the viewport (sx, sy, tx, ty).
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(51); // Clear the background each frame
            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(127);

            grid(gridSize, gridSize, 10, drawTileBg);
            grid(gridSize - 1, gridSize - 1, 10, drawTileDot);
            grid(gridSize - 2, gridSize - 2, 10, drawTileSquare);
        }
    };
};
