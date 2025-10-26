// Fullscreen white flash in device-space. lifeFrames: how many frames to live.
export const createFlash = (sk, CANVAS_WIDTH, CANVAS_HEIGHT, lifeFrames = 6) => {
    let life = lifeFrames;

    const update = () => { life -= 1; };
    const draw = () => {
        if (life <= 0) return;
        sk.resetMatrix();           // device-space
        sk.noStroke();
        sk.fill(255, 255, 255, sk.map(life, 0, lifeFrames, 0, 200)); // fade out
        sk.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    };
    const dead = () => life <= 0;

    return { update, draw, dead };
};
