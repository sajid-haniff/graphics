import { createGraphicsContext2 } from '../../graphics_context2';

export const createFlowFieldDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 480) => {
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0, right: 1, top: 1, bottom: 0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const cols = 60;
    const rows = 45;
    const scale = 10;

    const flowField = [];
    const particles = [];
    const numParticles = 1200;

    let zOffset = 0;
    let globalAngle = 0;

    const createParticle = () => {
        const pos = sk.createVector(sk.random(CANVAS_WIDTH), sk.random(CANVAS_HEIGHT));
        const vel = sk.createVector(0, 0);
        const acc = sk.createVector(0, 0);
        const maxSpeed = 2;
        let hue = sk.random(360);
        const path = [];

        return {
            update() {
                vel.add(acc);
                vel.limit(maxSpeed);
                pos.add(vel);
                acc.mult(0);

                if (pos.x < 0) pos.x = CANVAS_WIDTH;
                if (pos.x > CANVAS_WIDTH) pos.x = 0;
                if (pos.y < 0) pos.y = CANVAS_HEIGHT;
                if (pos.y > CANVAS_HEIGHT) pos.y = 0;

                path.push(pos.copy());
                if (path.length > 10) path.shift();
            },
            follow(vectors) {
                const x = Math.floor(pos.x / scale);
                const y = Math.floor(pos.y / scale);
                const index = x + y * cols;
                const force = vectors[index];
                acc.add(force);
            },
            display() {
                sk.noFill();
                sk.stroke(hue, 255, 255, 80);
                sk.strokeWeight(2.5);

                sk.beginShape();
                path.forEach(p => sk.vertex(p.x, p.y));
                sk.endShape();

                hue = (hue + 0.8) % 360;
            }
        };
    };

    for (let i = 0; i < numParticles; i++) {
        particles.push(createParticle());
    }

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.colorMode(sk.HSB, 360, 255, 255, 255);
            sk.background(0);
        },
        display() {
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            // Fading background for trails
            sk.noStroke();
            sk.fill(0, 0, 0, 10);
            sk.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            let yOff = 0;
            const angleOffset = globalAngle;

            for (let y = 0; y < rows; y++) {
                let xOff = 0;
                for (let x = 0; x < cols; x++) {
                    const baseAngle = sk.noise(xOff, yOff, zOffset) * sk.TWO_PI * 4;
                    const angle = baseAngle + angleOffset;
                    const v = sk.createVector(sk.cos(angle), sk.sin(angle));
                    const index = x + y * cols;
                    flowField[index] = v;
                    xOff += 0.1;
                }
                yOff += 0.1;
            }

            zOffset += 0.01;
            globalAngle += 0.0015;

            particles.forEach(p => {
                p.follow(flowField);
                p.update();
                p.display();
            });
        }
    };
};
