import { createGraphicsContext2 } from '../graphics_context2';
const worker = new Worker(new URL('./worley-worker.js', import.meta.url), {
    type: 'module',
});

export const createWorleyDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {
    const frmLen = 120;
    const wave = new Array(frmLen);
    let waveReady = 0;

    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const initPoints = [];
    const points = [];
    let worker;

    const generateInitPoints = () => {
        sk.randomSeed(70);
        for (let i = 0; i < 26; i++) {
            initPoints.push(sk.createVector(sk.random(CANVAS_WIDTH), sk.random(CANVAS_HEIGHT)));
        }
    };

    const generateFramePoints = () => {
        for (let f = 0; f < frmLen; f++) {
            const framePoints = [];
            const angle = (f * 360 / frmLen);
            for (let i = 0; i < initPoints.length; i++) {
                const pX = 60 * sk.sin(angle + 6 * initPoints[i].x) + initPoints[i].x;
                const pY = 60 * sk.cos(angle + 6 * initPoints[i].y) + initPoints[i].y;
                framePoints.push({ x: pX, y: pY });
            }
            points.push(framePoints);
        }
    };

    const startWorker = () => {
        worker = new Worker(new URL('./worley-worker.js', import.meta.url), { type: 'module' });

        worker.onmessage = (e) => {
            const { frameIndex, frameWave } = e.data;
            wave[frameIndex] = new Uint8ClampedArray(frameWave);
            waveReady++;
            if (waveReady === frmLen) console.log('✅ All frames ready.');
        };

        for (let f = 0; f < frmLen; f++) {
            const hueShift = Math.sin(f * 0.05) * 40;
            worker.postMessage({
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                frameIndex: f,
                points: points[f],
                hueShift
            });
        }
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

            // Enable optimized pixel reads
            const canvas = sk.canvas;
            const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
            sk.drawingContext = ctx2d;

            sk.angleMode(sk.DEGREES);
            sk.stroke(255);
            sk.strokeWeight(12);
            sk.pixelDensity(1);

            generateInitPoints();
            generateFramePoints();
            startWorker();
        },

        display() {
            if (waveReady < frmLen) return; // Don't draw until all frames ready

            const frameIndex = sk.frameCount % frmLen;
            const framePixels = wave[frameIndex];

            // Create an ImageData object from the raw RGBA buffer
            const imgData = new ImageData(framePixels, CANVAS_WIDTH, CANVAS_HEIGHT);
           // Draw it directly to the 2D context (faster than loadPixels/updatePixels)
            sk.drawingContext.putImageData(imgData, 0, 0);
        }
    };
};
