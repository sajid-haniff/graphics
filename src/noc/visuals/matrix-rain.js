import { createGraphicsContext2 } from '../../graphics_context2';

export const createMatrixRainDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 600) => {
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const symbolSize = 15;
    const numStreams = symbolSize + 10;
    const streams = [];

    const createSymbol = (x, y, speed, first, opacity) => {
        let value = '';
        const switchInterval = sk.round(sk.random(5, 8));

        const setToRandomSymbol = () => {
            if (sk.frameCount % switchInterval === 0) {
                value = String.fromCharCode(0x30A0 + sk.round(sk.random(0, 96)));
            }
        };

        const rain = () => {
            y = (y >= CANVAS_HEIGHT) ? 0 : y + speed;
        };

        return {
            render() {
                if (first) {
                    sk.fill(180, 255, 180, opacity);
                } else {
                    sk.fill(0, 255, 100, opacity);
                }
                sk.text(value, x, y);
                rain();
                setToRandomSymbol();
            }
        };
    };

    const createStream = () => {
        const symbols = [];
        const totalSymbols = sk.round(sk.random(5, 30));
        const speed = sk.random(5, 10);

        const generateSymbols = (x, y) => {
            let opacity = 255;
            let first = sk.round(sk.random(0, 8)) === 1;
            for (let i = 0; i <= totalSymbols; i++) {
                const sym = createSymbol(x, y, speed, first, opacity);
                sym.render(); // initialize with first value
                symbols.push(sym);
                y -= symbolSize;
                first = false;
                opacity -= (255 / totalSymbols) / 1.3;
            }
        };

        return {
            generateSymbols,
            render() {
                symbols.forEach(sym => sym.render());
            }
        };
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.textSize(symbolSize);
            let x = 0;
            for (let i = 0; i <= CANVAS_WIDTH / numStreams; i++) {
                const stream = createStream();
                stream.generateSymbols(x, sk.random(-1000, 0));
                streams.push(stream);
                x += numStreams;
            }
        },

        display() {
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(0, 150);
            streams.forEach(stream => stream.render());
        }
    };
};
