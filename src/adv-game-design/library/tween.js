// src/adv-game-design/library/tween.js
// Tween helpers for scenegraph / sprites.
// Depends on an external game loop calling `tweens.forEach(t => t.update())`.

import { wait } from "./utilities";

/*
tweens
------
An array to store all the tweens in the game.
Call `tweens.forEach(t => t.update())` once per frame from your main loop.
*/
export let tweens = [];

// ------------------------------------------------------------
// EASING FUNCTIONS
// ------------------------------------------------------------

export const ease = {
    // Linear
    linear: (x) => x,

    // Smoothstep
    smoothstep: (x) => x * x * (3 - 2 * x),
    smoothstepSquared: (x) => {
        const s = x * x * (3 - 2 * x);
        return s * s;
    },
    smoothstepCubed: (x) => {
        const s = x * x * (3 - 2 * x);
        return s * s * s;
    },

    // Acceleration
    acceleration: (x) => x * x,
    accelerationCubed: (x) => {
        const a = x * x;
        return a * a * a;
    },

    // Deceleration
    deceleration: (x) => 1 - (1 - x) * (1 - x),
    decelerationCubed: (x) => 1 - Math.pow(1 - x, 3),

    // Sine-based
    sine: (x) => Math.sin((x * Math.PI) / 2),
    sineSquared: (x) => {
        const s = Math.sin((x * Math.PI) / 2);
        return s * s;
    },
    sineCubed: (x) => {
        const s = Math.sin((x * Math.PI) / 2);
        return s * s * s;
    },
    inverseSine: (x) => 1 - Math.sin(((1 - x) * Math.PI) / 2),
    inverseSineSquared: (x) => {
        const s = Math.sin(((1 - x) * Math.PI) / 2);
        return 1 - s * s;
    },
    inverseSineCubed: (x) => {
        const s = Math.sin(((1 - x) * Math.PI) / 2);
        return 1 - s * s * s;
    },

    // Spline (Catmull–Rom)
    spline: (t, p0, p1, p2, p3) =>
        0.5 *
        (
            (2 * p1) +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
        )
};

// Cubic Bezier helper for followCurve / walkCurve
const cubicBezier = (t, a, b, c, d) => {
    const t2 = t * t;
    const t3 = t2 * t;

    return (
        a +
        (-a * 3 + t * (3 * a - a * t)) * t +
        (3 * b + t * (-6 * b + 3 * b * t)) * t +
        (3 * c - 3 * c * t) * t2 +
        d * t3
    );
};

// ------------------------------------------------------------
// Core tween of a single numeric property
// ------------------------------------------------------------

export const tweenProperty = (
    sprite,                  // Sprite-like object
    property,                // String property name
    startValue,              // Start value
    endValue,                // End value
    totalFrames,             // Duration in frames
    type = ["smoothstep"],   // Easing type: ["smoothstep"] or ["spline", startMag, endMag]
    yoyo = false,            // Yoyo?
    delayBeforeRepeat = 0    // Delay before repeating when yoyo=true
) => {
    const tween = {};

    // Spline magnitudes if needed
    if (type[0] === "spline") {
        tween.startMagnitude = type[1];
        tween.endMagnitude = type[2];
    }

    // Start this tween instance
    tween.start = (startVal, endVal) => {
        // Clone values so references to sprite props become plain numbers
        tween.startValue = JSON.parse(JSON.stringify(startVal));
        tween.endValue = JSON.parse(JSON.stringify(endVal));

        tween.playing = true;
        tween.totalFrames = totalFrames;
        tween.frameCounter = 0;

        tweens.push(tween);
    };

    // Kick off immediately
    tween.start(startValue, endValue);

    tween.update = () => {
        if (!tween.playing) return;

        if (tween.frameCounter < tween.totalFrames) {
            const normalizedTime = tween.frameCounter / tween.totalFrames;

            let curvedTime;
            if (type[0] !== "spline") {
                // Regular ease function: type[0] -> "smoothstep", "sine", etc.
                const fn = ease[type[0]];
                curvedTime = fn ? fn(normalizedTime) : normalizedTime;
            } else {
                // Spline using stored magnitudes
                curvedTime = ease.spline(
                    normalizedTime,
                    tween.startMagnitude,
                    0,
                    1,
                    tween.endMagnitude
                );
            }

            // Interpolate property
            sprite[property] =
                tween.endValue * curvedTime +
                tween.startValue * (1 - curvedTime);

            tween.frameCounter += 1;
        } else {
            tween.end();
        }
    };

    tween.end = () => {
        tween.playing = false;

        if (tween.onComplete) tween.onComplete();

        const i = tweens.indexOf(tween);
        if (i >= 0) tweens.splice(i, 1);

        if (yoyo) {
            wait(delayBeforeRepeat).then(() => {
                tween.start(tween.endValue, tween.startValue);
            });
        }
    };

    tween.play = () => {
        tween.playing = true;
    };

    tween.pause = () => {
        tween.playing = false;
    };

    return tween;
};

