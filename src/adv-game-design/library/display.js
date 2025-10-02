/*
display.js
==========

This JavaScript file contains functions for creating and rendering canvas-based sprites.
*/

// Named exports for modularity
export const stage = createDisplayObject();

// Factory function for DisplayObject
const createDisplayObject = () => {
    // Private state using closure
    let state = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        alpha: 1,
        visible: true,
        scaleX: 1,
        scaleY: 1,
        pivotX: 0.5,
        pivotY: 0.5,
        vx: 0,
        vy: 0,
        layer: 0,
        children: [],
        parent: null,
        shadow: false,
        shadowColor: 'rgba(100, 100, 100, 0.5)',
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        shadowBlur: 3,
        blendMode: null,
        frames: [],
        loop: true,
        currentFrame: 0,
        playing: false,
        draggable: false,
        interactive: false,
        previousX: 0,
        previousY: 0,
        circular: false,
    };

    // Helper to update state immutably
    const updateState = (newState) => (state = { ...state, ...newState });

    // Public API
    return {
        get x() { return state.x; },
        set x(value) { updateState({ x: value }); },
        get y() { return state.y; },
        set y(value) { updateState({ y: value }); },
        get width() { return state.width; },
        set width(value) { updateState({ width: value }); },
        get height() { return state.height; },
        set height(value) { updateState({ height: value }); },
        get rotation() { return state.rotation; },
        set rotation(value) { updateState({ rotation: value }); },
        get alpha() { return state.alpha; },
        set alpha(value) { updateState({ alpha: value }); },
        get visible() { return state.visible; },
        set visible(value) { updateState({ visible: value }); },
        get scaleX() { return state.scaleX; },
        set scaleX(value) { updateState({ scaleX: value }); },
        get scaleY() { return state.scaleY; },
        set scaleY(value) { updateState({ scaleY: value }); },
        get pivotX() { return state.pivotX; },
        set pivotX(value) { updateState({ pivotX: value }); },
        get pivotY() { return state.pivotY; },
        set pivotY(value) { updateState({ pivotY: value }); },
        get vx() { return state.vx; },
        set vx(value) { updateState({ vx: value }); },
        get vy() { return state.vy; },
        set vy(value) { updateState({ vy: value }); },
        get layer() { return state.layer; },
        set layer(value) {
            updateState({ layer: value });
            if (state.parent) {
                state.parent.children.sort((a, b) => a.layer - b.layer);
            }
        },
        get children() { return state.children; },
        get parent() { return state.parent; },
        set parent(value) { updateState({ parent: value }); },
        get shadow() { return state.shadow; },
        set shadow(value) { updateState({ shadow: value }); },
        get shadowColor() { return state.shadowColor; },
        set shadowColor(value) { updateState({ shadowColor: value }); },
        get shadowOffsetX() { return state.shadowOffsetX; },
        set shadowOffsetX(value) { updateState({ shadowOffsetX: value }); },
        get shadowOffsetY() { return state.shadowOffsetY; },
        set shadowOffsetY(value) { updateState({ shadowOffsetY: value }); },
        get shadowBlur() { return state.shadowBlur; },
        set shadowBlur(value) { updateState({ shadowBlur: value }); },
        get blendMode() { return state.blendMode; },
        set blendMode(value) { updateState({ blendMode: value }); },
        get frames() { return state.frames; },
        set frames(value) { updateState({ frames: value }); },
        get loop() { return state.loop; },
        set loop(value) { updateState({ loop: value }); },
        get currentFrame() { return state.currentFrame; },
        set currentFrame(value) { updateState({ currentFrame: value }); },
        get playing() { return state.playing; },
        set playing(value) { updateState({ playing: value }); },
        get draggable() { return state.draggable; },
        set draggable(value) {
            updateState({ draggable: value });
            if (value) {
                draggableSprites.push(this);
            } else {
                draggableSprites.splice(draggableSprites.indexOf(this), 1);
            }
        },
        get interactive() { return state.interactive; },
        set interactive(value) {
            updateState({ interactive: value });
            if (value) {
                makeInteractive(this);
                buttons.push(this);
            } else {
                buttons.splice(buttons.indexOf(this), 1);
            }
        },
        get previousX() { return state.previousX; },
        set previousX(value) { updateState({ previousX: value }); },
        get previousY() { return state.previousY; },
        set previousY(value) { updateState({ previousY: value }); },
        get circular() { return state.circular; },
        set circular(value) {
            updateState({ circular: value });
            if (value && !state.circular) {
                Object.defineProperties(this, {
                    diameter: {
                        get: () => this.width,
                        set: (val) => updateState({ width: val, height: val }),
                        enumerable: true,
                        configurable: true,
                    },
                    radius: {
                        get: () => this.width / 2,
                        set: (val) => updateState({ width: val * 2, height: val * 2 }),
                        enumerable: true,
                        configurable: true,
                    },
                });
            } else if (!value && state.circular) {
                delete this.diameter;
                delete this.radius;
            }
        },
        get gx() {
            return state.parent ? state.x + state.parent.gx : state.x;
        },
        get gy() {
            return state.parent ? state.y + state.parent.gy : state.y;
        },
        get halfWidth() { return state.width / 2; },
        get halfHeight() { return state.height / 2; },
        get centerX() { return state.x + this.halfWidth; },
        get centerY() { return state.y + this.halfHeight; },
        get position() { return { x: state.x, y: state.y }; },
        setPosition: (x, y) => updateState({ x, y }),
        get localBounds() {
            return { x: 0, y: 0, width: state.width, height: state.height };
        },
        get globalBounds() {
            return {
                x: this.gx,
                y: this.gy,
                width: this.gx + state.width,
                height: this.gy + state.height,
            };
        },
        get empty() { return state.children.length === 0; },
        addChild: (sprite) => {
            if (sprite.parent && sprite.parent !== this) {
                sprite.parent.removeChild(sprite);
            }
            sprite.parent = this;
            updateState({ children: [...state.children, sprite] });
        },
        removeChild: (sprite) => {
            if (sprite.parent === this) {
                updateState({ children: state.children.filter((child) => child !== sprite) });
            } else {
                throw new Error(`${sprite} is not a child of this object`);
            }
        },
        putCenter: (b, xOffset = 0, yOffset = 0) => {
            b.x = state.x + this.halfWidth - b.halfWidth + xOffset;
            b.y = state.y + this.halfHeight - b.halfHeight + yOffset;
        },
        putTop: (b, xOffset = 0, yOffset = 0) => {
            b.x = state.x + this.halfWidth - b.halfWidth + xOffset;
            b.y = state.y - b.height + yOffset;
        },
        putRight: (b, xOffset = 0, yOffset = 0) => {
            b.x = state.x + state.width + xOffset;
            b.y = state.y + this.halfHeight - b.halfHeight + yOffset;
        },
        putBottom: (b, xOffset = 0, yOffset = 0) => {
            b.x = state.x + this.halfWidth - b.halfWidth + xOffset;
            b.y = state.y + state.height + yOffset;
        },
        putLeft: (b, xOffset = 0, yOffset = 0) => {
            b.x = state.x - b.width + xOffset;
            b.y = state.y + this.halfHeight - b.halfHeight + yOffset;
        },
        swapChildren: (child1, child2) => {
            const index1 = state.children.indexOf(child1);
            const index2 = state.children.indexOf(child2);
            if (index1 !== -1 && index2 !== -1) {
                const newChildren = [...state.children];
                newChildren[index1] = child2;
                newChildren[index2] = child1;
                updateState({ children: newChildren });
            } else {
                throw new Error('Both objects must be children');
            }
        },
        add: (...sprites) => sprites.forEach((sprite) => this.addChild(sprite)),
        remove: (...sprites) => sprites.forEach((sprite) => this.removeChild(sprite)),
    };
};

