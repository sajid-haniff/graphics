import { colorA } from './utils';

export const drawHUD = (sk, CANVAS_WIDTH, CANVAS_HEIGHT, score, lives, wave, gameOver, THEME) => {
    sk.resetMatrix();
    sk.fill(THEME.hud);
    sk.noStroke();
    sk.textAlign(sk.LEFT, sk.TOP);
    sk.textSize(16);
    sk.text(`Score: ${score}`, 12, 10);
    sk.text(`Lives: ${lives}`, 12, 32);
    sk.text(`Wave: ${wave}`, 12, 54);

    if (gameOver) {
        sk.textAlign(sk.CENTER, sk.CENTER);
        sk.textSize(28);
        sk.fill(THEME.hud);
        sk.text('GAME OVER', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 18);
        sk.textSize(16);
        sk.fill(colorA(sk, THEME.hud, 200));
        sk.text('Press R to restart', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 12);
    }
};