// ------------------------------------------------------------
// High-level helpers
// ------------------------------------------------------------

export const fadeOut = (sprite, frames = 60) =>
    tweenProperty(sprite, "alpha", sprite.alpha, 0, frames, ["sine"]);

export const fadeIn = (sprite, frames = 60) =>
    tweenProperty(sprite, "alpha", sprite.alpha, 1, frames, ["sine"]);

export const pulse = (sprite, frames = 60, minAlpha = 0) =>
    tweenProperty(
        sprite,
        "alpha",
        sprite.alpha,
        minAlpha,
        frames,
        ["smoothstep"],
        true
    );

// ------------------------------------------------------------
// makeTween: group multiple tweenProperty calls
// ------------------------------------------------------------

const makeTween = (tweenArgsArray) => {
    const groupTween = {
        tweens: []
    };

    // Create tweens from the provided argument arrays
    tweenArgsArray.forEach((args) => {
        const t = tweenProperty(...args);
        groupTween.tweens.push(t);
    });

    let completionCounter = 0;

    groupTween.completed = () => {
        completionCounter += 1;

        if (completionCounter === groupTween.tweens.length) {
            if (groupTween.onComplete) groupTween.onComplete();
            completionCounter = 0;
        }
    };

    // Each tween signals completion back to the group
    groupTween.tweens.forEach((t) => {
        t.onComplete = () => groupTween.completed();
    });

    groupTween.pause = () => {
        groupTween.tweens.forEach((t) => {
            t.playing = false;
        });
    };

    groupTween.play = () => {
        groupTween.tweens.forEach((t) => {
            t.playing = true;
        });
    };

    return groupTween;
};

// ------------------------------------------------------------
// Composite / convenience tweens
// ------------------------------------------------------------

export const slide = (
    sprite,
    endX,
    endY,
    frames = 60,
    type = ["smoothstep"],
    yoyo = false,
    delayBeforeRepeat = 0
) =>
    makeTween([
        [sprite, "x", sprite.x, endX, frames, type, yoyo, delayBeforeRepeat],
        [sprite, "y", sprite.y, endY, frames, type, yoyo, delayBeforeRepeat]
    ]);

export const breathe = (
    sprite,
    endScaleX,
    endScaleY,
    frames = 60,
    yoyo = true,
    delayBeforeRepeat = 0
) =>
    makeTween([
        [
            sprite,
            "scaleX",
            sprite.scaleX,
            endScaleX,
            frames,
            ["smoothstepSquared"],
            yoyo,
            delayBeforeRepeat
        ],
        [
            sprite,
            "scaleY",
            sprite.scaleY,
            endScaleY,
            frames,
            ["smoothstepSquared"],
            yoyo,
            delayBeforeRepeat
        ]
    ]);

