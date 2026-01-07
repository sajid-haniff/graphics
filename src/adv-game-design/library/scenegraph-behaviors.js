// src/adv-game-design/library/scenegraph-behaviors.js
// Extra behaviors layered on top of the functional scenegraph:
//  - frame / frames helpers (for manual frame descriptions)
//  - attachStatePlayer(sprite) for timed animation playback
//  - particles: emitter(...) / particleEffect(...)
//  - shake(node, magnitude, angular)
//
// These are intentionally separate from scenegraph.js to keep the core
// node+renderer stack lean. They operate on any "sprite-like" node that has
// x, y, width, height, rotation, alpha, parent, and (for state player) frames.
//
// Usage examples (pseudo):
//   import { createScenegraph } from "./scenegraph";
//   import { attachStatePlayer, particleEffect, shake } from "./scenegraph-behaviors";
//
//   const sg = createScenegraph(sk, W, H, worldWin);
//   const ship = sg.sprite(frames);
//   attachStatePlayer(ship);
//   ship.play(); // uses internal timer via setInterval
//
//   particleEffect({ spriteFunction: () => sg.circle(10, sk.color(255,0,0)) });
//   shake(ship, 16, false);

import { remove } from "./scenegraph";

// ------------------------------------------------------------
// Frame helpers (ported from display.js)
// ------------------------------------------------------------

/**
 * Create a single frame description.
 * Matches the old `frame(source, x, y, width, height)` shape.
 */
export const frame = (image, x, y, width, height) => ({
    image,
    x,
    y,
    width,
    height,
});

/**
 * Create a frames sheet description:
 *   { image, data: [[x,y],...], width, height }
 * This is compatible with scenegraph.sprite's filmstrip branch.
 */
export const frames = (image, arrayOfPositions, width, height) => ({
    image,
    data: arrayOfPositions,
    width,
    height,
});

// ------------------------------------------------------------
// State player (animation) for sprite nodes
// ------------------------------------------------------------

/**
 * Attach playback controls to a sprite node that has frames:
 *  - node._frames (from scenegraph.sprite)
 *  - node.gotoAndStop(i)
 *
 * It adds:
 *  - node.show(frameIndex)
 *  - node.play()
 *  - node.stop()
 *  - node.playSequence([start, end])
 *
 * Uses setInterval internally, like the original display.js.
 */
export const attachStatePlayer = (sprite) => {
    // scenegraph.sprite stores frames in _frames; mirror them for convenience
    if (!sprite._frames || !sprite._frames.length) return sprite;

    if (!sprite.frames) sprite.frames = sprite._frames;
    if (sprite.loop === undefined) sprite.loop = true;
    if (sprite.currentFrame === undefined) sprite.currentFrame = 0;
    if (sprite.playing === undefined) sprite.playing = false;
    if (sprite.fps === undefined) sprite.fps = 12;

    let state = {
        frameCounter: 0,
        numberOfFrames: 0,
        startFrame: 0,
        endFrame: 0,
        timerId: null,
    };

    const updateState = (patch) => {
        state = { ...state, ...patch };
    };

    const reset = () => {
        if (state.timerId && sprite.playing) {
            sprite.playing = false;
            updateState({
                frameCounter: 0,
                startFrame: 0,
                endFrame: 0,
                numberOfFrames: 0,
            });
            clearInterval(state.timerId);
            state.timerId = null;
        }
    };

    const show = (frameNumber) => {
        reset();
        sprite.currentFrame = frameNumber;
        sprite.gotoAndStop(frameNumber);
    };

    const playSequence = (sequenceArray) => {
        const [start, end] = sequenceArray;
        reset();

        const initialFrameCounter = start === 0 ? 1 : 0;
        const numberOfFrames =
            end - start + (start === 0 ? 1 : 0);

        updateState({
            startFrame: start,
            endFrame: end,
            numberOfFrames,
            frameCounter: initialFrameCounter,
        });

        // If there's only one frame, force two steps so we still advance once.
        if (state.numberOfFrames === 1) {
            updateState({
                numberOfFrames: 2,
                frameCounter: state.frameCounter + 1,
            });
        }

        sprite.currentFrame = start;
        sprite.gotoAndStop(start);

        if (!sprite.playing) {
            const frameRateMs = 1000 / (sprite.fps || 12);

            const advanceFrame = () => {
                if (state.frameCounter < state.numberOfFrames) {
                    sprite.currentFrame += 1;
                    sprite.gotoAndStop(sprite.currentFrame);
                    updateState({
                        frameCounter: state.frameCounter + 1,
                    });
                } else if (sprite.loop) {
                    sprite.currentFrame = state.startFrame;
                    sprite.gotoAndStop(state.startFrame);
                    updateState({ frameCounter: 1 });
                }
            };

            sprite.playing = true;
            state.timerId = setInterval(advanceFrame, frameRateMs);
        }
    };

    const play = () => {
        if (!sprite.playing) {
            playSequence([0, sprite.frames.length - 1]);
        }
    };

    const stop = () => {
        if (sprite.playing) {
            reset();
            sprite.gotoAndStop(sprite.currentFrame);
        }
    };

    Object.assign(sprite, { show, play, stop, playSequence });

    return sprite;
};

