/*
utilities.js
==============

Utility functions for:
- Asset loading (images, fonts, JSON atlases)
- Simple 2D helpers (blitting, movement, bounds, etc.)
*/

// -----------------------------------------------------------------------------
// Text helpers
// -----------------------------------------------------------------------------

/**
 * Draw text in Cartesian coordinates (origin bottom-left, y up),
 * while p5/pixels remain origin top-left, y down.
 */
export const drawTextCartesian = (
    sk,
    text,
    x,
    y,
    { alignX = sk.LEFT, alignY = sk.BASELINE } = {}
) => {
    const ctx2d = sk.drawingContext;

    ctx2d.save();
    ctx2d.scale(1, -1);

    // Convert Cartesian y to screen y (p5 uses origin at top-left, y down)
    const screenY = -(sk.height - y);

    sk.textAlign(alignX, alignY);
    sk.text(text, x, screenY);

    ctx2d.restore();
};

// -----------------------------------------------------------------------------
// Blitter: world → device + direct image blit
// -----------------------------------------------------------------------------

/**
 * Create an immediate-mode blitter for drawing images / atlas frames in world space.
 * Uses the same viewport params as your graphics context and draws via drawingContext.
 */
export const createBlitter = (ctx, sk, CANVAS_WIDTH, CANVAS_HEIGHT) => {
    const { sx, sy, tx, ty } = ctx.viewport;

    // World → device conversion consistent with your viewport mapping
    const worldToDevice = (wx, wy) => {
        const vx = sx * wx + tx;
        const vy = sy * wy + ty;

        const dx = vx * CANVAS_WIDTH;
        const dy = vy * CANVAS_HEIGHT;

        // Reflect to match p5's Y-down device space
        return { dx, dy: CANVAS_HEIGHT - dy };
    };

    // handle can be:
    //   - string key: "cat.png" / "images/tiger.png" (looked up in assets)
    //   - DOM Image or p5.Image
    //   - atlas entry: { frame: { x, y, w, h }, source: <Image> }
    const blitImage = (handle, wx, wy, w, h) => {
        let img = handle;

        if (typeof handle === "string") {
            img = assets[handle];
            if (!img) {
                console.warn(`blitImage: missing asset "${handle}"`);
                return;
            }
        }

        const { dx, dy } = worldToDevice(wx, wy);
        const ctx2d = sk.drawingContext;

        sk.push();
        sk.resetMatrix(); // draw in raw device space

        // Atlas frame
        if (img && img.frame && img.source) {
            const { x, y, w: fw, h: fh } = img.frame;
            ctx2d.drawImage(
                img.source,
                x,  y,  fw, fh,  // src
                dx, dy - h, w,  h // dst (note dy - h for Y-up fix)
            );
        } else {
            // Full image
            ctx2d.drawImage(img, dx, dy - h, w, h);
        }

        sk.pop();
    };

    return { blitImage };
};

// -----------------------------------------------------------------------------
// Asset loader
// -----------------------------------------------------------------------------