export const scale = (sprite, endScaleX, endScaleY, frames = 60) =>
    makeTween([
        [
            sprite,
            "scaleX",
            sprite.scaleX,
            endScaleX,
            frames,
            ["smoothstep"],
            false
        ],
        [
            sprite,
            "scaleY",
            sprite.scaleY,
            endScaleY,
            frames,
            ["smoothstep"],
            false
        ]
    ]);

export const strobe = (
    sprite,
    scaleFactor = 1.3,
    startMagnitude = 10,
    endMagnitude = 20,
    frames = 10,
    yoyo = true,
    delayBeforeRepeat = 0
) =>
    makeTween([
        [
            sprite,
            "scaleX",
            sprite.scaleX,
            scaleFactor,
            frames,
            ["spline", startMagnitude, endMagnitude],
            yoyo,
            delayBeforeRepeat
        ],
        [
            sprite,
            "scaleY",
            sprite.scaleY,
            scaleFactor,
            frames,
            ["spline", startMagnitude, endMagnitude],
            yoyo,
            delayBeforeRepeat
        ]
    ]);

export const wobble = (
    sprite,
    scaleFactorX = 1.2,
    scaleFactorY = 1.2,
    frames = 10,
    xStartMagnitude = 10,
    xEndMagnitude = 10,
    yStartMagnitude = -10,
    yEndMagnitude = -10,
    friction = 0.98,
    yoyo = true,
    delayBeforeRepeat = 0
) => {
    const groupTween = makeTween([
        [
            sprite,
            "scaleX",
            sprite.scaleX,
            scaleFactorX,
            frames,
            ["spline", xStartMagnitude, xEndMagnitude],
            yoyo,
            delayBeforeRepeat
        ],
        [
            sprite,
            "scaleY",
            sprite.scaleY,
            scaleFactorY,
            frames,
            ["spline", yStartMagnitude, yEndMagnitude],
            yoyo,
            delayBeforeRepeat
        ]
    ]);

    // Add friction to endValue at the end of each tween
    groupTween.tweens.forEach((t) => {
        t.onComplete = () => {
            if (t.endValue > 1) {
                t.endValue *= friction;
                if (t.endValue <= 1) {
                    t.endValue = 1;
                    removeTween(t);
                }
            }
        };
    });

    return groupTween;
};

// ------------------------------------------------------------
// removeTween
// ------------------------------------------------------------

export const removeTween = (tweenObject) => {
    // If it's a simple tween
    if (!tweenObject.tweens) {
        tweenObject.pause();
        const i = tweens.indexOf(tweenObject);
        if (i >= 0) tweens.splice(i, 1);
        return;
    }

    // Group tween: pause and remove each child tween
    tweenObject.pause();
    tweenObject.tweens.forEach((t) => {
        const i = tweens.indexOf(t);
        if (i >= 0) tweens.splice(i, 1);
    });
};

// ------------------------------------------------------------
// followCurve – tween along a single Bezier curve
// ------------------------------------------------------------

export const followCurve = (
    sprite,
    pointsArray,            // [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]
    totalFrames,
    type = ["smoothstep"],
    yoyo = false,
    delayBeforeRepeat = 0
) => {
    const tween = {};

    if (type[0] === "spline") {
        tween.startMagnitude = type[1];
        tween.endMagnitude = type[2];
    }

    tween.start = (pts) => {
        tween.playing = true;
        tween.totalFrames = totalFrames;
        tween.frameCounter = 0;
        tween.pointsArray = JSON.parse(JSON.stringify(pts));
        tweens.push(tween);
    };

    tween.start(pointsArray);

    tween.update = () => {
        if (!tween.playing) return;

        const p = tween.pointsArray;

        if (tween.frameCounter < tween.totalFrames) {
            const normalizedTime = tween.frameCounter / tween.totalFrames;

            let curvedTime;
            if (type[0] !== "spline") {
                const fn = ease[type[0]];
                curvedTime = fn ? fn(normalizedTime) : normalizedTime;
            } else {
                curvedTime = ease.spline(
                    normalizedTime,
                    tween.startMagnitude,
                    0,
                    1,
                    tween.endMagnitude
                );
            }

            sprite.x = cubicBezier(curvedTime, p[0][0], p[1][0], p[2][0], p[3][0]);
            sprite.y = cubicBezier(curvedTime, p[0][1], p[1][1], p[2][1], p[3][1]);

            tween.frameCounter += 1;
        } else {
            tween.end();
        }
    };

    tween.end = () => {
        tween.playing = false;

        if (tween.onComplete) tween.onComplete();

        const i = tweens.indexOf(tween);
        if (i >= 0) tweens.splice(i, 1);

        if (yoyo) {
            wait(delayBeforeRepeat).then(() => {
                tween.pointsArray = tween.pointsArray.reverse();
                tween.start(tween.pointsArray);
            });
        }
    };

    tween.pause = () => {
        tween.playing = false;
    };

    tween.play = () => {
        tween.playing = true;
    };

    return tween;
};