// ------------------------------------------------------------
// Particles / emitter (ported from display.js)
// ------------------------------------------------------------

export const particles = [];

/**
 * Simple interval-based emitter. Calls particleFunction every `interval` ms
 * until stop() is called.
 */
export const emitter = (interval, particleFunction) => {
    let state = { playing: false, timerId: null };

    const play = () => {
        if (!state.playing) {
            particleFunction();
            state.playing = true;
            state.timerId = setInterval(particleFunction, interval);
        }
    };

    const stop = () => {
        if (state.playing) {
            clearInterval(state.timerId);
            state.playing = false;
            state.timerId = null;
        }
    };

    return { play, stop };
};

/**
 * Particle effect helper. Creates multiple particles and pushes them into
 * the exported `particles` array. Each particle is expected to be a
 * scenegraph node with:
 *   x, y, width, height, halfWidth, halfHeight,
 *   vx, vy, scaleX, scaleY, rotation, alpha,
 *   parent (so remove(...) can detach it).
 *
 * You must provide spriteFunction, which should create and return a
 * *scenegraph node* (typically via sg.sprite(...) or sg.circle(...)).
 *
 * Example:
 *   particleEffect({
 *     x: 0, y: 0,
 *     spriteFunction: () => sg.sprite(frames),
 *     numberOfParticles: 20,
 *   });
 */