export const createAssets = () => {
    const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp"];
    const fontExtensions  = ["ttf", "otf", "ttc", "woff"];
    const jsonExtensions  = ["json"];
    const audioExtensions = ["mp3", "ogg", "wav", "webm"]; // reserved for future use

    const assets = {};

    const getExtension = (source) => source.split(".").pop().toLowerCase();

    const loadImage = (source) => {
        // If already cached, reuse it
        if (assets[source]) return Promise.resolve(assets[source]);

        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";

            image.onload = () => {
                console.log(`Loaded image: ${source} (${image.width}x${image.height})`);
                assets[source] = image;
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

        return font
            .load()
            .then((loadedFont) => {
                document.fonts.add(loadedFont);
                console.log(`✅ Font loaded: ${fontFamily} from ${source}`);

                // Cache the family name directly (used with sk.textFont)
                assets[source] = fontFamily;
                return fontFamily;
            })
            .catch((err) => {
                console.error(`❌ Failed to load font: ${source}`, err);
                throw err;
            });
    };

    const loadJson = (source) =>
        fetch(source)
            .then((response) => {
                if (!response.ok) throw new Error(`Failed to load ${source}`);
                return response.json();
            })
            .then((file) => {
                file.name = source;
                assets[source] = file;

                // Texture atlas: attach frame objects and sheet image to assets
                if (file.frames && file.meta && file.meta.image) {
                    const baseUrl = source.replace(/[^/]*$/, "");
                    const imageSource = baseUrl + file.meta.image;

                    return loadImage(imageSource).then((img) => {
                        Object.entries(file.frames).forEach(([frameName, frameData]) => {
                            assets[frameName] = { ...frameData, source: img };
                        });
                    });
                }

                return undefined;
            });

    const load = (sources) => {
        console.log("Loading assets...");

        const tasks = sources.map((source) => {
            const ext = getExtension(source);

            if (imageExtensions.includes(ext)) return loadImage(source);
            if (fontExtensions.includes(ext))  return loadFont(source);
            if (jsonExtensions.includes(ext))  return loadJson(source);

            if (!audioExtensions.includes(ext)) {
                console.warn(`File type not recognized by assets.load: ${source}`);
            }
            // For now: ignore audio and unknown types
            return Promise.resolve();
        });

        return Promise.all(tasks).then(() => {
            console.log("Assets finished loading");
        });
    };

    assets.load = load;
    return assets;
};

export const assets = createAssets();

// -----------------------------------------------------------------------------
// Spatial helpers
// -----------------------------------------------------------------------------

export const outsideBounds = (sprite, bounds, extra) => {
    const { x, y, width, height } = bounds;
    let collision;

    if (sprite.x < x - sprite.width)  collision = "left";
    if (sprite.y < y - sprite.height) collision = "top";
    if (sprite.x > width)             collision = "right";
    if (sprite.y > height)            collision = "bottom";

    if (collision && extra) extra(collision);
    return collision;
};

export const contain = (sprite, bounds, bounce = false, extra) => {
    const { x, y, width, height } = bounds;
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

// -----------------------------------------------------------------------------
// Movement / geometry
// -----------------------------------------------------------------------------

export const distance = (s1, s2) => {
    const vx = s2.centerX - s1.centerX;
    const vy = s2.centerY - s1.centerY;
    return Math.hypot(vx, vy);
};

export const followEase = (follower, leader, speed) => {
    const vx = leader.centerX - follower.centerX;
    const vy = leader.centerY - follower.centerY;
    const dist = Math.hypot(vx, vy);

    if (dist >= 1) {
        follower.x += vx * speed;
        follower.y += vy * speed;
    }
};

export const easeProperty = (start, end, speed) => {
    const d = end - start;
    return Math.abs(d) >= 1 ? d * speed : 0;
};

export const followConstant = (follower, leader, speed) => {
    const vx = leader.centerX - follower.centerX;
    const vy = leader.centerY - follower.centerY;
    const dist = Math.hypot(vx, vy);

    if (dist >= speed) {
        follower.x += (vx / dist) * speed;
        follower.y += (vy / dist) * speed;
    }
};

export const angle = (s1, s2) =>
    Math.atan2(
        s2.centerY - s1.centerY,
        s2.centerX - s1.centerX
    );

export const rotateSprite = (rotatingSprite, centerSprite, distance, a) => {
    rotatingSprite.x =
        centerSprite.centerX - rotatingSprite.parent.x +
        (distance * Math.cos(a)) -
        rotatingSprite.halfWidth;

    rotatingSprite.y =
        centerSprite.centerY - rotatingSprite.parent.y +
        (distance * Math.sin(a)) -
        rotatingSprite.halfHeight;
};

export const rotatePoint = (pointX, pointY, distanceX, distanceY, a) => ({
    x: pointX + Math.cos(a) * distanceX,
    y: pointY + Math.sin(a) * distanceY
});

// -----------------------------------------------------------------------------
// Random / projectiles / timing / motion
// -----------------------------------------------------------------------------

export const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

export const randomFloat = (min, max) =>
    min + Math.random() * (max - min);

export const shoot = (
    shooter, angleRad, offsetFromCenter,
    bulletSpeed, bulletArray, bulletSprite
) => {
    const bullet = bulletSprite();

    bullet.x =
        shooter.centerX - bullet.halfWidth +
        (offsetFromCenter * Math.cos(angleRad));

    bullet.y =
        shooter.centerY - bullet.halfHeight +
        (offsetFromCenter * Math.sin(angleRad));

    bullet.vx = Math.cos(angleRad) * bulletSpeed;
    bullet.vy = Math.sin(angleRad) * bulletSpeed;

    bulletArray.push(bullet);
};

export const wait = (duration = 0) =>
    new Promise((resolve) => setTimeout(resolve, duration));

export const move = (...sprites) => {
    sprites.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
    });
};
