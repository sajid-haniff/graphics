// src/adv-game-design/scenegraph-button-atlas-demo.js
// Demo: TexturePacker button atlas (up / over / down) + scenegraph-interactive.

import { createScenegraph } from "./library/scenegraph";
import { assets } from "./library/utilities";
import { frames } from "./library/scenegraph-behaviors";
import { makeInteractive, updateButtons } from "./library/scenegraph-interactive";

export const createScenegraphButtonAtlasDemo = (
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 360
) => {
    // World = device pixels, Y-up via scenegraph COMPOSITE
    const worldWin = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg       = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);

    const JSON_PATH = "images/button.json"; // your TexturePacker JSON
    let buttonNode  = null;
    let buttonState = "idle";
    let fontFamily  = "monospace";

    // Simple pointer in world coordinates
    const pointer = {
        x: 0,
        y: 0,
        isDown: false,
        isUp: true,
        tapped: false,
        _prevDown: false,

        update() {
            const mx = sk.mouseX;
            const my = sk.mouseY;

            // device (Y-down) -> world (Y-up)
            pointer.x = mx;
            pointer.y = CANVAS_HEIGHT - my;

            const down = !!sk.mouseIsPressed;
            pointer.isDown = down;
            pointer.isUp   = !down;
            pointer.tapped = !down && pointer._prevDown;
            pointer._prevDown = down;
        },

        hitTestSprite(node) {
            if (!node) return false;
            const left   = node.gx;
            const right  = node.gx + node.width;
            const bottom = node.gy;
            const top    = node.gy + node.height;
            return (
                pointer.x >= left && pointer.x <= right &&
                pointer.y >= bottom && pointer.y <= top
            );
        }
    };

    const buildButtonFromAtlas = () => {
        const atlasJson = assets[JSON_PATH];              // raw JSON
        const sheetImg  = assets[`images/${atlasJson.meta.image}`]; // "images/button.png"

        const { frames: f } = atlasJson;

        // Order: [up, over, down] to match makeInteractive's auto frame mapping
        const upFrame   = f["up.png"].frame;
        const overFrame = f["over.png"].frame;
        const downFrame = f["down.png"].frame;

        const positions = [
            [upFrame.x,   upFrame.y],   // index 0: up
            [overFrame.x, overFrame.y], // index 1: over
            [downFrame.x, downFrame.y], // index 2: down
        ];

        const frameW = upFrame.w;
        const frameH = upFrame.h;

        // frames(...) → filmstrip-compatible object for scenegraph.sprite
        const sheet = frames(sheetImg, positions, frameW, frameH);

        buttonNode = sg.sprite(sheet);
        buttonNode.width  = frameW;  // draw at native size
        buttonNode.height = frameH;
        buttonNode.pivotX = 0.5;
        buttonNode.pivotY = 0.5;
        buttonNode.x = CANVAS_WIDTH * 0.5;
        buttonNode.y = CANVAS_HEIGHT * 0.5;
        buttonNode.layer = 1;
        sg.root.add(buttonNode);

        // Mark as button so scenegraph-interactive auto-switches frames
        buttonNode._button = true;
        makeInteractive(buttonNode);

        // Hook up callbacks so we can verify behavior
        buttonNode.press = () => {
            buttonState = "pressed";
            console.log("Button press");
        };
        buttonNode.release = () => {
            buttonState = "released";
            console.log("Button release");
        };
        buttonNode.over = () => {
            buttonState = "over";
            console.log("Button over");
        };
        buttonNode.out = () => {
            buttonState = "out";
            console.log("Button out");
        };
        buttonNode.tap = () => {
            buttonState = "tapped";
            console.log("Button tap");
        };

        // Start in "up" visual state
        if (typeof buttonNode.gotoAndStop === "function") {
            buttonNode.gotoAndStop(0);
        }
    };

    const buildScene = () => {
        // Optional: background rect
        const bg = sg.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT, sk.color(16, 16, 32));
        bg.x = 0;
        bg.y = 0;
        bg.pivotX = 0;
        bg.pivotY = 0;
        bg.layer  = 0;
        sg.root.add(bg);

        // Font if you have one; otherwise keep default
        fontFamily = assets["fonts/PetMe64.ttf"] || "monospace";

        buildButtonFromAtlas();
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);

            assets
                .load(
                    [
                        JSON_PATH,             // TexturePacker JSON
                        "fonts/PetMe64.ttf"    // optional font
                    ],
                    sk
                )
                .then(() => {
                    console.log("✅ Button atlas JSON:", assets[JSON_PATH]);
                    console.log("✅ Button image:", assets["images/button.png"]);
                    console.log("Frame up.png:",   assets["up.png"]);
                    console.log("Frame over.png:", assets["over.png"]);
                    console.log("Frame down.png:", assets["down.png"]);
                    buildScene();
                });
        },

        display() {
            // Update pointer from p5
            pointer.update();

            // Update interactive state for all interactive nodes
            updateButtons(pointer);

            // Render world (Y-up)
            sk.background(0);
            sg.render();

            // Device-space HUD
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(14);
            sk.textFont(fontFamily);
            sk.textAlign(sk.LEFT, sk.TOP);
            sk.text(
                `Button atlas demo (up/over/down)\nstate: ${buttonState}`,
                10,
                10
            );
        }
    };
};

export default createScenegraphButtonAtlasDemo;