// Canvas creation
export const makeCanvas = ({
                               width = 256,
                               height = 256,
                               border = '1px dashed black',
                               backgroundColor = 'white',
                           } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.border = border;
    canvas.style.backgroundColor = backgroundColor;
    document.body.appendChild(canvas);
    canvas.ctx = canvas.getContext('2d');
    return canvas;
};

// Rectangle factory
const createRectangle = ({
                             width = 32,
                             height = 32,
                             fillStyle = 'gray',
                             strokeStyle = 'none',
                             lineWidth = 0,
                             x = 0,
                             y = 0,
                         } = {}) => {
    const sprite = createDisplayObject();
    const state = { width, height, fillStyle, strokeStyle, lineWidth, x, y, mask: false };
    sprite.width = width;
    sprite.height = height;
    sprite.x = x;
    sprite.y = y;
    sprite.render = (ctx) => {
        ctx.strokeStyle = state.strokeStyle;
        ctx.lineWidth = state.lineWidth;
        ctx.fillStyle = state.fillStyle;
        ctx.beginPath();
        ctx.rect(-state.width * sprite.pivotX, -state.height * sprite.pivotY, state.width, state.height);
        state.strokeStyle !== 'none' && ctx.stroke();
        state.fillStyle !== 'none' && ctx.fill();
        state.mask && ctx.clip();
    };
    return sprite;
};

