// src/adv-game-design/scenegraph-tiling-masked-anim-demo.js
// Demo: masking + tilingSprite + sprite animation using assets loader
// World coordinates = device pixels for simplicity

import { createScenegraph } from "./library/scenegraphX";
import { assets } from "./library/utilities";

export const createScenegraphTilingMaskedAnimDemo = (sk, CANVAS_WIDTH = 640, CANVAS_HEIGHT = 360) => {
    const win = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg  = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);

    // Nodes we fill after assets load
    let tilePane = null;        // tilingSprite inside a masked window
    let animSprite = null;      // animated sprite built from 3 images
    let label = null;

    // Scroll parameters
    let t = 0; // time accumulator
    let scrollSpeedX = 40; // px/sec
    let scrollSpeedY = 18; // px/sec

    const buildScene = () => {
        // Background tint
        const bg = sg.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT, sk.color(18));
        bg.x = 0; bg.y = 0; sg.root.add(bg);

        // --- Masked tiling window -------------------------------------------------
        // Create a rectangular window in the center; the tilingSprite inside it is clipped
        // sg.tilingSprite internally creates a rectangle(mask=true) + grid of image tiles
        const TW = Math.min(420, CANVAS_WIDTH - 40);
        const TH = Math.min(200, CANVAS_HEIGHT - 60);

        tilePane = sg.tilingSprite(TW, TH, assets["images/tiger.png"], 0, 0);
        // center it
        tilePane.x = (CANVAS_WIDTH - TW) * 0.5;
        tilePane.y = (CANVAS_HEIGHT - TH) * 0.5;
        sg.root.add(tilePane);

        // a thin border around the window (device-space-like thickness via pixelToWorld)
        const border = sg.rectangle(TW, TH, null, sk.color(255), 2);
        border.x = tilePane.x; border.y = tilePane.y; border.pivotX = 0; border.pivotY = 0; sg.root.add(border);

        // --- Animated sprite -------------------------------------------------------
        // Build from 3 separate images as frames (cat → tiger → hedgehog)
        const frames = [ assets["images/cat.png"], assets["images/tiger.png"], assets["images/hedgehog.png"] ];
        animSprite = sg.sprite(frames);
        animSprite.fps = 4;     // 4 frames per second
        animSprite.loop = true;
        animSprite.play();

        // Scale down a bit and place it above the window
        const s = 0.6;
        animSprite.scaleX = s; animSprite.scaleY = s;
        animSprite.x = CANVAS_WIDTH * 0.5 - (animSprite.width*s)*0.5;
        animSprite.y = tilePane.y - (animSprite.height*s) - 12;
        animSprite.shadow = true;
        sg.root.add(animSprite);

        // --- Label (device-space HUD look, but still world coords) -----------------
        label = sg.text("Masked tiling + animated sprite", 16, "sans-serif", sk.color(255));
        label.x = 12; label.y = 16; label.pivotX = 0; label.pivotY = 0; sg.root.add(label);
    };

    return {
        setup(){
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(18);
            // Preload needed assets and then build
            assets.load([
                "images/tiger.png",
                "images/cat.png",
                "images/hedgehog.png",
            ], sk).then(() => {
                buildScene();
            });
        },
        display(){
            // simple time step for tiling scroll
            const dt = 1/60; // p5 draw runs ~60fps; animation in sg is time-based anyway
            t += dt;
            if (tilePane){
                tilePane.tileX = Math.cos(t*0.5) * (scrollSpeedX * dt) + tilePane.tileX;
                tilePane.tileY = Math.sin(t*0.7) * (scrollSpeedY * dt) + tilePane.tileY;
            }

            // Gentle bob on the animated sprite
            if (animSprite){
                animSprite.y += Math.sin(t*2.2) * 0.25; // sub-pixel motion is fine
                animSprite.rotation = 0.05 * Math.sin(t*1.3);
            }

            // Render whole scene (applies COMPOSITE once)
            sg.render();

            // Minimal HUD instructions
            sk.resetMatrix();
            sk.noStroke(); sk.fill(255); sk.textSize(12);
            sk.text("This window is clipped (mask=true). Background tiles scroll; sprite animates from 3 images.", 10, CANVAS_HEIGHT - 12);
        }
    };
};

export default createScenegraphTilingMaskedAnimDemo;
