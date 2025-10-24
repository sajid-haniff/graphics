/*
utilities.js
==============

This JavaScript file contains useful functions for
adding interactivity to sprites. See the sprites.js file for
sprite prototype objects that can use this code.
*/

// Dependencies
//import {makeSound} from "../library/sound";

/*
assets
------

This is an object to help you load and use game assets, like images, fonts and sounds,
and texture atlases.

Here's how to use it to load an image, a font and a texture atlas:

    assets.load([
      "images/cat.png",
      "fonts/puzzler.otf",
      "images/animals.json",
    ]).then(() => setup());

When all the assets have finished loading, the setup function
will run. (Replace setup with any other function you need).
When you've loaded an asset, you can access it like this:

    imageObject = assets["images/cat.png"];

Access individual frames in a texture atlas using the frame's name, like this:

    frame = assets["hedgehog.png"];

(Just use the image name without the extension.)
*/
export const drawTextCartesian = (
    sk,
    text,
    x,
    y,
    {alignX = sk.LEFT, alignY = sk.BASELINE} = {}
) => {
    const ctx2d = sk.drawingContext;

    ctx2d.save();
    ctx2d.scale(1, -1);

    // Convert Cartesian y (origin bottom-left, y up) → screen coords
    const screenY = -(sk.height - y);

    sk.textAlign(alignX, alignY);
    sk.text(text, x, screenY);

    ctx2d.restore();
};

// blitter.js
export const createBlitter = (ctx, sk, CANVAS_WIDTH, CANVAS_HEIGHT) => {
    const {sx, sy, tx, ty} = ctx.viewport;
    const {win} = ctx;

    // World → Device conversion based on the same transformation chain
    const worldToDevice = (wx, wy) => {
        // Apply world → viewport transform
        const vx = sx * (wx - 0) + tx;
        const vy = sy * (wy - 0) + ty;

        // Apply viewport → device mapping (before reflection)
        const dx = vx * CANVAS_WIDTH;
        const dy = vy * CANVAS_HEIGHT;

        // Apply reflection to match device coordinates
        const reflectedY = CANVAS_HEIGHT - dy;

        return {dx, dy: reflectedY};
    };

    // Blit that clears transformation stack
    const blitImage = (img, wx, wy, w, h) => {
        const {dx, dy} = worldToDevice(wx, wy);

        sk.push();
        sk.resetMatrix(); // clear current transform stack
        sk.drawingContext.drawImage(img, dx, dy - h, w, h); // draw using absolute device coords
        sk.pop();
    };

    return {blitImage};
};


export const createAssets = () => {

    const imageExtensions = ["png", "jpg", "gif"];
    const fontExtensions = ["ttf", "otf", "ttc", "woff"];
    const jsonExtensions = ["json"];
    const audioExtensions = ["mp3", "ogg", "wav", "webm"];

    const assets = {};

    const loadImage = (source) => {

        // If already cached, reuse it
        if (assets[source]) return Promise.resolve(assets[source]);

        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';

            image.onload = () => {
                console.log(`Loaded image: ${source} (${image.width}x${image.height})`);
                assets[source] = image; // cache in dictionary
                resolve(image);
            };

            image.onerror = (err) => {
                console.error(`Failed to load image: ${source}`, err);
                reject(err);
            };

            console.log(`🔄 Starting load: ${source}`);
            image.src = source;
        });
    };

    const loadFont = (source) => {
        const fontFamily = source.split("/").pop().split(".")[0]; // filename without extension
        const font = new FontFace(fontFamily, `url(${source})`);

        return font.load()
            .then((loadedFont) => {
                document.fonts.add(loadedFont);
                console.log(`✅ Font loaded: ${fontFamily} from ${source}`);

                // Cache the family name directly, not just the font object
                assets[source] = fontFamily;

                return fontFamily;
            })
            .catch((err) => {
                console.error(`❌ Failed to load font: ${source}`, err);
                throw err;
            });
    };


    const loadJson = (source) => fetch(source)
        .then((response) => {
            if (!response.ok) throw new Error(`Failed to load ${source}`);
            return response.json();
        })
        .then((file) => {
            file.name = source;
            assets[source] = file;
            if (file.frames) {
                const baseUrl = source.replace(/[^\/]*$/, "");
                const imageSource = baseUrl + file.meta.image;
                return loadImage(imageSource).then((img) => {
                    Object.entries(file.frames).forEach(([frameName, frameData]) => {
                        assets[frameName] = {...frameData, source: img};
                    });
                });
            }
            return Promise.resolve();
        });

    const load = (sources) => {
        console.log("Loading assets...");
        return Promise.all(sources.map((source) => {
            const extension = source.split(".").pop().toLowerCase();
            if (imageExtensions.includes(extension)) return loadImage(source);
            if (fontExtensions.includes(extension)) return loadFont(source);
            if (jsonExtensions.includes(extension)) return loadJson(source);
            console.warn(`File type not recognized: ${source}`);
            return Promise.resolve();
        })).then(() => {
            console.log("Assets finished loading");
        });
    };

    assets.load = load;
    return assets;
};
export const assets = createAssets();


