// src/adv-game-design/scenegraph-behaviors-spaceship-demo.js
// Demo: exercise scenegraph-behaviors on a spaceship sprite:
//  - frames(...) + sg.sprite(...)
//  - attachStatePlayer(sprite) for interval-based animation
//  - particleEffect(...) for explosions
//  - shake(node, magnitude, angular) for screen shake

import { createScenegraph } from "./library/scenegraph";
import { assets } from "./library/utilities";

import {
    frames,
    attachStatePlayer,
    particleEffect,
    particles,
    shake,
    shakingNodes,
} from "./library/scenegraph-behaviors";

export const createScenegraphBehaviorsSpaceshipDemo = (
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 360
) => {
    // World = device pixels (Y-up handled inside scenegraph renderer)
    const worldWin = { left: 0, right: CANVAS_WIDTH, bottom: 0, top: CANVAS_HEIGHT };
    const sg       = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, worldWin);

    // --- CONFIG --------------------------------------------------------
    // Row sprite sheet from your example (32x32, 8 frames, 2px margin & spacing)
    const SHEET_PATH = "images/spaceship.png";

    const FRAME_W   = 32;
    const FRAME_H   = 32;
    const MARGIN_X  = 2;
    const MARGIN_Y  = 2;
    const GAP_X     = 2;    // distance between frames horizontally
    const NUM_FRAMES = 8;

    const FONT_PATH = "fonts/PetMe64.ttf";

    // Scenegraph nodes / state
    let shipSprite  = null;
    let label       = null;
    let sheetFrames = null;   // frames(...) descriptor for the sheet
    let fontFamily  = "sans-serif";

    let lastClickTime = 0;

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------

    const makeFramePositions = () => {
        const positions = [];
        for (let i = 0; i < NUM_FRAMES; i += 1) {
            const x = MARGIN_X + i * (FRAME_W + GAP_X);
            const y = MARGIN_Y;
            positions.push([x, y]);
        }
        return positions;
    };

    const triggerExplosion = (x, y) => {
        if (!sheetFrames) return;

        particleEffect({
            x,
            y,
            spriteFunction: () => {
                const p = sg.sprite(sheetFrames);
                p.layer = 0.5;
                sg.root.add(p);
                return p;
            },
            numberOfParticles: 18,
            gravity: -0.01,
            minAngle: 0,
            maxAngle: Math.PI * 2,
            minSize: 8,
            maxSize: 18,
            minSpeed: 0.2,
            maxSpeed: 1.0,
            minScaleSpeed: 0.01,
            maxScaleSpeed: 0.04,
            minAlphaSpeed: 0.03,
            maxAlphaSpeed: 0.06,
            minRotationSpeed: 0.03,
            maxRotationSpeed: 0.1,
        });
    };

    const buildScene = () => {
        const sheetImage = assets[SHEET_PATH];
        fontFamily       = assets[FONT_PATH] || "sans-serif";

        if (!sheetImage) {
            console.warn("Sheet image not found in assets:", SHEET_PATH);
            return;
        }

        // 1) Build frames descriptor via scenegraph-behaviors.frames(...)
        const positions = makeFramePositions();
        sheetFrames = frames(sheetImage, positions, FRAME_W, FRAME_H);

        // 2) Create sprite from frames descriptor (uses scenegraph sprite renderer)
        shipSprite = sg.sprite(sheetFrames);
        shipSprite.pivotX = 0.5;
        shipSprite.pivotY = 0.5;
        shipSprite.scaleX = 3;
        shipSprite.scaleY = 3;
        shipSprite.shadow = true;
        shipSprite.layer  = 1;

        shipSprite.x = CANVAS_WIDTH * 0.5;
        shipSprite.y = CANVAS_HEIGHT * 0.5;

        // 3) Attach state player and start animation
        attachStatePlayer(shipSprite);
        shipSprite.fps  = 10;
        shipSprite.loop = true;
        shipSprite.play();

        sg.root.add(shipSprite);

        // Background
        const bg = sg.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT, sk.color(8, 8, 24));
        bg.x = 0;
        bg.y = 0;
        bg.pivotX = 0;
        bg.pivotY = 0;
        bg.layer  = 0;
        sg.root.add(bg);
        sg.root.swapChildren(bg, shipSprite); // ensure bg is behind

        // Label
        label = sg.text(
            "scenegraph-behaviors: frames + state player + particles + shake",
            16,
            fontFamily,
            sk.color(255)
        );
        label.x = 12;
        label.y = 20;
        label.pivotX = 0;
        label.pivotY = 0;
        label.layer  = 2;
        sg.root.add(label);
    };

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------
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

            // Simple click handler: explode + shake the ship on click
            sk.mousePressed = () => {
                const now = sk.millis ? sk.millis() : Date.now();
                if (now - lastClickTime < 150) return; // small debounce
                lastClickTime = now;

                if (!shipSprite) return;

                triggerExplosion(shipSprite.x, shipSprite.y);
                shake(shipSprite, 16, false);
            };
        },

        display() {
            // Update particles
            particles.forEach((p) => {
                if (p.update) p.update();
            });

            // Update active shakes
            shakingNodes.forEach((n) => {
                if (n.updateShake) n.updateShake();
            });

            // Gentle idle rotation so we see state player & shake interplay
            if (shipSprite && !shipSprite.playing) {
                // If you ever stop the state player, keep a little life.
                shipSprite.rotation += 0.01;
            }

            sk.background(10);
            sg.render();

            // Device-space HUD
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(12);
            sk.text(
                "Click to trigger particle explosion + shake (statePlayer runs via setInterval)",
                10,
                CANVAS_HEIGHT - 10
            );
        }
    };
};

export default createScenegraphBehaviorsSpaceshipDemo;
