// src/adv-game-design/loadSpaceshipAtlasDemo.js
import {createGraphicsContext2} from '../graphics_context2';
import {M2D} from '../lib/esm/M2D';
import {assets, drawTextCartesian, createBlitter} from './library/utilities';

export const createSpaceshipAtlasDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 360) => {
    // World and view in pixel space (Y-up via COMPOSITE)
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

    const SPRITE_DRAW_SIZE = 64;

    const FRAME_NAMES = [
        "spaceship_00.png",
        "spaceship_01.png",
        "spaceship_02.png",
        "spaceship_03.png",
        "spaceship_04.png",
        "spaceship_05.png",
        "spaceship_06.png",
        "spaceship_07.png"
    ];

    let atlasReady   = false;
    let sheetImage   = null;
    let atlasJson    = null;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(51);

            assets.load([
                "images/spaceship_atlas.json"  // will internally load SHEET_PNG_PATH via meta.image
            ], sk).then(() => {

                atlasJson  = assets["images/spaceship_atlas.json"];
                sheetImage = assets["images/spaceship.png"];

                console.log("✅ Spaceship atlas assets loaded");
                console.log("Atlas JSON:", atlasJson);
                console.log("Atlas image:", sheetImage);

                FRAME_NAMES.forEach((name) => {
                    console.log(`Frame ${name}:`, assets[name]);
                });

                atlasReady = true;
            });
        },

        display() {
            sk.background(30);

            // World-space pass (Y-up)
            sk.resetMatrix();
            sk.applyMatrix(...M2D.toArgs(COMPOSITE));

            // 1) Draw the full sprite sheet so you can see the raw atlas image
            if (sheetImage) {
                const w = sheetImage.width  || 274;
                const h = sheetImage.height || 36;
                blitImage(sheetImage, 16, 16, w, h);
            }

            // 2) Draw each frame by name using your atlas-frame utilities
            if (atlasReady) {
                const startX   = 150;
                const startY   = 80;
                const spacingX = SPRITE_DRAW_SIZE + 12;
                const spacingY = SPRITE_DRAW_SIZE + 12;
                const cols     = 4;

                FRAME_NAMES.forEach((name, index) => {
                    const col = index % cols;
                    const row = Math.floor(index / cols);
                    const x   = startX + col * spacingX;
                    const y   = startY + row * spacingY;

                    // Let your blitter deal with images vs frames vs names.
                    blitImage(name, x, y, SPRITE_DRAW_SIZE, SPRITE_DRAW_SIZE);
                });
            }

            // 3) Device-space HUD text using drawTextCartesian (via utilities)
            sk.fill(255);
            sk.textSize(22);
        }
    };
};

export default createSpaceshipAtlasDemo;
