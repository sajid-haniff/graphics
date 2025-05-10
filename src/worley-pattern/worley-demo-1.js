import { createGraphicsContext2 } from '../graphics_context2';
import { waveColor } from './wave-util';

export const createWorleyDemo = (sk, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {
    const frmLen = 120;

    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const initPoints = [];
    const points = [];
    const wave = new Array(frmLen);

    let generationFrame = 0;
    let generationComplete = false;

    const generateInitPoints = () => {
        sk.randomSeed(70);
        for (let i = 0; i < 36; i++) {
            initPoints.push(sk.createVector(sk.random(CANVAS_WIDTH), sk.random(CANVAS_HEIGHT)));
        }
    };

    const generatePointsForFrames = () => {
        for (let f = 0; f < frmLen; f++) {
            const framePoints = [];
            const angle = (f * 360 / frmLen);
            for (let i = 0; i < initPoints.length; i++) {
                const pX = 50 * sk.sin(angle + 6 * initPoints[i].x) + initPoints[i].x;
                const pY = 50 * sk.cos(angle + 6 * initPoints[i].y) + initPoints[i].y;
                framePoints.push(sk.createVector(pX, pY));
            }
            points.push(framePoints);
        }
    };

    const computeWaveFrame = (f) => {
        const frameWave = new Uint8ClampedArray(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
        const p = points[f];

        for (let y = 0; y < CANVAS_HEIGHT; y++) {
            for (let x = 0; x < CANVAS_WIDTH; x++) {
                let minDistSq = Infinity;

                for (let i = 0; i < p.length; i++) {
                    const dx = x - p[i].x;
                    const dy = y - p[i].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < minDistSq) minDistSq = distSq;
                }

                const noise = Math.sqrt(minDistSq);
                const index = (x + y * CANVAS_WIDTH) * 4;
                frameWave[index + 0] = waveColor(noise, 40, 32, 2.2);
                frameWave[index + 1] = waveColor(noise, 30, 55, 3.34);
                frameWave[index + 2] = waveColor(noise, 30, 68, 3.55);
                frameWave[index + 3] = 255;
            }
        }

        wave[f] = frameWave;
        console.log(`Generated frame ${f + 1} / ${frmLen}`);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.angleMode(sk.DEGREES);
            sk.stroke(255);
            sk.strokeWeight(12);
            sk.pixelDensity(1);
            generateInitPoints();
            generatePointsForFrames();
        },

        display() {
            // Build wave data incrementally
            if (!generationComplete) {
                computeWaveFrame(generationFrame);
                generationFrame++;
                if (generationFrame >= frmLen) {
                    generationComplete = true;
                    console.log('All frames generated.');
                }
                return;
            }

            const frameIndex = sk.frameCount % frmLen;
            const framePixels = wave[frameIndex];

            sk.loadPixels();
            for (let i = 0; i < framePixels.length; i++) {
                sk.pixels[i] = framePixels[i];
            }
            sk.updatePixels();

            // Optional: render feature points
            // sk.beginShape(sk.POINTS);
            // for (const pt of points[frameIndex]) {
            //   sk.vertex(pt.x, pt.y);
            // }
            // sk.endShape();
        }
    };
};
