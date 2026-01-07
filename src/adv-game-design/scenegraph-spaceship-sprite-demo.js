// src/adv-game-design/scenegraph-spaceship-sprite-demo.js
// Demo: use scenegraph.sprite(...) with an array of atlas frame objects,
// show an animated ship in the center, and a static strip of all frames
// for quick visual verification.

import { createScenegraph } from "./library/scenegraph";
import { assets } from "./library/utilities";

export const createScenegraphSpaceshipSpriteDemo = (
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 360
) => {
    // World in pixel coordinates; Y-up handled inside scenegraph renderer.
    const worldWin = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg       = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);

    // --- CONFIG --------------------------------------------------------
    const ATLAS_JSON = "images/spaceship_atlas.json";

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

    const FONT_PATH = "fonts/PetMe64.ttf";

    let shipSprite      = null;   // animated sprite in the center
    let previewStrip    = null;   // group of sprites showing all frames
    let fontFamily      = "sans-serif";
    let frames          = [];     // array of atlas frame objects
    let t               = 0;      // time accumulator
    let atlasDebugLabel = null;

    const buildScene = () => {
        // Atlas JSON (mostly for logging; actual frames come from assets[frameName])
        const atlas = assets[ATLAS_JSON];
        if (!atlas) {
            console.warn("Atlas JSON not found in assets:", ATLAS_JSON);
        }

        // Collect atlas frames from assets
        frames = FRAME_NAMES
            .map((name) => assets[name])
            .filter((entry) => entry && entry.frame && entry.source);

        console.log("✅ Atlas JSON:", atlas);
        console.log("✅ Atlas frames:", frames);

        if (!frames.length) {
            console.warn("No atlas frames found for spaceship animation.");
            return;
        }

        fontFamily = assets[FONT_PATH] || "sans-serif";

        // Background rectangle
        const bg = sg.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT, sk.color(8, 8, 20));
        bg.x = 0;
        bg.y = 0;
        bg.pivotX = 0;
        bg.pivotY = 0;
        bg.layer = 0;
        sg.root.add(bg);

        // Animated spaceship sprite in the center
        shipSprite = sg.sprite(frames);
        shipSprite.pivotX = 0.5;
        shipSprite.pivotY = 0.5;
        shipSprite.scaleX = 3;
        shipSprite.scaleY = 3;
        shipSprite.shadow = true;
        shipSprite.layer  = 2;
        shipSprite.x = CANVAS_WIDTH * 0.5;
        shipSprite.y = CANVAS_HEIGHT * 0.5;
        shipSprite.gotoAndStop(0);
        sg.root.add(shipSprite);

        // Preview strip: one sprite per frame, laid out in a row
        previewStrip = sg.group();
        previewStrip.layer = 1;
        previewStrip.x = CANVAS_WIDTH * 0.5;
        previewStrip.y = CANVAS_HEIGHT - 80;
        previewStrip.pivotX = 0.5;
        previewStrip.pivotY = 0.5;

        const spacing = 10;
        const scale   = 2;

        frames.forEach((_, i) => {
            const s = sg.sprite(frames);
            s.gotoAndStop(i);
            s.pivotX = 0.5;
            s.pivotY = 0.5;
            s.scaleX = scale;
            s.scaleY = scale;

            const stepX = (s.width * scale) + spacing;
            s.x = i * stepX;
            s.y = 0;

            previewStrip.addChild(s);
        });

        // After adding children, center the strip around its pivot
        if (previewStrip.children.length > 0) {
            const lastChild = previewStrip.children[previewStrip.children.length - 1];
            const totalWidth = lastChild.x + lastChild.width * scale;
            // move children so that strip is centered around (0,0) with pivot 0.5
            previewStrip.children.forEach((child) => {
                child.x -= totalWidth * 0.5;
            });
        }

        sg.root.add(previewStrip);

        // Label in world space
        const label = sg.text(
            "Scenegraph sprite from atlas frames",
            16,
            fontFamily,
            sk.color(255)
        );
        label.x = 12;
        label.y = 20;
        label.pivotX = 0;
        label.pivotY = 0;
        label.layer  = 3;
        sg.root.add(label);

        // Debug label showing current frame index
        atlasDebugLabel = sg.text(
            "Frame: 0",
            14,
            fontFamily,
            sk.color(200, 220, 255)
        );
        atlasDebugLabel.x = 12;
        atlasDebugLabel.y = 44;
        atlasDebugLabel.pivotX = 0;
        atlasDebugLabel.pivotY = 0;
        atlasDebugLabel.layer  = 3;
        sg.root.add(atlasDebugLabel);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);

            assets
                .load(
                    [
                        ATLAS_JSON,
                        FONT_PATH
                    ],
                    sk
                )
                .then(() => {
                    buildScene();
                });
        },

        display() {
            const dt = 1 / 60;
            t += dt;

            if (shipSprite && frames.length > 0) {
                const fps        = 10;
                const frameIndex = Math.floor(t * fps) % frames.length;

                // Animate atlas-based sprite
                shipSprite.gotoAndStop(frameIndex);

                // Simple bob + slight rotation to make it feel alive
                shipSprite.y = CANVAS_HEIGHT * 0.5 + sk.sin(t * 2.0) * 10;
                shipSprite.rotation = 0.25 * sk.sin(t * 1.3);

                // Update debug label
                if (atlasDebugLabel) {
                    atlasDebugLabel.content = `Frame: ${frameIndex}`;
                    // mark as needing re-measure next draw
                    atlasDebugLabel._measured = false;
                }
            }

            sk.background(12);
            sg.render();   // scenegraph handles COMPOSITE internally

            // Optional HUD in device space
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(12);
            sk.text(
                "Top strip: all atlas frames. Center ship: animated via sg.sprite(frames[]) + gotoAndStop().",
                10,
                CANVAS_HEIGHT - 10
            );
        }
    };
};

export default createScenegraphSpaceshipSpriteDemo;