export const particleEffect = ({
                                   x = 0,
                                   y = 0,
                                   spriteFunction,
                                   numberOfParticles = 10,
                                   gravity = 0,
                                   randomSpacing = true,
                                   minAngle = 0,
                                   maxAngle = 6.28,
                                   minSize = 4,
                                   maxSize = 16,
                                   minSpeed = 0.1,
                                   maxSpeed = 1,
                                   minScaleSpeed = 0.01,
                                   maxScaleSpeed = 0.05,
                                   minAlphaSpeed = 0.02,
                                   maxAlphaSpeed = 0.02,
                                   minRotationSpeed = 0.01,
                                   maxRotationSpeed = 0.03,
                               } = {}) => {
    if (!spriteFunction) {
        throw new Error("particleEffect: spriteFunction is required.");
    }

    const randomFloat = (min, max) => min + Math.random() * (max - min);
    const randomInt = (min, max) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    const angles = Array.from({ length: numberOfParticles }, (_, i) =>
        randomSpacing
            ? randomFloat(minAngle, maxAngle)
            : minAngle +
            (i * (maxAngle - minAngle)) /
            Math.max(1, numberOfParticles - 1)
    );

    angles.forEach((angle) => {
        const particle = spriteFunction();
        if (!particle) return;

        // If particle has frames, randomize starting frame
        if (particle._frames && particle._frames.length > 0) {
            const index = randomInt(0, particle._frames.length - 1);
            if (typeof particle.gotoAndStop === "function") {
                particle.gotoAndStop(index);
            }
        }

        // Place at center
        particle.x = x - (particle.halfWidth || particle.width / 2 || 0);
        particle.y = y - (particle.halfHeight || particle.height / 2 || 0);

        // Randomize size
        const size = randomInt(minSize, maxSize);
        particle.width = size;
        particle.height = size;

        // Per-particle animation speeds
        particle.scaleX = particle.scaleX ?? 1;
        particle.scaleY = particle.scaleY ?? 1;
        particle.scaleSpeed = randomFloat(minScaleSpeed, maxScaleSpeed);
        particle.alpha = particle.alpha ?? 1;
        particle.alphaSpeed = randomFloat(minAlphaSpeed, maxAlphaSpeed);
        particle.rotation = particle.rotation ?? 0;
        particle.rotationSpeed = randomFloat(minRotationSpeed, maxRotationSpeed);

        // Velocity
        const speed = randomFloat(minSpeed, maxSpeed);
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;

        // Update function to be called once per frame by user code
        particle.update = () => {
            particle.vy += gravity;
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.scaleX - particle.scaleSpeed > 0) {
                particle.scaleX -= particle.scaleSpeed;
            }
            if (particle.scaleY - particle.scaleSpeed > 0) {
                particle.scaleY -= particle.scaleSpeed;
            }

            particle.rotation += particle.rotationSpeed;
            particle.alpha -= particle.alphaSpeed;

            if (particle.alpha <= 0) {
                remove(particle);
                const i = particles.indexOf(particle);
                if (i >= 0) particles.splice(i, 1);
            }
        };

        particles.push(particle);
    });
};

// ------------------------------------------------------------
// Shake effect (ported from display.js)
// ------------------------------------------------------------

export const shakingNodes = [];

/**
 * Apply a temporary shake effect to a node.
 *  - magnitude: max displacement (pixels) or rotation (radians)
 *  - angular: if true, shakes in rotation; otherwise shakes in x/y.
 *
 * Adds node.updateShake(), which you should call each frame while the
 * node is shaking. When shaking finishes, updateShake is effectively
 * a no-op and the node is removed from shakingNodes.
 */
export const shake = (node, magnitude = 16, angular = false) => {
    const randomInt = (min, max) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    if (shakingNodes.includes(node)) return;

    let state = {
        counter: 1,
        numberOfShakes: 10,
        startX: node.x,
        startY: node.y,
        startAngle: node.rotation || 0,
        magnitude,
    };

    shakingNodes.push(node);

    node.updateShake = () => {
        const magnitudeUnit = state.magnitude / state.numberOfShakes;

        if (angular) {
            if (state.counter < state.numberOfShakes) {
                node.rotation = state.startAngle;
                state = { ...state, magnitude: state.magnitude - magnitudeUnit };
                node.rotation = state.magnitude * (state.counter % 2 ? 1 : -1);
                state = { ...state, counter: state.counter + 1 };
            } else {
                node.rotation = state.startAngle;
                const i = shakingNodes.indexOf(node);
                if (i >= 0) shakingNodes.splice(i, 1);
            }
        } else {
            if (state.counter < state.numberOfShakes) {
                node.x = state.startX;
                node.y = state.startY;

                state = { ...state, magnitude: state.magnitude - magnitudeUnit };
                node.x += randomInt(-state.magnitude, state.magnitude);
                node.y += randomInt(-state.magnitude, state.magnitude);
                state = { ...state, counter: state.counter + 1 };
            } else {
                node.x = state.startX;
                node.y = state.startY;
                const i = shakingNodes.indexOf(node);
                if (i >= 0) shakingNodes.splice(i, 1);
            }
        }
    };
};