export const rectangle = (...args) => {
    const sprite = createRectangle(...args);
    stage.addChild(sprite);
    return sprite;
};

// Circle factory
const createCircle = ({
                          diameter = 32,
                          fillStyle = 'gray',
                          strokeStyle = 'none',
                          lineWidth = 0,
                          x = 0,
                          y = 0,
                      } = {}) => {
    const sprite = createDisplayObject();
    sprite.circular = true;
    const state = { diameter, fillStyle, strokeStyle, lineWidth, x, y, mask: false };
    sprite.diameter = diameter;
    sprite.x = x;
    sprite.y = y;
    sprite.render = (ctx) => {
        ctx.strokeStyle = state.strokeStyle;
        ctx.lineWidth = state.lineWidth;
        ctx.fillStyle = state.fillStyle;
        ctx.beginPath();
        ctx.arc(
            sprite.radius + (-state.diameter * sprite.pivotX),
            sprite.radius + (-state.diameter * sprite.pivotY),
            sprite.radius,
            0,
            2 * Math.PI,
            false
        );
        state.strokeStyle !== 'none' && ctx.stroke();
        state.fillStyle !== 'none' && ctx.fill();
        state.mask && ctx.clip();
    };
    return sprite;
};

export const circle = (...args) => {
    const sprite = createCircle(...args);
    stage.addChild(sprite);
    return sprite;
};

// Line factory
const createLine = ({
                        strokeStyle = 'none',
                        lineWidth = 0,
                        ax = 0,
                        ay = 0,
                        bx = 32,
                        by = 32,
                    } = {}) => {
    const sprite = createDisplayObject();
    const state = { strokeStyle, lineWidth, ax, ay, bx, by, lineJoin: 'round' };
    sprite.render = (ctx) => {
        ctx.strokeStyle = state.strokeStyle;
        ctx.lineWidth = state.lineWidth;
        ctx.lineJoin = state.lineJoin;
        ctx.beginPath();
        ctx.moveTo(state.ax, state.ay);
        ctx.lineTo(state.bx, state.by);
        state.strokeStyle !== 'none' && ctx.stroke();
    };
    return sprite;
};

export const line = (...args) => {
    const sprite = createLine(...args);
    stage.addChild(sprite);
    return sprite;
};

// Text factory
const createText = ({
                        content = 'Hello!',
                        font = '12px sans-serif',
                        fillStyle = 'red',
                        x = 0,
                        y = 0,
                    } = {}) => {
    const sprite = createDisplayObject();
    const state = { content, font, fillStyle, x, y, textBaseline: 'top', strokeText: 'none' };
    sprite.x = x;
    sprite.y = y;
    sprite.render = (ctx) => {
        ctx.font = state.font;
        ctx.strokeStyle = state.strokeStyle;
        ctx.lineWidth = state.lineWidth;
        ctx.fillStyle = state.fillStyle;
        if (sprite.width === 0) sprite.width = ctx.measureText(state.content).width;
        if (sprite.height === 0) sprite.height = ctx.measureText('M').width;
        ctx.translate(-sprite.width * sprite.pivotX, -sprite.height * sprite.pivotY);
        ctx.textBaseline = state.textBaseline;
        ctx.fillText(state.content, 0, 0);
        state.strokeText !== 'none' && ctx.strokeText();
    };
    return sprite;
};

export const text = (...args) => {
    const sprite = createText(...args);
    stage.addChild(sprite);
    return sprite;
};

// Group factory
const createGroup = (...spritesToGroup) => {
    const sprite = createDisplayObject();
    const calculateSize = () => {
        if (sprite.children.length > 0) {
            const { width, height } = sprite.children.reduce(
                ({ width, height }, child) => ({
                    width: Math.max(width, child.x + child.width),
                    height: Math.max(height, child.y + child.height),
                }),
                { width: 0, height: 0 }
            );
            sprite.width = width;
            sprite.height = height;
        }
    };
    sprite.addChild = (child) => {
        if (child.parent) child.parent.removeChild(child);
        child.parent = sprite;
        sprite.children = [...sprite.children, child];
        calculateSize();
    };
    sprite.removeChild = (child) => {
        if (child.parent === sprite) {
            sprite.children = sprite.children.filter((c) => c !== child);
            calculateSize();
        } else {
            throw new Error(`${child} is not a child of this group`);
        }
    };
    spritesToGroup.forEach((s) => sprite.addChild(s));
    return sprite;
};

