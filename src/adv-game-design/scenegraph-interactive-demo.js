// src/adv-game-design/scenegraph-interactive-demo.js

import { createScenegraph } from "./library/scenegraph";
import { assets } from "./library/utilities";

import {
    buttons,
    draggableNodes,
    makeInteractive,
    makeButton,
    makeDraggable,
    updateButtons,
    updateDragAndDrop
} from "./library/scenegraph-interactive";

import { frames } from "./library/scenegraph-behaviors";
import { createPointer } from "./library/scenegraph-pointer";

export const createScenegraphInteractiveDemo = (
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 360
) => {
    // World = device pixels (Y-up handled by scenegraph renderer)
    const worldWin = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg       = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);

    const SHEET_PATH = "images/spaceship.png"; // reuse sheet
    const FONT_PATH  = "fonts/PetMe64.ttf";

    let buttonNode = null;
    let dragNode   = null;
    let fontFamily = "sans-serif";

    // Scenegraph-aware pointer (uses sg.COMPOSITE)
    const pointer = createPointer(sk, sg);

    const buildScene = () => {
        fontFamily = assets[FONT_PATH] || "sans-serif";

        // Background
        const bg = sg.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT, sk.color(12, 12, 26));
        bg.x = 0;
        bg.y = 0;
        bg.pivotX = 0;
        bg.pivotY = 0;
        bg.layer = 0;
        sg.root.add(bg);

        // --- Button sprite using the spaceship strip ------------------------
        const sheetImage  = assets[SHEET_PATH];
        const frameWidth  = 32;
        const frameHeight = 32;
        const spacing     = 2;

        // Use first 3 frames of the row sheet for up/over/down
        const positions = [];
        for (let i = 0; i < 3; i += 1) {
            const sx = 2 + i * (frameWidth + spacing);
            const sy = 2;
            positions.push([sx, sy]);
        }
        const sheet = frames(sheetImage, positions, frameWidth, frameHeight);

        buttonNode = sg.sprite(sheet);
        buttonNode.width  = 64;
        buttonNode.height = 64;
        buttonNode.pivotX = 0.5;
        buttonNode.pivotY = 0.5;
        buttonNode.x = CANVAS_WIDTH * 0.3;
        buttonNode.y = CANVAS_HEIGHT * 0.5;
        buttonNode.layer = 1;
        sg.root.add(buttonNode);

        // Mark as button + interactive
        buttonNode._button = true;
        makeInteractive(buttonNode);

        buttonNode.press = () => {
            console.log("Button pressed");
        };
        buttonNode.tap = () => {
            console.log("Button tapped");
        };

        // --- Draggable circle ----------------------------------------------
        dragNode = sg.circle(40, sk.color(80, 220, 255), null, 0);
        dragNode.x = CANVAS_WIDTH * 0.7;
        dragNode.y = CANVAS_HEIGHT * 0.5;
        dragNode.layer = 1;
        sg.root.add(dragNode);

        makeDraggable(dragNode);

        // Label
        const label = sg.text(
            "Left: interactive button (over/down frames). Right: draggable circle.",
            14,
            fontFamily,
            sk.color(255)
        );
        label.x = 12;
        label.y = CANVAS_HEIGHT - 32;
        label.pivotX = 0;
        label.pivotY = 0;
        label.layer = 2;
        sg.root.add(label);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(0);

            assets
                .load(
                    [
                        SHEET_PATH,
                        FONT_PATH
                    ],
                    sk
                )
                .then(() => {
                    buildScene();
                });
        },

        display() {
            // Update pointer from current p5 state (mouseX/Y, mouseIsPressed)
            pointer.update();

            // Interactive + drag use the shared pointer object
            updateButtons(pointer);
            updateDragAndDrop(pointer, sk);

            // Render scenegraph
            sk.background(10);
            sg.render();

            // Device-space HUD
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(12);
            sk.text(
                "scenegraph-interactive: hover/click spaceship; drag the circle.",
                10,
                20
            );
        }
    };
};


