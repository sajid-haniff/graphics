import { createGraphicsContext2 } from '../graphics_context2';
import { assets, drawTextCartesian } from './library/utilities';

export const createLoadImagesDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 360) => {
    const win = { left: 0, right: CANVAS_WIDTH, top: CANVAS_HEIGHT, bottom: 0 };
    const view = { left: 0.0, right: 1.0, top: 1.0, bottom: 0.0 };
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    let tiger = null;
    let fontFamily = null;
    let rooms = null;
    let atlasReady = false;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(51);

            // Load all assets: image, font, JSON, atlas
            assets.load([
                "images/tiger.png",
                "fonts/PetMe64.ttf",
                "json/rooms.json",
                "images/animals.json"
            ], sk).then(() => {
                tiger = assets["images/tiger.png"];
                fontFamily = assets["fonts/PetMe64.ttf"];
                rooms = assets["json/rooms.json"];

                console.log("✅ All assets loaded");
                console.log("Rooms object:", rooms);

                // Check atlas
                console.log("Atlas JSON:", assets["images/animals.json"]);
                console.log("Atlas Image:", assets["images/animals.png"]);
                console.log("Frame: cat.png", assets["cat.png"]);
                console.log("Frame: tiger.png", assets["tiger.png"]);
                console.log("Frame: hedgehog.png", assets["hedgehog.png"]);

                atlasReady = true;
            });
        },
        display() {
            // Apply transforms
            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(30);

            const ctx2d = sk.drawingContext;

            // Draw tiger
            if (tiger) {
                ctx2d.drawImage(tiger, 0, 64, 64, 64);
            }

            // Draw text using loaded font
            sk.fill(255);
            sk.textSize(22);
            sk.textFont("monospace");

            drawTextCartesian(sk, "Hello Tiger!", sk.width / 2, sk.height / 2, {
                alignX: sk.CENTER,
                alignY: sk.CENTER
            });

            // Blit frames from the atlas
            if (atlasReady) {
                const blit = (frameName, dx, dy, dw, dh) => {
                    const frame = assets[frameName];
                    if (!frame) return;
                    const { frame: rect, source } = frame;
                    ctx2d.drawImage(
                        source,
                        rect.x, rect.y, rect.w, rect.h, // src rect
                        dx, dy, dw, dh                  // dest rect
                    );
                };

                // Draw some animals from the atlas
                blit("cat.png", 100, 50, 64, 64);
                blit("tiger.png", 200, 50, 64, 64);
                blit("hedgehog.png", 300, 50, 64, 64);
            }
        }
    };
};
