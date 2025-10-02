import { createGraphicsContext2 } from '../../graphics_context2';

// Creates a ripple water simulation with clear mathematical structure
export const createRippleWaterDemo = (sk, CANVAS_WIDTH = 320, CANVAS_HEIGHT = 240) => {
    // Simulation parameters
    const config = {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        damping: 0.99,
        rippleMagnitude: 500
    };

    // Viewport setup
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0, right: 1, top: 1, bottom: 0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // Wave simulation buffers
    const simulation = {
        cols: CANVAS_WIDTH,
        rows: CANVAS_HEIGHT,
        heightMap: new Float32Array(CANVAS_WIDTH * CANVAS_HEIGHT),
        prevHeightMap: new Float32Array(CANVAS_WIDTH * CANVAS_HEIGHT)
    };

    // Converts 2D coordinates to 1D index
    const getIndex = (x, y) => y * simulation.cols + x;

    // Applies a disturbance (ripple) at the given coordinates
    const createRipple = (x, y) => {
        const x0 = Math.max(2, Math.min(simulation.cols - 3, Math.floor(x)));
        const y0 = Math.max(2, Math.min(simulation.rows - 3, Math.floor(y)));
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                simulation.prevHeightMap[getIndex(x0 + dx, y0 + dy)] = config.rippleMagnitude;
            }
        }
    };

    // Updates wave heights using the 2D wave equation
    const updateWave = () => {
        for (let y = 1; y < simulation.rows - 1; y++) {
            const rowStart = y * simulation.cols;
            for (let x = 1; x < simulation.cols - 1; x++) {
                const i = rowStart + x;
                // Wave equation: average of neighboring heights minus current height
                const newHeight =
                    (simulation.prevHeightMap[i - 1] + // left
                        simulation.prevHeightMap[i + 1] + // right
                        simulation.prevHeightMap[i - simulation.cols] + // up
                        simulation.prevHeightMap[i + simulation.cols]) / 2 - // down
                    simulation.heightMap[i];
                simulation.heightMap[i] = newHeight * config.damping;
            }
        }
    };

    // Renders the wave heights to the canvas
    const renderWave = () => {
        sk.loadPixels();
        for (let y = 1; y < simulation.rows - 1; y++) {
            const rowStart = y * simulation.cols;
            for (let x = 1; x < simulation.cols - 1; x++) {
                const i = rowStart + x;
                // Map wave height to brightness for visualization
                const brightness = Math.min(Math.max(simulation.heightMap[i], -255), 255);
                const pix = i * 4;
                sk.pixels[pix] = brightness;     // Red
                sk.pixels[pix + 1] = brightness; // Green
                sk.pixels[pix + 2] = 255;        // Blue
                sk.pixels[pix + 3] = 255;        // Alpha
            }
        }
        sk.updatePixels();
    };

    return {
        setup() {
            sk.createCanvas(config.width, config.height);
            sk.pixelDensity(1);
            // Apply viewport transformation once
            sk.applyMatrix(sx * config.width, 0, 0, -sy * config.height, tx, config.height + ty);
        },

        mousePressed() {
            createRipple(sk.mouseX, sk.mouseY);
        },

        display() {
            // Step 1: Update wave heights
            updateWave();
            // Step 2: Render to canvas
            renderWave();
            // Step 3: Swap buffers for next frame
            [simulation.prevHeightMap, simulation.heightMap] = [simulation.heightMap, simulation.prevHeightMap];
        }
    };
};