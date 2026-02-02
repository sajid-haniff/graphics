// src/adv-game-design/library/scenegraph-interactive.js
// Extra interactive behaviors layered on top of the functional scenegraph:
//
//  - buttons: press / release / over / out / tap callbacks
//  - draggable nodes + drag-and-drop
//
// These helpers do NOT talk to p5 directly. They only depend on a "pointer"
// object that looks like:
//   {
//     x, y,            // world coords
//     isDown, isUp,    // booleans
//     tapped?,         // optional (if you want tap semantics)
//     hitTestSprite(node) -> boolean
//   }
//
// Typical usage in a demo:
//
//   const sg = createScenegraph(sk, W, H, worldWin);
//   const pointer = { ... }; // updated each frame from sk.mouseX/Y etc.
//
//   const button = sg.sprite(sheet);
//   button._button = true;   // enable auto frame switching
//   makeInteractive(button);
//
//   const box = sg.rectangle(...);
//   makeDraggable(box);
//
//   display() {
//     pointer.update();
//     updateButtons(pointer);
//     updateDragAndDrop(pointer, sk);
//     sg.render();
//   }

export const buttons = [];
export const draggableNodes = [];

// ------------------------------------------------------------
// Draggable helper
// ------------------------------------------------------------
export const makeDraggable = (node) => {
    if (!node) return node;
    node.draggable = true;
    if (!draggableNodes.includes(node)) draggableNodes.push(node);
    return node;
};

// ------------------------------------------------------------
// Interactive (button-style) helper
// ------------------------------------------------------------
export const makeInteractive = (node) => {
    if (!node) return node;

    // Bridge scenegraph.sprite's internal frame storage:
    // sprite(...) stores frames in _frames; interactive logic expects frames.
    if (!node.frames && node._frames) {
        node.frames = node._frames;
    }

    // Public callbacks (user can assign)
    node.press   = null;
    node.release = null;
    node.over    = null;
    node.out     = null;
    node.tap     = null;

    if (!buttons.includes(node)) buttons.push(node);

    // Internal state per node (closure)
    let state = {
        phase: "up",   // "up" | "over" | "down"
        pressed: false,
        hover: false,
    };

    node.updateInteractive = (pointer) => {
        if (!pointer) return;

        const hit    = pointer.hitTestSprite ? pointer.hitTestSprite(node) : false;
        const isDown = !!pointer.isDown;

        // Determine phase: prioritize hit status first
        let phase;
        if (hit && isDown) {
            phase = "down";
        } else if (hit) {
            phase = "over";
        } else {
            phase = "up";
        }

        // Auto frame switching for "button" sprites:
        // - node._button must be true
        // - node.frames should be an array (filmstrip/frames or image array)
        // - node.gotoAndStop(i) must exist
        if (node._button && node.frames && node.frames.length && typeof node.gotoAndStop === "function") {
            const n = node.frames.length;
            if (n === 3) {
                // [up, over, down] = [0, 1, 2]
                node.gotoAndStop(
                    phase === "up"   ? 0 :
                        phase === "over" ? 1 :
                            2
                );
            } else if (n === 2) {
                // [up, down] = [0, 1]
                node.gotoAndStop(phase === "up" ? 0 : 1);
            }
        }

        // Events:
        //  - press: pointer goes down on node
        //  - release: pointer goes up while over node after a press
        //  - tap: click/tap (down then up over node)
        //  - over: pointer enters node
        //  - out: pointer leaves node

        // Press: first time we see "down" while not already pressed
        if (phase === "down" && !state.pressed) {
            node.press && node.press();
            state.pressed = true;
        }

        // Over (hover) and release/tap
        if (phase === "over") {
            // If we were pressed and now over with pointer up, handle release/tap.
            // The pointer.tapped flag is optional; if you don't set it,
            // you'll still get release.
            if (state.pressed && pointer.isUp) {
                node.release && node.release();
                if (pointer.tapped) node.tap && node.tap();
                state.pressed = false;
            }

            if (!state.hover) {
                node.over && node.over();
                state.hover = true;
            }
        }

        // Up: pointer not over node, or pointer up away from node
        if (phase === "up") {
            if (state.pressed) {
                // Pointer released away from node: release but no tap.
                node.release && node.release();
                state.pressed = false;
            }
            if (state.hover) {
                node.out && node.out();
                state.hover = false;
            }
        }

        state.phase = phase;
    };

    return node;
};

// Convenience: mark as "button" (enables auto frames) + makeInteractive.
export const makeButton = (node) => {
    if (!node) return node;
    node._button = true;
    return makeInteractive(node);
};

// Bulk update for all interactive nodes; call once per frame.
export const updateButtons = (pointer) => {
    buttons.forEach((b) => b.updateInteractive && b.updateInteractive(pointer));
};

// ------------------------------------------------------------
// Drag & Drop
// ------------------------------------------------------------

let dragNode = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// pointer.x / pointer.y are expected to be in WORLD coords.
export const updateDragAndDrop = (pointer, canvasOrSk) => {
    if (!pointer) return;

    const isDown = !!pointer.isDown;
    const isUp   = !!pointer.isUp;

    // Start drag
    if (isDown && !dragNode) {
        for (let i = draggableNodes.length - 1; i >= 0; i -= 1) {
            const node = draggableNodes[i];
            if (!node.draggable) continue;
            const hit = pointer.hitTestSprite ? pointer.hitTestSprite(node) : false;
            if (hit) {
                dragOffsetX = pointer.x - node.gx;
                dragOffsetY = pointer.y - node.gy;
                dragNode = node;

                // Bring to front in its parent's children array
                if (node.parent && node.parent.children) {
                    const children = node.parent.children;
                    const idx = children.indexOf(node);
                    if (idx >= 0) {
                        children.splice(idx, 1);
                        children.push(node);
                    }
                }
                break;
            }
        }
    } else if (isDown && dragNode) {
        // Continue drag
        dragNode.x = pointer.x - dragOffsetX;
        dragNode.y = pointer.y - dragOffsetY;
    }

    // End drag
    if (isUp) {
        dragNode = null;
    }

    // Optional cursor feedback if canvas or sk is provided
    if (canvasOrSk) {
        const canvas = canvasOrSk.canvas || canvasOrSk;
        const overAny = draggableNodes.some((node) =>
            node.draggable &&
            pointer.hitTestSprite &&
            pointer.hitTestSprite(node)
        );
        if (canvas && canvas.style) {
            canvas.style.cursor = overAny ? "pointer" : "auto";
        }
    }
};