export const group = (...sprites) => {
    const sprite = createGroup(...sprites);
    stage.addChild(sprite);
    return sprite;
};

// Sprite factory
const createSprite = (source, x = 0, y = 0) => {
    const sprite = createDisplayObject();
    const state = { source, sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0 };
    sprite.x = x;
    sprite.y = y;

    const createFromImage = (img) => {
        if (!(img instanceof Image)) throw new Error(`${img} is not an image object`);
        return {
            source: img,
            sourceX: 0,
            sourceY: 0,
            width: img.width,
            height: img.height,
            sourceWidth: img.width,
            sourceHeight: img.height,
        };
    };

    const createFromAtlas = (atlas) => ({
        source: atlas.source,
        sourceX: atlas.frame.x,
        sourceY: atlas.frame.y,
        width: atlas.frame.w,
        height: atlas.frame.h,
        sourceWidth: atlas.frame.w,
        sourceHeight: atlas.frame.h,
    });

    const createFromTileset = (tileset) => {
        if (!(tileset.image instanceof Image)) throw new Error(`${tileset.image} is not an image object`);
        return {
            source: tileset.image,
            sourceX: tileset.x,
            sourceY: tileset.y,
            width: tileset.width,
            height: tileset.height,
            sourceWidth: tileset.width,
            sourceHeight: tileset.height,
        };
    };

    const createFromTilesetFrames = (tileset) => {
        if (!(tileset.image instanceof Image)) throw new Error(`${tileset.image} is not an image object`);
        sprite.frames = tileset.data;
        return {
            source: tileset.image,
            sourceX: tileset.data[0][0],
            sourceY: tileset.data[0][1],
            width: tileset.width,
            height: tileset.height,
            sourceWidth: tileset.width,
            sourceHeight: tileset.height,
        };
    };

    const createFromAtlasFrames = (frames) => ({
        source: frames[0].source,
        sourceX: frames[0].frame.x,
        sourceY: frames[0].frame.y,
        width: frames[0].frame.w,
        height: frames[0].frame.h,
        sourceWidth: frames[0].frame.w,
        sourceHeight: frames[0].frame.h,
        frames,
    });

    const createFromImages = (images) => ({
        source: images[0],
        sourceX: 0,
        sourceY: 0,
        width: images[0].width,
        height: images[0].width,
        sourceWidth: images[0].width,
        sourceHeight: images[0].height,
        frames: images,
    });

    const init = () => {
        if (source instanceof Image) {
            return createFromImage(source);
        } else if (source.frame) {
            return createFromAtlas(source);
        } else if (source.image && !source.data) {
            return createFromTileset(source);
        } else if (source.image && source.data) {
            return createFromTilesetFrames(source);
        } else if (Array.isArray(source)) {
            if (source[0]?.source) {
                return createFromAtlasFrames(source);
            } else if (source[0] instanceof Image) {
                return createFromImages(source);
            }
            throw new Error(`The image sources in ${source} are not recognized`);
        }
        throw new Error(`The image source ${source} is not recognized`);
    };

    Object.assign(sprite, init());
    sprite.gotoAndStop = (frameNumber) => {
        if (sprite.frames.length > 0 && frameNumber < sprite.frames.length) {
            sprite.currentFrame = frameNumber;
            if (Array.isArray(sprite.frames[0])) {
                sprite.sourceX = sprite.frames[frameNumber][0];
                sprite.sourceY = sprite.frames[frameNumber][1];
            } else if (sprite.frames[frameNumber].frame) {
                sprite.sourceX = sprite.frames[frameNumber].frame.x;
                sprite.sourceY = sprite.frames[frameNumber].frame.y;
                sprite.sourceWidth = sprite.frames[frameNumber].frame.w;
                sprite.sourceHeight = sprite.frames[frameNumber].frame.h;
                sprite.width = sprite.frames[frameNumber].frame.w;
                sprite.height = sprite.frames[frameNumber].frame.h;
            } else {
                sprite.source = sprite.frames[frameNumber];
                sprite.sourceX = 0;
                sprite.sourceY = 0;
                sprite.width = sprite.source.width;
                sprite.height = sprite.source.height;
                sprite.sourceWidth = sprite.source.width;
                sprite.sourceHeight = sprite.source.height;
            }
        } else {
            throw new Error(`Frame number ${frameNumber} does not exist`);
        }
    };
    sprite.render = (ctx) => {
        ctx.drawImage(
            sprite.source,
            sprite.sourceX,
            sprite.sourceY,
            sprite.sourceWidth,
            sprite.sourceHeight,
            -sprite.width * sprite.pivotX,
            -sprite.height * sprite.pivotY,
            sprite.width,
            sprite.height
        );
    };
    return sprite;
};

