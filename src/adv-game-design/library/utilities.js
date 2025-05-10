/* utilities.js
   ==============
   Modernized utilities for sprite interactivity using ES6+ features
   Assumptions: async/await, fetch API, FontFace API, TWEEN available
*/

// ——— Assets Manager ———
export const createAssetsManager = () => {
    const store = {};
    const exts = {
        image: ["png", "jpg", "gif"],
        font:  ["ttf", "otf", "ttc", "woff"],
        json:  ["json"],
        audio: ["mp3", "ogg", "wav", "webm"]
    };

    const getExt = src => src.split(".").pop().toLowerCase();
    const resolveType = ext => Object.entries(exts).find(([_,arr]) => arr.includes(ext))?.[0];

    const loadImage = src =>
        new Promise(res => {
            const img = new Image();
            img.onload = () => res(store[src] = img);
            img.src = src;
        });

    const loadFont = src => {
        const family = src.split("/").pop().split(".")[0];
        return new FontFace(family, `url(${src})`)
            .load()
            .then(loaded => (document.fonts.add(loaded), store[src] = loaded))
            .catch(err => console.error(`Font load failed: ${src}`, err));
    };

    const loadJson = async src => {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to load JSON: ${src}`);
        const json = await res.json();
        store[src] = json;
        if (json.frames) await createTilesetFrames(json, src);
    };

    const createTilesetFrames = async (file, src) => {
        const base = src.replace(/[^\/]*$/, "");
        const imgSrc = base + file.meta.image;
        await loadImage(imgSrc);
        Object.entries(file.frames).forEach(([name, frame]) => {
            store[name] = { ...frame, source: store[imgSrc] };
        });
    };

    const loadSound = src =>
        // placeholder: attach real sound loader here
        Promise.resolve(store[src] = /* sound object */ { src });

    const loaders = { image: loadImage, font: loadFont, json: loadJson, audio: loadSound };

    const load = async (sources = []) => {
        console.log("Loading assets...");
        await Promise.all(
            sources.map(src => {
                const type = resolveType(getExt(src));
                return type ? loaders[type](src) : (console.warn(`Unrecognized: ${src}`), Promise.resolve());
            })
        );
        console.log("Assets finished loading");
        return store;
    };

    return { load, get: key => store[key] };
};
export const assets = createAssetsManager();


// ——— Boundary Utilities ———
const checkEdge = (pos, limit, size, onHit) =>
    pos < 0 ? onHit("min") : pos + size > limit ? onHit("max") : null;

export const outsideBounds = ({ x, y, width: w, height: h }, { x: bx, y: by, width, height }) =>
    ["left","top","right","bottom"]
        .find(dir => checkEdge(dir==="left"? x-bx : dir==="right"? width - (x+ w) : 0,
            dir==="top"? y-by : dir==="bottom"? height - (y+ h) : 0,
            0,
            d => d))
    || null;

export const contain = (sprite, { x: bx, y: by, width, height }, bounce = false, extra) => {
    const { mass = 1, width: w, height: h } = sprite;
    let collision = null;
    const bounceVel = v => bounce ? -v / mass : v / mass;

    if (sprite.x < bx) {
        sprite.x = bx;
        sprite.vx = bounceVel(sprite.vx);
        collision = "left";
    }
    if (sprite.y < by) {
        sprite.y = by;
        sprite.vy = bounceVel(sprite.vy);
        collision = "top";
    }
    if (sprite.x + w > width) {
        sprite.x = width - w;
        sprite.vx = bounceVel(sprite.vx);
        collision = "right";
    }
    if (sprite.y + h > height) {
        sprite.y = height - h;
        sprite.vy = bounceVel(sprite.vy);
        collision = "bottom";
    }

    collision && extra?.(collision);
    return collision;
};


// ——— Math & Motion ———
export const distance       = (a, b) => Math.hypot(b.centerX - a.centerX, b.centerY - a.centerY);
export const angle          = (a, b) => Math.atan2(b.centerY - a.centerY, b.centerX - a.centerX);

export const followEase     = (f, l, e) => {
    const dx = l.centerX - f.centerX, dy = l.centerY - f.centerY;
    Math.hypot(dx, dy) > 1 && (f.x += dx*e, f.y += dy*e);
};

export const followConstant = (f, l, s) => {
    const dx = l.centerX - f.centerX, dy = l.centerY - f.centerY;
    const d = Math.hypot(dx, dy);
    d > s && (f.x += dx/d*s, f.y += dy/d*s);
};

export const rotatePoint   = (x,y,dx,dy,ang) => ({ x: x+Math.cos(ang)*dx, y: y+Math.sin(ang)*dy });
export const rotateSprite  = (rot, c, dist, ang) => {
    rot.x = c.centerX - rot.parent.x + dist*Math.cos(ang) - rot.halfWidth;
    rot.y = c.centerY - rot.parent.y + dist*Math.sin(ang) - rot.halfHeight;
};

export const randomInt     = (min, max) => Math.floor(Math.random()*(max-min+1))+min;
export const randomFloat   = (min, max) => min + Math.random()*(max-min);

// ——— Actions ———
export const shoot = (shooter, ang, offset, speed, container, makeBullet) => {
    const b = makeBullet();
    Object.assign(b, {
        x: shooter.centerX - b.halfWidth + offset*Math.cos(ang),
        y: shooter.centerY - b.halfHeight + offset*Math.sin(ang),
        vx: Math.cos(ang)*speed,
        vy: Math.sin(ang)*speed
    });
    container.push(b);
};

export const wait = ms => new Promise(res => setTimeout(res, ms));
export const move = (...sprites) => sprites.forEach(s => (s.x += s.vx, s.y += s.vy));


// ——— Tween Helpers ———
export const slide = (sprite, x, y, duration) =>
    new TWEEN.Tween({ x: sprite.x, y: sprite.y })
        .to({ x, y }, duration)
        .easing(TWEEN.Easing.Circular.Out)
        .onUpdate(({ x:nx, y:ny }) => (sprite.x = nx, sprite.y = ny))
        .start();

export const fade = (sprite, alpha, duration) =>
    new TWEEN.Tween({ alpha: sprite.alpha })
        .to({ alpha }, duration)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(({ alpha:na }) => (sprite.alpha = na))
        .start();
