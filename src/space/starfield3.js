import { createGraphicsContext2 } from '../graphics_context2';

export const createStarfieldDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {
    // Simulation parameters
    const config = {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        numStars: 800,
        maxDepth: CANVAS_WIDTH * 10, // Large depth for long trails
        maxSpeed: 50,
        maxSize: 12,
        projectionScale: CANVAS_WIDTH / 2 // Simplified projection
    };

    // Neon color palette (RGB for reliability)
    const neonColors = [
        [0, 255, 255], // Cyan
        [255, 0, 255], // Pink
        [255, 20, 147], // Hot Pink
        [0, 255, 127] // Neon Green
    ];

    // Viewport setup
    const win = {
        left: -CANVAS_WIDTH / 2,
        right: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        bottom: -CANVAS_HEIGHT / 2
    };
    const view = { left: 0, right: 1, top: 1, bottom: 0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    // Star data: [x, y, z, pz, speed, colorIndex]
    const stars = new Float32Array(config.numStars * 6);
    for (let i = 0; i < config.numStars; i++) {
        const idx = i * 6;
        stars[idx] = sk.random(-config.width * 2, config.width * 2); // x
        stars[idx + 1] = sk.random(-config.height * 2, config.height * 2); // y
        stars[idx + 2] = sk.random(1, config.maxDepth); // z
        stars[idx + 3] = stars[idx + 2]; // pz
        stars[idx + 4] = sk.random(0.5, 1.5); // speed multiplier
        stars[idx + 5] = Math.floor(sk.random(neonColors.length)); // color index
    }

    // Update and draw a single star
    const updateAndDrawStar = (idx, baseSpeed) => {
        let x = stars[idx];
        let y = stars[idx + 1];
        let z = stars[idx + 2];
        let pz = stars[idx + 3];
        const speed = stars[idx + 4];
        const colorIndex = stars[idx + 5];

        // Update position
        z -= baseSpeed * speed;
        if (z < 1) {
            z = config.maxDepth;
            x = sk.random(-config.width * 2, config.width * 2);
            y = sk.random(-config.height * 2, config.height * 2);
            pz = z;
            stars[idx + 4] = sk.random(0.5, 1.5);
            stars[idx + 5] = Math.floor(sk.random(neonColors.length));
        }

        // Perspective projection
        const sx = (x / z) * config.projectionScale;
        const sy = (y / z) * config.projectionScale;
        const px = (x / pz) * config.projectionScale;
        const py = (y / pz) * config.projectionScale;

        // Twinkling effect
        const twinkle = 0.8 + 0.2 * Math.sin(sk.frameCount * speed * 0.1);
        const color = neonColors[colorIndex];
        sk.noStroke();
        sk.fill(color[0] * twinkle, color[1] * twinkle, color[2] * twinkle);
        const size = sk.map(z, 1, config.maxDepth, config.maxSize, 0);
        sk.ellipse(sx, sy, size, size);

        // Draw glowing trail
        sk.stroke(color[0] * twinkle, color[1] * twinkle, color[2] * twinkle, sk.map(z, 1, config.maxDepth, 200, 50));
        sk.line(px, py, sx, sy);

        // Update star data
        stars[idx] = x;
        stars[idx + 1] = y;
        stars[idx + 2] = z;
        stars[idx + 3] = z;
    };

    return {
        setup() {
            sk.createCanvas(config.width, config.height);
            sk.background(0);
        },
        display() {
            // Mouse-controlled speed
            const baseSpeed = sk.map(sk.mouseX, 0, config.width, 0, config.maxSpeed);

            // Apply transformations
            sk.resetMatrix();
            sk.applyMatrix(1, 0, 0, -1, 0, config.height); // Flip Y
            sk.applyMatrix(config.width, 0, 0, config.height, 0, 0); // Normalize
            sk.applyMatrix(sx, 0, 0, sy, tx, ty); // Viewport

            // Draw black background and stars
            sk.background(0);
            for (let i = 0; i < config.numStars; i++) {
                updateAndDrawStar(i * 6, baseSpeed);
            }
        }
    };
};