export const sprite = (source, x, y) => {
    const s = createSprite(source, x, y);
    if (s.frames.length > 0) addStatePlayer(s);
    stage.addChild(s);
    return s;
};

// Button factory
const createButton = (source, x = 0, y = 0) => {
    const sprite = createSprite(source, x, y);
    sprite.interactive = true;
    return sprite;
};

export const button = (source, x, y) => {
    const sprite = createButton(source, x, y);
    stage.addChild(sprite);
    return sprite;
};

// Grid utility
export const grid = ({
                         columns = 0,
                         rows = 0,
                         cellWidth = 32,
                         cellHeight = 32,
                         centerCell = false,
                         xOffset = 0,
                         yOffset = 0,
                         makeSprite = () => circle(16, 'blue'),
                         extra = null,
                     } = {}) => {
    const container = group();
    const createGrid = () => {
        const length = columns * rows;
        for (let i = 0; i < length; i++) {
            const x = (i % columns) * cellWidth;
            const y = Math.floor(i / columns) * cellHeight;
            const sprite = makeSprite();
            container.addChild(sprite);
            sprite.x = centerCell
                ? x + cellWidth / 2 - sprite.halfWidth + xOffset
                : x + xOffset;
            sprite.y = centerCell
                ? y + cellHeight / 2 - sprite.halfHeight + yOffset
                : y + yOffset;
            extra?.(sprite);
        }
    };
    createGrid();
    return container;
};

// Filmstrip utility
export const filmstrip = (image, frameWidth, frameHeight, spacing = 0) => {
    const positions = [];
    const columns = image.width / frameWidth;
    const rows = image.height / frameHeight;
    const numberOfFrames = columns * rows;
    for (let i = 0; i < numberOfFrames; i++) {
        let x = (i % columns) * frameWidth;
        let y = Math.floor(i / columns) * frameHeight;
        if (spacing > 0) {
            x += spacing + (spacing * (i % columns));
            y += spacing + (spacing * Math.floor(i / columns));
        }
        positions.push([x, y]);
    }
    return frames(image, positions, frameWidth, frameHeight);
};

// Frame utility
export const frame = (source, x, y, width, height) => ({
    image: source,
    x,
    y,
    width,
    height,
});

// Frames utility
export const frames = (source, arrayOfPositions, width, height) => ({
    image: source,
    data: arrayOfPositions,
    width,
    height,
});

// Remove utility
export const remove = (...sprites) => sprites.forEach((sprite) => sprite.parent.removeChild(sprite));

// Sort utility
export const byLayer = (a, b) => a.layer - b.layer;

// Interactive utilities
export let buttons = [];
export let draggableSprites = [];

const makeInteractive = (sprite) => {
    sprite.press = null;
    sprite.release = null;
    sprite.over = null;
    sprite.out = null;
    sprite.tap = null;
    let state = { state: 'up', action: '', pressed: false, hoverOver: false };
    sprite.update = (pointer, canvas) => {
        const hit = pointer.hitTestSprite(sprite);
        state = { ...state, state: pointer.isUp ? 'up' : hit && pointer.isDown ? 'down' : hit ? 'over' : state.state };
        if (sprite.frames?.length === 3 && sprite instanceof createButton()) {
            sprite.gotoAndStop(state.state === 'up' ? 0 : state.state === 'over' ? 1 : 2);
        } else if (sprite.frames?.length === 2 && sprite instanceof createButton()) {
            sprite.gotoAndStop(state.state === 'up' ? 0 : 1);
        }
        if (state.state === 'down' && !state.pressed) {
            sprite.press?.();
            state = { ...state, pressed: true, action: 'pressed' };
        }
        if (state.state === 'over') {
            if (state.pressed) {
                sprite.release?.();
                pointer.tapped && sprite.tap?.();
                state = { ...state, pressed: false, action: 'released' };
            }
            if (!state.hoverOver) {
                sprite.over?.();
                state = { ...state, hoverOver: true };
            }
        }
        if (state.state === 'up' && state.pressed) {
            sprite.release?.();
            state = { ...state, pressed: false, action: 'released' };
        }
        if (state.state === 'up' && state.hoverOver) {
            sprite.out?.();
            state = { ...state, hoverOver: false };
        }
    };
};