/*
outsideBounds
-------------

Check whether sprite is completely outside of
a boundary
*/

export const outsideBounds = (sprite, bounds, extra) => {
    const {x, y, width, height} = bounds;
    let collision;

    if (sprite.x < x - sprite.width) collision = "left";
    if (sprite.y < y - sprite.height) collision = "top";
    if (sprite.x > width) collision = "right";
    if (sprite.y > height) collision = "bottom";

    if (collision && extra) extra(collision);
    return collision;
};

/*
contain
-------

Keep a sprite contained inside a boundary
*/

export const contain = (sprite, bounds, bounce = false, extra) => {
    const {x, y, width, height} = bounds;
    let collision;

    if (sprite.x < x) {
        if (bounce) sprite.vx *= -1;
        if (sprite.mass) sprite.vx /= sprite.mass;
        sprite.x = x;
        collision = "left";
    }

    if (sprite.y < y) {
        if (bounce) sprite.vy *= -1;
        if (sprite.mass) sprite.vy /= sprite.mass;
        sprite.y = y;
        collision = "top";
    }

    if (sprite.x + sprite.width > width) {
        if (bounce) sprite.vx *= -1;
        if (sprite.mass) sprite.vx /= sprite.mass;
        sprite.x = width - sprite.width;
        collision = "right";
    }

    if (sprite.y + sprite.height > height) {
        if (bounce) sprite.vy *= -1;
        if (sprite.mass) sprite.vy /= sprite.mass;
        sprite.y = height - sprite.height;
        collision = "bottom";
    }

    if (collision && extra) extra(collision);
    return collision;
};

/*
distance
----------------

Find the distance in pixels between two sprites.
Parameters:
a. A sprite object with `centerX` and `centerY` properties.
b. A sprite object with `centerX` and `centerY` properties.
The function returns the number of pixels distance between the sprites.
*/

export const distance = (s1, s2) => {
    const vx = s2.centerX - s1.centerX;
    const vy = s2.centerY - s1.centerY;
    return Math.sqrt(vx * vx + vy * vy);
};

/*
followEase
----------------

Make a sprite ease to the position of another sprite.
Parameters:
a. A sprite object with `centerX` and `centerY` properties. This is the `follower`
sprite.
b. A sprite object with `centerX` and `centerY` properties. This is the `leader` sprite that
the follower will chase
c. The easing value, such as 0.3. A higher number makes the follower move faster
*/

export const followEase = (follower, leader, speed) => {
    const vx = leader.centerX - follower.centerX;
    const vy = leader.centerY - follower.centerY;
    const dist = Math.sqrt(vx * vx + vy * vy);
    if (dist >= 1) {
        follower.x += vx * speed;
        follower.y += vy * speed;
    }
};

export const easeProperty = (start, end, speed) => {
    const distance = end - start;
    return distance >= 1 ? distance * speed : 0;
};

/*
followConstant
----------------

Make a sprite move towards another sprite at a regular speed.
Parameters:
a. A sprite object with `centerX` and `centerY` properties. This is the `follower`
sprite.
b. A sprite object with `centerX` and `centerY` properties. This is the `leader` sprite that
the follower will chase
c. The speed value, such as 3. This is the pixels per frame that the sprite will move. A higher number makes the follower move faster.
*/