// ------------------------------------------------------------
// walkPath – tween along straight segments between waypoints
// ------------------------------------------------------------

export const walkPath = (
    sprite,
    originalPathArray,       // [[x,y], [x,y], ...]
    totalFrames = 300,
    type = ["smoothstep"],
    loop = false,
    yoyo = false,
    delayBetweenSections = 0
) => {
    const pathArray = JSON.parse(JSON.stringify(originalPathArray));
    const framesPerSegment = totalFrames / pathArray.length;

    let currentPoint = 0;
    let tween = makePath(currentPoint);

    function makePath(startIndex) {
        const t = makeTween([
            [
                sprite,
                "x",
                pathArray[startIndex][0],
                pathArray[startIndex + 1][0],
                framesPerSegment,
                type
            ],
            [
                sprite,
                "y",
                pathArray[startIndex][1],
                pathArray[startIndex + 1][1],
                framesPerSegment,
                type
            ]
        ]);

        t.onComplete = () => {
            currentPoint += 1;

            if (currentPoint < pathArray.length - 1) {
                wait(delayBetweenSections).then(() => {
                    tween = makePath(currentPoint);
                });
            } else if (loop) {
                if (yoyo) pathArray.reverse();

                wait(delayBetweenSections).then(() => {
                    currentPoint = 0;
                    sprite.x = pathArray[0][0];
                    sprite.y = pathArray[0][1];
                    tween = makePath(currentPoint);
                });
            }
        };

        return t;
    }

    return tween;
};

// ------------------------------------------------------------
// walkCurve – tween along a sequence of Bezier curves
// ------------------------------------------------------------

export const walkCurve = (
    sprite,
    pathArray,              // [curve0, curve1, ...], each curve is [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]
    totalFrames = 300,
    type = ["smoothstep"],
    loop = false,
    yoyo = false,
    delayBeforeContinue = 0
) => {
    const framesPerCurve = totalFrames / pathArray.length;

    let currentCurve = 0;
    let tween = makePath(currentCurve);

    function makePath(curveIndex) {
        const t = followCurve(
            sprite,
            pathArray[curveIndex],
            framesPerCurve,
            type
        );

        t.onComplete = () => {
            currentCurve += 1;

            if (currentCurve < pathArray.length) {
                wait(delayBeforeContinue).then(() => {
                    tween = makePath(currentCurve);
                });
            } else if (loop) {
                if (yoyo) {
                    // Reverse order of curves and points for yoyo
                    pathArray.reverse();
                    pathArray.forEach((curve) => curve.reverse());
                }

                wait(delayBeforeContinue).then(() => {
                    currentCurve = 0;

                    // Reset sprite to first point of first curve
                    const firstCurve = pathArray[0];
                    const firstPoint = firstCurve[0];
                    sprite.x = firstPoint[0];
                    sprite.y = firstPoint[1];

                    tween = makePath(currentCurve);
                });
            }
        };

        return t;
    }

    return tween;
};