export const updateDragAndDrop = (pointer, canvas) => {
    let dragSprite = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    if (pointer.isDown && !dragSprite) {
        for (let i = draggableSprites.length - 1; i >= 0; i--) {
            const sprite = draggableSprites[i];
            if (pointer.hitTestSprite(sprite) && sprite.draggable) {
                dragOffsetX = pointer.x - sprite.gx;
                dragOffsetY = pointer.y - sprite.gy;
                dragSprite = sprite;
                const children = sprite.parent.children;
                children.splice(children.indexOf(sprite), 1);
                children.push(sprite);
                break;
            }
        }
    } else if (dragSprite) {
        dragSprite.x = pointer.x - dragOffsetX;
        dragSprite.y = pointer.y - dragOffsetY;
    }
    if (pointer.isUp) dragSprite = null;
    canvas.style.cursor = draggableSprites.some((sprite) => pointer.hitTestSprite(sprite) && sprite.draggable)
        ? 'pointer'
        : 'auto';
};

// Render utility
export const render = (canvas) => {
    const ctx = canvas.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const displaySprite = (sprite) => {
        if (
            sprite.visible &&
            sprite.gx < canvas.width + sprite.width &&
            sprite.gx + sprite.width >= -sprite.width &&
            sprite.gy < canvas.height + sprite.height &&
            sprite.gy + sprite.height >= -sprite.height
        ) {
            ctx.save();
            ctx.translate(sprite.x + sprite.width * sprite.pivotX, sprite.y + sprite.height * sprite.pivotY);
            ctx.rotate(sprite.rotation);
            ctx.globalAlpha = sprite.alpha * (sprite.parent?.alpha ?? 1);
            ctx.scale(sprite.scaleX, sprite.scaleY);
            if (sprite.shadow) {
                ctx.shadowColor = sprite.shadowColor;
                ctx.shadowOffsetX = sprite.shadowOffsetX;
                ctx.shadowOffsetY = sprite.shadowOffsetY;
                ctx.shadowBlur = sprite.shadowBlur;
            }
            if (sprite.blendMode) ctx.globalCompositeOperation = sprite.blendMode;
            sprite.render?.(ctx);
            if (sprite.children.length > 0) {
                ctx.translate(-sprite.width * sprite.pivotX, -sprite.height * sprite.pivotY);
                sprite.children.forEach(displaySprite);
            }
            ctx.restore();
        }
    };
    stage.children.forEach(displaySprite);
};

// Render with interpolation
export const renderWithInterpolation = (canvas, lagOffset) => {
    const ctx = canvas.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const displaySprite = (sprite) => {
        if (
            sprite.visible &&
            sprite.gx < canvas.width + sprite.width &&
            sprite.gx + sprite.width > -sprite.width &&
            sprite.gy < canvas.height + sprite.height &&
            sprite.gy + sprite.height >= -sprite.height
        ) {
            ctx.save();
            const renderX = sprite.previousX !== undefined ? (sprite.x - sprite.previousX) * lagOffset + sprite.previousX : sprite.x;
            const renderY = sprite.previousY !== undefined ? (sprite.y - sprite.previousY) * lagOffset + sprite.previousY : sprite.y;
            ctx.translate(renderX + sprite.width * sprite.pivotX, renderY + sprite.height * sprite.pivotY);
            ctx.rotate(sprite.rotation);
            ctx.globalAlpha = sprite.alpha * (sprite.parent?.alpha ?? 1);
            ctx.scale(sprite.scaleX, sprite.scaleY);
            if (sprite.shadow) {
                ctx.shadowColor = sprite.shadowColor;
                ctx.shadowOffsetX = sprite.shadowOffsetX;
                ctx.shadowOffsetY = sprite.shadowOffsetY;
                ctx.shadowBlur = sprite.shadowBlur;
            }
            if (sprite.blendMode) ctx.globalCompositeOperation = sprite.blendMode;
            sprite.render?.(ctx);
            if (sprite.children.length > 0) {
                ctx.translate(-sprite.width * sprite.pivotX, -sprite.height * sprite.pivotY);
                sprite.children.forEach(displaySprite);
            }
            ctx.restore();
        }
    };
    stage.children.forEach(displaySprite);
};