export const followConstant = (follower, leader, speed) => {
    const vx = leader.centerX - follower.centerX;
    const vy = leader.centerY - follower.centerY;
    const dist = Math.sqrt(vx * vx + vy * vy);
    if (dist >= speed) {
        follower.x += (vx / dist) * speed;
        follower.y += (vy / dist) * speed;
    }
};

/*
angle
-----

Return the angle in Radians between two sprites.
Parameters:
a. A sprite object with `centerX` and `centerY` properties.
b. A sprite object with `centerX` and `centerY` properties.
You can use it to make a sprite rotate towards another sprite like this:

    box.rotation = angle(box, pointer);
*/

export const angle = (s1, s2) =>
    Math.atan2(
        s2.centerY - s1.centerY,
        s2.centerX - s1.centerX
    );

//### rotateAround
//Make a sprite rotate around another sprite

export const rotateSprite = (rotatingSprite, centerSprite, distance, angle) => {
    rotatingSprite.x =
        centerSprite.centerX - rotatingSprite.parent.x
        + (distance * Math.cos(angle))
        - rotatingSprite.halfWidth;

    rotatingSprite.y =
        centerSprite.centerY - rotatingSprite.parent.y
        + (distance * Math.sin(angle))
        - rotatingSprite.halfHeight;
};

//### rotatePoint
//Make a point rotate around another point

export const rotatePoint = (pointX, pointY, distanceX, distanceY, angle) => ({
    x: pointX + Math.cos(angle) * distanceX,
    y: pointY + Math.sin(angle) * distanceY
});

/*
randomInt
---------

Return a random integer between a minimum and maximum value
Parameters:
a. An integer.
b. An integer.
Here's how you can use it to get a random number between, 1 and 10:

    randomInt(1, 10);
*/

export const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/*
randomFloat
---------

Return a random floating point number between a minimum and maximum value
Parameters:
a. Any number.
b. Any number.
Here's how you can use it to get a random floating point number between, 1 and 10:

    randomFloat(1, 10);
*/

export const randomFloat = (min, max) =>
    min + Math.random() * (max - min);

/*
shoot
---------
*/

export const shoot = (
    shooter, angle, offsetFromCenter,
    bulletSpeed, bulletArray, bulletSprite
) => {
    const bullet = bulletSprite();
    bullet.x =
        shooter.centerX - bullet.halfWidth
        + (offsetFromCenter * Math.cos(angle));
    bullet.y =
        shooter.centerY - bullet.halfHeight
        + (offsetFromCenter * Math.sin(angle));
    bullet.vx = Math.cos(angle) * bulletSpeed;
    bullet.vy = Math.sin(angle) * bulletSpeed;
    bulletArray.push(bullet);
};

/*
Wait
----

Lets you set up a timed sequence of events

    wait(1000)
      .then(() => console.log("One"))
      .then(() => wait(1000))
      .then(() => console.log("Two"))
      .then(() => wait(1000))
      .then(() => console.log("Three"))
*/

export const wait = (duration = 0) =>
    new Promise((resolve) => setTimeout(resolve, duration));

/*
Move
----

Move a sprite by adding it's velocity to it's position

    move(sprite);
*/

export const move = (...sprites) =>
    sprites.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
    });

//Tween functions

/*
export const slide = (sprite, x, y, time) => {
    const tween = new TWEEN.Tween({ x: sprite.x, y: sprite.y })
        .to({ x, y }, time);
    tween.easing(TWEEN.Easing.Circular.Out);
    tween.onUpdate(function () {
        sprite.x = this.x;
        sprite.y = this.y;
    });
    tween.start();
    return tween;
};

export const fade = (sprite, alpha, time) => {
    const tween = new TWEEN.Tween({ alpha: sprite.alpha })
        .to({ alpha }, time);
    tween.easing(TWEEN.Easing.Linear.None);
    tween.onUpdate(function () {
        sprite.alpha = this.alpha;
    });
    tween.start();
    return tween;
};

 */