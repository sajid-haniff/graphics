import {createGraphicsContext2} from '../graphics_context2';
import {M2D} from '../lib/esm/M2D';
import {assets, drawTextCartesian, createBlitter} from './library/utilities';

export const createLoadImagesDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 360) => {
    const win  = {left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT};
    const view = {left: 0.0, right: 1.0,        bottom: 0.0, top: 1.0};

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    // One-shot COMPOSITE = REFLECT_Y · DEVICE · WORLD
    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const COMPOSITE = M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);

    const {blitImage} = createBlitter(ctx, sk, CANVAS_WIDTH, CANVAS_HEIGHT);

    const SPRITE_SIZE = 64;

    let tiger      = null;
    let fontFamily = null;
    let rooms      = null;
    let atlasReady = false;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(51);

            assets.load([
                "images/tiger.png",
                "fonts/PetMe64.ttf",
                "json/rooms.json",
                "images/animals.json"
            ], sk).then(() => {
                tiger      = assets["images/tiger.png"];
                fontFamily = assets["fonts/PetMe64.ttf"];
                rooms      = assets["json/rooms.json"];

                console.log("✅ All assets loaded");
                console.log("Rooms:", rooms);
                console.log("Atlas JSON:",  assets["images/animals.json"]);
                console.log("Atlas Image:", assets["images/animals.png"]);
                console.log("Frame cat.png:",      assets["cat.png"]);
                console.log("Frame tiger.png:",    assets["tiger.png"]);
                console.log("Frame hedgehog.png:", assets["hedgehog.png"]);

                atlasReady = true;
            });
        },

        display() {

            sk.background(30);
            sk.resetMatrix();
            sk.applyMatrix(...M2D.toArgs(COMPOSITE));

            if (tiger) {
                blitImage(tiger, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
                // or name-based: blitImage("images/tiger.png", 0, 0, SPRITE_SIZE, SPRITE_SIZE);
            }

            // Text (use loaded font if ready, fallback otherwise)
            sk.fill(255);
            sk.textSize(22);
            sk.textFont(fontFamily || "monospace");

            drawTextCartesian(sk, "Hello Tiger!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, {
                alignX: sk.CENTER,
                alignY: sk.CENTER
            });

            // Atlas sprites, using frame names
            if (atlasReady) {
                blitImage("cat.png",      100,  50, SPRITE_SIZE, SPRITE_SIZE);
                blitImage("tiger.png",    200,  90, SPRITE_SIZE, SPRITE_SIZE);
                blitImage("hedgehog.png", 300, 150, SPRITE_SIZE, SPRITE_SIZE);
            }

            // Device-space HUD could go here with another resetMatrix() if needed.
        }
    };
};

export default createLoadImagesDemo;