// State player
const addStatePlayer = (sprite) => {
    let state = {
        frameCounter: 0,
        numberOfFrames: 0,
        startFrame: 0,
        endFrame: 0,
        timerInterval: null,
    };
    const updateState = (newState) => (state = { ...state, ...newState });
    const reset = () => {
        if (state.timerInterval && sprite.playing) {
            sprite.playing = false;
            updateState({ frameCounter: 0, startFrame: 0, endFrame: 0, numberOfFrames: 0 });
            clearInterval(state.timerInterval);
        }
    };
    const show = (frameNumber) => {
        reset();
        sprite.gotoAndStop(frameNumber);
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
    const playSequence = (sequenceArray) => {
        reset();
        updateState({
            startFrame: sequenceArray[0],
            endFrame: sequenceArray[1],
            numberOfFrames: sequenceArray[1] - sequenceArray[0] + (sequenceArray[0] === 0 ? 1 : 0),
            frameCounter: sequenceArray[0] === 0 ? 1 : 0,
        });
        if (state.numberOfFrames === 1) {
            updateState({ numberOfFrames: 2, frameCounter: state.frameCounter + 1 });
        }
        sprite.gotoAndStop(state.startFrame);
        if (!sprite.playing) {
            const frameRate = 1000 / (sprite.fps || 12);
            updateState({ timerInterval: setInterval(() => advanceFrame(), frameRate) });
            sprite.playing = true;
        }
        const advanceFrame = () => {
            if (state.frameCounter < state.numberOfFrames) {
                sprite.gotoAndStop(sprite.currentFrame + 1);
                updateState({ frameCounter: state.frameCounter + 1 });
            } else if (sprite.loop) {
                sprite.gotoAndStop(state.startFrame);
                updateState({ frameCounter: 1 });
            }
        };
    };
    Object.assign(sprite, { show, play, stop, playSequence });
};

// Particle utilities
export let particles = [];

export const emitter = (interval, particleFunction) => {
    let state = { playing: false, timerInterval: null };
    const play = () => {
        if (!state.playing) {
            particleFunction();
            state = { ...state, playing: true, timerInterval: setInterval(particleFunction, interval) };
        }
    };
    const stop = () => {
        if (state.playing) {
            clearInterval(state.timerInterval);
            state = { ...state, playing: false, timerInterval: null };
        }
    };
    return { play, stop };
};

export const particleEffect = ({
                                   x = 0,
                                   y = 0,
                                   spriteFunction = () => circle(10, 'red'),
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
    const randomFloat = (min, max) => min + Math.random() * (max - min);
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const angles = Array.from(
        { length: numberOfParticles },
        (_, i) => randomSpacing ? randomFloat(minAngle, maxAngle) : minAngle + (i * (maxAngle - minAngle)) / (numberOfParticles - 1)
    );
    angles.forEach((angle) => {
        const particle = spriteFunction();
        if (particle.frames.length > 0) {
            particle.gotoAndStop(randomInt(0, particle.frames.length - 1));
        }
        particle.x = x - particle.halfWidth;
        particle.y = y - particle.halfHeight;
        const size = randomInt(minSize, maxSize);
        particle.width = size;
        particle.height = size;
        particle.scaleSpeed = randomFloat(minScaleSpeed, maxScaleSpeed);
        particle.alphaSpeed = randomFloat(minAlphaSpeed, maxAlphaSpeed);
        particle.rotationSpeed = randomFloat(minRotationSpeed, maxRotationSpeed);
        const speed = randomFloat(minSpeed, maxSpeed);
        particle.vx = speed * Math.cos(angle);
        particle.vy = speed * Math.sin(angle);
        particle.update = () => {
            particle.vy += gravity;
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.scaleX - particle.scaleSpeed > 0) particle.scaleX -= particle.scaleSpeed;
            if (particle.scaleY - particle.scaleSpeed > 0) particle.scaleY -= particle.scaleSpeed;
            particle.rotation += particle.rotationSpeed;
            particle.alpha -= particle.alphaSpeed;
            if (particle.alpha <= 0) {
                remove(particle);
                particles.splice(particles.indexOf(particle), 1);
            }
        };
        particles.push(particle);
    });
};

// Tiling sprite
export const tilingSprite = (width, height, source, x = 0, y = 0) => {
    const tileWidth = source.frame ? source.frame.w : source.width;
    const tileHeight = source.frame ? source.frame.h : source.height;
    const columns = width >= tileWidth ? Math.round(width / tileWidth) + 1 : 2;
    const rows = height >= tileHeight ? Math.round(height / tileHeight) + 1 : 2;
    const tileGrid = grid({
        columns,
        rows,
        cellWidth: tileWidth,
        cellHeight: tileHeight,
        makeSprite: () => sprite(source),
    });
    tileGrid._tileX = 0;
    tileGrid._tileY = 0;
    const container = rectangle(width, height, 'none', 'none');
    container.x = x;
    container.y = y;
    container.mask = true;
    container.addChild(tileGrid);
    Object.defineProperties(container, {
        tileX: {
            get: () => tileGrid._tileX,
            set: (value) => {
                tileGrid.children.forEach((child) => {
                    const difference = value - tileGrid._tileX;
                    child.x += difference;
                    if (child.x > (columns - 1) * tileWidth) {
                        child.x = 0 - tileWidth + difference;
                    }
                    if (child.x < 0 - tileWidth - difference) {
                        child.x = (columns - 1) * tileWidth;
                    }
                });
                tileGrid._tileX = value;
            },
            enumerable: true,
            configurable: true,
        },
        tileY: {
            get: () => tileGrid._tileY,
            set: (value) => {
                tileGrid.children.forEach((child) => {
                    const difference = value - tileGrid._tileY;
                    child.y += difference;
                    if (child.y > (rows - 1) * tileHeight) {
                        child.y = 0 - tileHeight + difference;
                    }
                    if (child.y < 0 - tileHeight - difference) {
                        child.y = (rows - 1) * tileHeight;
                    }
                });
                tileGrid._tileY = value;
            },
            enumerable: true,
            configurable: true,
        },
    });
    return container;
};

// Shake effect
export let shakingSprites = [];

export const shake = (sprite, magnitude = 16, angular = false) => {
    let state = {
        counter: 1,
        numberOfShakes: 10,
        startX: sprite.x,
        startY: sprite.y,
        startAngle: sprite.rotation,
        magnitude,
    };
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    if (!shakingSprites.includes(sprite)) {
        shakingSprites.push(sprite);
        sprite.updateShake = () => {
            const magnitudeUnit = state.magnitude / state.numberOfShakes;
            if (angular) {
                if (state.counter < state.numberOfShakes) {
                    sprite.rotation = state.startAngle;
                    state = { ...state, magnitude: state.magnitude - magnitudeUnit };
                    sprite.rotation = state.magnitude * (state.counter % 2 ? 1 : -1);
                    state = { ...state, counter: state.counter + 1 };
                } else {
                    sprite.rotation = state.startAngle;
                    shakingSprites.splice(shakingSprites.indexOf(sprite), 1);
                }
            } else {
                if (state.counter < state.numberOfShakes) {
                    sprite.x = state.startX;
                    sprite.y = state.startY;
                    state = { ...state, magnitude: state.magnitude - magnitudeUnit };
                    sprite.x += randomInt(-state.magnitude, state.magnitude);
                    sprite.y += randomInt(-state.magnitude, state.magnitude);
                    state = { ...state, counter: state.counter + 1 };
                } else {
                    sprite.x = state.startX;
                    sprite.y = state.startY;
                    shakingSprites.splice(shakingSprites.indexOf(sprite), 1);
                }
            }
        };
    }
};

// Progress bar
export const progressBar = (() => {
    let state = {
        maxWidth: 0,
        height: 0,
        backgroundColor: 'gray',
        foregroundColor: 'cyan',
        backBar: null,
        frontBar: null,
        percentage: null,
        assets: null,
        initialized: false,
    };
    return {
        create: (canvas, assets) => {
            if (!state.initialized) {
                state = { ...state, assets, maxWidth: canvas.width / 2, initialized: true };
                state.backBar = rectangle(state.maxWidth, 32, state.backgroundColor);
                state.backBar.x = canvas.width / 2 - state.maxWidth / 2;
                state.backBar.y = canvas.height / 2 - 16;
                state.frontBar = rectangle(state.maxWidth, 32, state.foregroundColor);
                state.frontBar.x = canvas.width / 2 - state.maxWidth / 2;
                state.frontBar.y = canvas.height / 2 - 16;
                state.percentage = text('0%', '28px sans-serif', 'black');
                state.percentage.x = canvas.width / 2 - state.maxWidth / 2 + 12;
                state.percentage.y = canvas.height / 2 - 16;
            }
        },
        update: () => {
            const ratio = (state.assets.loaded + 1) / state.assets.toLoad;
            state.frontBar.width = state.maxWidth * ratio;
            state.percentage.content = `${Math.floor(ratio * 100)} %`;
        },
        remove: () => {
            remove(state.frontBar, state.backBar, state.percentage);
        },
    };
})();