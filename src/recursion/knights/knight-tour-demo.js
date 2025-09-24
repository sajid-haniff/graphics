import { createGraphicsContext2 } from '../../graphics_context2';
import { solveKnightsTour } from './knights-tour';

export const knightsTourDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 640) => {
    const cols = 8;
    const rows = 8;

    const win = { left: 0, right: cols, top: rows, bottom: 0 };
    const view = { left: 0, right: cols, top: rows, bottom: 0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const { board, path } = solveKnightsTour(cols, rows);

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        },

        display() {
            sk.background(30);

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH / cols, 0, 0, CANVAS_HEIGHT / rows, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    sk.stroke(200);
                    sk.noFill();
                    sk.rect(x, y, 1, 1);

                    const moveNum = board[y][x];
                    if (moveNum !== -1) {
                        sk.fill(255);
                        sk.textSize(0.5);
                        sk.textAlign(sk.CENTER, sk.CENTER);
                        sk.text(moveNum, x + 0.5, y + 0.5);
                    }
                }
            }

            sk.noFill();
            sk.stroke(255, 100, 100);
            sk.strokeWeight(0.1);
            sk.beginShape();
            for (const [x, y] of path) {
                sk.vertex(x + 0.5, y + 0.5);
            }
            sk.endShape();
        }
    };
};
