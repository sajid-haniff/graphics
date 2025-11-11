// src/adv-game-design/scenegraph-all-sprites-demo.js
// "All the sprites" demo, adapted to this repo's scenegraph (no texture atlas).
// Images used: tiger.png, hedgehog.png, cat.png. Includes a tiny blitter utility.

import { createScenegraph } from "./library/scenegraph";

// Minimal device-space blitter utility (no scenegraph) for comparison
// blit(img, dx, dy, dw, dh, sx=0, sy=0, sw=img.width, sh=img.height)
const makeBlitter = (sk) => ({
    blit: (img, dx, dy, dw, dh, sx = 0, sy = 0, sw, sh) => {
        if (!img) return;
        const W = sw ?? img.width;
        const H = sh ?? img.height;
        sk.resetMatrix();
        sk.image(img, dx, dy, dw, dh); // p5 handles source rect if provided; here we keep simple full image
    }
});

export const createScenegraphAllSpritesDemo = (sk, CANVAS_WIDTH = 512, CANVAS_HEIGHT = 512) => {
    const win = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT }; // world==device for 1:1 placement
    const sg  = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);
    const { blit } = makeBlitter(sk);

    // Helpers -----------------------------------------------------
    const box = (w, h, fill, stroke = null, sw = 0, x = 0, y = 0) => {
        const b = sg.rectangle(w, h, fill, stroke, sw); b.x = x; b.y = y; return b;
    };
    const putCenter = (a, b, xOffset = 0, yOffset = 0) => {
        b.x = a.x + a.width * 0.5 - b.width * 0.5 + xOffset;
        b.y = a.y + a.height * 0.5 - b.height * 0.5 + yOffset;
    };
    const putTop = (a, b, xOffset = 0, yOffset = 0) => {
        b.x = a.x + a.width * 0.5 - b.width * 0.5 + xOffset;
        b.y = a.y - b.height + yOffset;
    };
    const putRight = (a, b, xOffset = 0, yOffset = 0) => {
        b.x = a.x + a.width + xOffset;
        b.y = a.y + a.height * 0.5 - b.height * 0.5 + yOffset;
    };
    const putBottom = (a, b, xOffset = 0, yOffset = 0) => {
        b.x = a.x + a.width * 0.5 - b.width * 0.5 + xOffset;
        b.y = a.y + a.height + yOffset;
    };
    const putLeft = (a, b, xOffset = 0, yOffset = 0) => {
        b.x = a.x - b.width + xOffset;
        b.y = a.y + a.height * 0.5 - b.height * 0.5 + yOffset;
    };

    // Nodes -------------------------------------------------------
    let blueBox, pinkBox, message, goldBox, grayBox;

    // Load images in setup (p5 instance-mode)
    let imgTiger = null, imgHedgehog = null, imgCat = null;

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

            // Parent-child relationships
            blueBox = box(96, 96, sk.color(0, 114, 255), null, 0, 54, 64);
            blueBox.pivotX = 0.25; blueBox.pivotY = 0.25;

            goldBox = box(64, 64, sk.color(255, 207, 64));
            blueBox.addChild(goldBox);
            goldBox.x = 24; goldBox.y = 24;

            grayBox = box(48, 48, sk.color(140));
            goldBox.addChild(grayBox);
            grayBox.x = 8; grayBox.y = 8;

            pinkBox = box(24, 24, sk.color(255, 105, 180));
            grayBox.addChild(pinkBox);
            pinkBox.x = 8; pinkBox.y = 8;
            pinkBox.pivotX = 0.75; pinkBox.pivotY = 0.75;

            // Transforms
            blueBox.rotation = 0.8;
            grayBox.rotation = 0.3;
            blueBox.scaleX = 1.5;
            blueBox.alpha = 0.5;
            grayBox.alpha = 0.5;

            // Depth layering
            const redBox    = box(64, 64, sk.color(220,30,30), sk.color(0), 4, 220, 180);
            const greenBox  = box(64, 64, sk.color(154,205,50), sk.color(0), 4, 200, 200);
            const violetBox = box(64, 64, sk.color(148,0,211),  sk.color(0), 4, 180, 220);
            redBox.layer = 1;
            // swap depths of red and green at the root
            sg.root.add(blueBox, redBox, greenBox, violetBox);
            sg.root.swapChildren(redBox, greenBox);

            // Positioning helpers
            const limeBox = box(64, 64, sk.color(0, 255, 0));
            limeBox.shadow = true; limeBox.x = 350; limeBox.y = 80; sg.root.add(limeBox);

            const brownBox = box(32, 32, sk.color(165, 42, 42)); sg.root.add(brownBox); putTop(limeBox, brownBox, 0, -16);
            const navyBox  = box(32, 32, sk.color(0, 0, 128));   sg.root.add(navyBox);  putRight(limeBox, navyBox, 16, 0);
            const peruBox  = box(32, 32, sk.color(205, 133, 63));sg.root.add(peruBox);  putBottom(limeBox, peruBox, 0, 16);
            const wheatBox = box(32, 32, sk.color(245, 222, 179));sg.root.add(wheatBox);putLeft(limeBox, wheatBox, -16, 0);
            const hotPinkBox = box(32, 32, sk.color(255, 105, 180)); sg.root.add(hotPinkBox); putCenter(limeBox, hotPinkBox);

            // Circle
            const cyanCircle = sg.circle(64, sk.color(0, 255, 255), sk.color(255,0,0), 4); cyanCircle.x = 64; cyanCircle.y = 280; sg.root.add(cyanCircle);

            // Lines
            sg.root.add(
                sg.line(200, 64, 264, 128, sk.color(0), 4),
                sg.line(200, 128, 264, 64, sk.color(255,0,0), 4),
                sg.line(264, 96, 200, 96, sk.color(0,255,0), 4),
                sg.line(232, 128, 232, 64, sk.color(0,0,255), 4)
            );

            // Text
            message = sg.text("Hello World!", 24, "Futura, sans-serif", sk.color(0));
            message.x = 330; message.y = 230; sg.root.add(message);

            // Group width/height test
            const groupBox = sg.group(redBox, greenBox, violetBox);
            // groupBox width/height are inferred during grid helper in our API; here we just keep reference
            // Add images once loaded
            imgCat = sk.loadImage("images/cat.png");
            imgTiger = sk.loadImage("images/tiger.png");
            imgHedgehog = sk.loadImage("images/hedgehog.png");
        },

        display() {
            // Animations like the original
            blueBox.rotation += 0.01;
            goldBox.rotation -= 0.02;
            pinkBox.rotation += 0.03;
            message.rotation += 0.01;

            sk.background(255);

            // World pass
            sg.render();

            // Device-space: blit the tiger as a reference at bottom-right if loaded
            if (imgTiger) blit(imgTiger, 420, 420, 64, 64);

            // Also show sprites (scenegraph leaves) when available
            if (imgCat) {
                const s = sg.sprite(imgCat); s.x = 64; s.y = 410; s.width = 64; s.height = 64; sg.root.add(s);
                // Add once; prevent re-adding every frame
                imgCat = null;
            }
            if (imgTiger) {
                const s = sg.sprite(imgTiger); s.x = 192; s.y = 410; s.width = 64; s.height = 64; sg.root.add(s);
                imgTiger = null; // add once
            }
            if (imgHedgehog) {
                const s = sg.sprite(imgHedgehog); s.x = 320; s.y = 410; s.width = 64; s.height = 64; sg.root.add(s);
                imgHedgehog = null; // add once
            }

            // HUD
            sk.resetMatrix();
            sk.fill(0);
            sk.textSize(12);
            sk.text("All the sprites demo (no atlas) — tiger/hedgehog/cat", 10, 18);
        }
    };
};

export default createScenegraphAllSpritesDemo;
