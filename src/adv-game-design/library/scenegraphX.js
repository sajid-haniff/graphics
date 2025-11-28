// src/adv-game-design/library/scenegraphX.js
// Scenegraph (functional, no classes) aligned with your framework patterns.
// - Y-up world via COMPOSITE (REFLECT_Y · DEVICE · WORLD)
// - p5 APIs accessed only via `sk`
// - Factories with closures; no ES6 classes
// - Pixel-consistent stroke via pixelToWorld
// - Lazy drawingContext fetch inside render paths

import { createGraphicsContext2 } from "../../graphics_context2";
import { M2D } from "../../lib/esm/M2D";

export const createScenegraph = (
    sk,
    CANVAS_WIDTH = 640,
    CANVAS_HEIGHT = 480,
    worldWin = { left: -10, right: 10, bottom: -10, top: 10 }
) => {
    // ------------------------------------------------------------
    // Viewport / composite transform (Y-up world)
    // ------------------------------------------------------------
    const view = { left: 0, right: 1, bottom: 0, top: 1 };
    const ctx2 = createGraphicsContext2(worldWin, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx2.viewport;

    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const COMPOSITE = M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);

    const pixelToWorld = M2D.makePixelToWorld(COMPOSITE);

    // ------------------------------------------------------------
    // Core node factory
    // ------------------------------------------------------------
    const createNode = () => {
        const node = {
            // transform/state
            x: 0, y: 0, width: 0, height: 0,
            rotation: 0, alpha: 1, visible: true,
            scaleX: 1, scaleY: 1,
            pivotX: 0.5, pivotY: 0.5,
            vx: 0, vy: 0,
            _layer: 0,
            // effects
            shadow: false,
            shadowColor: "rgba(100, 100, 100, 0.5)",
            shadowOffsetX: 3, shadowOffsetY: 3, shadowBlur: 3,
            blendMode: null,
            mask: false,
            // graph
            children: [],
            parent: null,
            // animation
            frames: [], loop: true, fps: 12, playing: false,
            _elapsedMs: 0, _currentFrame: 0,
            // circle flag
            _circular: false,

            // graph ops
            addChild(child){
                if (!child) return;
                if (child.parent && child.parent !== node) child.parent.removeChild(child);
                child.parent = node; node.children.push(child);
                // keep children sorted by layer
                node.children.sort((a,b)=>a.layer-b.layer);
                node._recalc && node._recalc();
            },
            add(...kids){ kids.forEach(k => node.addChild(k)); },
            removeChild(child){
                const i = node.children.indexOf(child);
                if (i >= 0){ node.children.splice(i,1); child.parent = null; node._recalc && node._recalc(); }
            },
            remove(...kids){ kids.forEach(k => node.removeChild(k)); },

            // layer (getter/setter)
            get layer(){ return node._layer; },
            set layer(v){ node._layer = v; if (node.parent){ node.parent.children.sort((a,b)=>a.layer-b.layer); }},

            // convenient dimensions
            get halfWidth(){ return node.width * 0.5; },
            get halfHeight(){ return node.height * 0.5; },

            // global position (computed)
            get gx(){ return node.parent ? node.x + node.parent.gx : node.x; },
            get gy(){ return node.parent ? node.y + node.parent.gy : node.y; },

            // animation helpers
            play(){ node.playing = true; },
            stop(){ node.playing = false; },
            show(frame){ node._applyFrame && node._applyFrame(frame); node._currentFrame = frame; },
            playSequence(range){ node._seq = { start: range[0], end: range[1] }; node.playing = true; },

            // sprite-frame applier (filled by sprite factory)
            _applyFrame: null,

            // layout helpers
            putCenter(b, xOff=0, yOff=0){ b.x = node.x + node.halfWidth  - b.halfWidth  + xOff; b.y = node.y + node.halfHeight - b.halfHeight + yOff; },
            putTop(b, xOff=0, yOff=0){ b.x = node.x + node.halfWidth  - b.halfWidth  + xOff; b.y = node.y - b.height + yOff; },
            putRight(b, xOff=0, yOff=0){ b.x = node.x + node.width + xOff; b.y = node.y + node.halfHeight - b.halfHeight + yOff; },
            putBottom(b, xOff=0, yOff=0){ b.x = node.x + node.halfWidth  - b.halfWidth  + xOff; b.y = node.y + node.height + yOff; },
            putLeft(b, xOff=0, yOff=0){ b.x = node.x - b.width + xOff; b.y = node.y + node.halfHeight - b.halfHeight + yOff; },
            swapChildren(a,b){
                const i = node.children.indexOf(a), j = node.children.indexOf(b);
                if (i>=0 && j>=0){ const tmp = node.children[i]; node.children[i]=node.children[j]; node.children[j]=tmp; }
            },

            // placeholder render
            _render: null
        };

        // circular convenience (adds diameter/radius)
        Object.defineProperty(node, 'circular', {
            get(){ return node._circular; },
            set(v){
                if (v && !node._circular){
                    Object.defineProperties(node, {
                        diameter: { enumerable:true, configurable:true,
                            get(){ return node.width; },
                            set(val){ node.width = val; node.height = val; }
                        },
                        radius: { enumerable:true, configurable:true,
                            get(){ return node.width * 0.5; },
                            set(val){ node.width = val*2; node.height = val*2; }
                        }
                    });
                    node._circular = true;
                } else if (!v && node._circular){
                    delete node.diameter; delete node.radius; node._circular = false;
                }
            }
        });

        return node;
    };

    // Root node
    const root = createNode();
    root.alpha = 1; root.x = 0; root.y = 0; // gx/gy are getters

    // ------------------------------------------------------------
    // Concrete node factories
    // ------------------------------------------------------------
    const rectangle = (w=32,h=32, fill=sk.color(128), stroke=null, lineW=0, x=0, y=0) => {
        const n = createNode();
        n.width=w; n.height=h; n.x=x; n.y=y;
        n._render = () => {
            sk.strokeWeight(pixelToWorld(lineW));
            if (stroke) sk.stroke(stroke); else sk.noStroke();
            if (fill)   sk.fill(fill);     else sk.noFill();
            sk.rect(-n.width*n.pivotX, -n.height*n.pivotY, n.width, n.height);
        };
        return n;
    };

    const circle = (diam=32, fill=sk.color(180), stroke=null, lineW=0, x=0, y=0) => {
        const n = createNode(); n.circular = true; n.diameter = diam; n.x=x; n.y=y;
        n._render = () => {
            sk.strokeWeight(pixelToWorld(lineW));
            if (stroke) sk.stroke(stroke); else sk.noStroke();
            if (fill)   sk.fill(fill);     else sk.noFill();
            sk.ellipse(
                n.radius + (-n.diameter*n.pivotX),
                n.radius + (-n.diameter*n.pivotY),
                n.diameter, n.diameter
            );
        };
        return n;
    };

    const line = (x1=0,y1=0,x2=1,y2=1, stroke=sk.color(255), lineW=1) => {
        const n = createNode();
        n._render = () => {
            sk.strokeWeight(pixelToWorld(lineW));
            sk.noFill(); sk.stroke(stroke);
            sk.line(x1, y1, x2, y2);
        };
        return n;
    };

    const text = (content="", size=16, font="sans-serif", fill=sk.color(255)) => {
        const n = createNode(); n._text = { content, size, font, fill };
        n._render = () => {
            sk.noStroke(); sk.fill(n._text.fill); sk.textSize(n._text.size); sk.textFont(n._text.font);
            const dx = -n.width * n.pivotX; const dy = -n.height * n.pivotY;
            sk.push(); sk.translate(dx, dy);
            sk.text(n._text.content, 0, 0);
            sk.pop();
            if (n.width === 0){ n.width = sk.textWidth(n._text.content); n.height = n._text.size; }
        };
        return n;
    };

    const sprite = (source, x=0, y=0) => {
        const n = createNode(); n.x=x; n.y=y; n._image = null;
        // frames: p5.Image[] OR atlas frames (not used here, but kept for parity)
        const initFromImage = (img) => {
            n._image = img; n._spriteSourceX=0; n._spriteSourceY=0; n._spriteSourceW=img.width; n._spriteSourceH=img.height; n.width = img.width; n.height = img.height;
        };

        if (source && source.width !== undefined){
            initFromImage(source);
        } else if (Array.isArray(source)){
            n.frames = source.slice();
            n._applyFrame = (idx) => {
                const f = n.frames[idx]; if (!f) return; initFromImage(f); n._currentFrame = idx;
            };
            n._applyFrame(0);
        }

        n._render = (dc) => {
            if (!dc || !n._image || n._image.width === undefined) return;
            const img = n._image.canvas ? n._image.canvas : n._image;
            dc.drawImage(
                img,
                n._spriteSourceX || 0, n._spriteSourceY || 0,
                n._spriteSourceW || n._image.width, n._spriteSourceH || n._image.height,
                -n.width * n.pivotX, -n.height * n.pivotY,
                n.width, n.height
            );
        };
        return n;
    };

    const group = (...kids) => {
        const n = createNode();
        n._recalc = () => {
            if (n.children.length === 0){ n.width = 0; n.height = 0; return; }
            let w = 0, h = 0; n.children.forEach(c => { w = Math.max(w, c.x + c.width); h = Math.max(h, c.y + c.height); });
            n.width = w; n.height = h;
        };
        kids.forEach(k => n.addChild(k));
        return n;
    };

    // ------------------------------------------------------------
    // Utilities
    // ------------------------------------------------------------
    const grid = (columns=0, rows=0, cellW=32, cellH=32, center=false, xOff=0, yOff=0, makeSprite=() => circle(16), extra=null) => {
        const container = group();
        const length = columns * rows;
        for (let i=0;i<length;i++){
            const x = (i % columns) * cellW;
            const y = Math.floor(i / columns) * cellH;
            const s = makeSprite(); container.addChild(s);
            if (center){ s.x = x + cellW*0.5 - s.halfWidth  + xOff; s.y = y + cellH*0.5 - s.halfHeight + yOff; }
            else       { s.x = x + xOff; s.y = y + yOff; }
            if (extra) extra(s);
        }
        return container;
    };

    const filmstrip = (image, frameW, frameH, spacing=0) => {
        const positions = [];
        const columns = Math.floor(image.width / frameW);
        const rows    = Math.floor(image.height / frameH);
        const n = columns * rows;
        for (let i=0;i<n;i++){
            let x = (i % columns) * frameW;
            let y = Math.floor(i / columns) * frameH;
            if (spacing>0){ x += spacing + (spacing*(i % columns)); y += spacing + (spacing*Math.floor(i/columns)); }
            positions.push([x,y]);
        }
        return { image, data: positions, width: frameW, height: frameH };
    };

    const tilingSprite = (w, h, source, x=0, y=0) => {
        const tileW = source.frame ? source.frame.w : source.width;
        const tileH = source.frame ? source.frame.h : source.height;
        const cols = w >= tileW ? Math.round(w / tileW) + 1 : 2;
        const rows = h >= tileH ? Math.round(h / tileH) + 1 : 2;
        const tileGrid = grid(cols, rows, tileW, tileH, false, 0, 0, () => sprite(source));
        tileGrid._tileX = 0; tileGrid._tileY = 0;
        const container = rectangle(w, h, null, null, 0, x, y); container.mask = true; container.addChild(tileGrid);
        Object.defineProperties(container, {
            tileX: { enumerable:true, configurable:true,
                get(){ return tileGrid._tileX; },
                set(value){
                    const diff = value - tileGrid._tileX;
                    tileGrid.children.forEach(c => {
                        c.x += diff;
                        if (c.x > (cols-1)*tileW) c.x = 0 - tileW + diff;
                        if (c.x < 0 - tileW - diff) c.x = (cols-1)*tileW;
                    });
                    tileGrid._tileX = value;
                }
            },
            tileY: { enumerable:true, configurable:true,
                get(){ return tileGrid._tileY; },
                set(value){
                    const diff = value - tileGrid._tileY;
                    tileGrid.children.forEach(c => {
                        c.y += diff;
                        if (c.y > (rows-1)*tileH) c.y = 0 - tileH + diff;
                        if (c.y < 0 - tileH - diff) c.y = (rows-1)*tileH;
                    });
                    tileGrid._tileY = value;
                }
            }
        });
        return container;
    };

    // ------------------------------------------------------------
    // Interactivity / particles / shake (lightweight)
    // ------------------------------------------------------------
    const buttons = [];
    const draggableSprites = [];
    const shakingSprites = [];
    const particles = [];

    const makeInteractive = (n) => {
        n.press = null; n.release = null; n.over = null; n.out = null; n.tap = null;
        n._iState = { state: "up", pressed: false, hoverOver: false };
        buttons.push(n);
    };

    const updateInteractive = (pointer, canvas) => {
        buttons.forEach(n => {
            const hit = pointer.hitTestSprite ? pointer.hitTestSprite(n) : false;
            const wasPressed = n._iState.pressed;
            if (pointer.isDown && hit){ n._iState.state = "down"; if (!wasPressed){ n.press && n.press(); n._iState.pressed = true; } }
            else if (hit){ n._iState.state = "over"; if (wasPressed){ n.release && n.release(); n._iState.pressed = false; if (pointer.tapped && n.tap) n.tap(); } if (!n._iState.hoverOver){ n.over && n.over(); n._iState.hoverOver = true; } }
            else { if (n._iState.hoverOver){ n.out && n.out(); n._iState.hoverOver = false; } n._iState.state = "up"; if (wasPressed){ n.release && n.release(); n._iState.pressed = false; } }
        });
        if (canvas){
            const over = draggableSprites.some(s => pointer.hitTestSprite && pointer.hitTestSprite(s) && s._draggable);
            canvas.style.cursor = over ? "pointer" : "auto";
        }
    };

    const updateDragAndDrop = (pointer, canvas) => {
        let dragSprite = updateDragAndDrop._dragSprite || null;
        let dragOffsetX = updateDragAndDrop._dx || 0;
        let dragOffsetY = updateDragAndDrop._dy || 0;

        if (pointer.isDown){
            if (!dragSprite){
                for (let i = draggableSprites.length - 1; i >= 0; i--){
                    const s = draggableSprites[i];
                    if (pointer.hitTestSprite && pointer.hitTestSprite(s) && s._draggable){
                        dragOffsetX = pointer.x - s.gx; dragOffsetY = pointer.y - s.gy; dragSprite = s;
                        const ch = s.parent.children; ch.splice(ch.indexOf(s),1); ch.push(s);
                        break;
                    }
                }
            } else {
                dragSprite.x = pointer.x - dragOffsetX; dragSprite.y = pointer.y - dragOffsetY;
            }
        } else { dragSprite = null; }

        updateDragAndDrop._dragSprite = dragSprite; updateDragAndDrop._dx = dragOffsetX; updateDragAndDrop._dy = dragOffsetY;

        if (canvas){ const over = draggableSprites.some(s => pointer.hitTestSprite && pointer.hitTestSprite(s) && s._draggable); canvas.style.cursor = over ? "pointer" : "auto"; }
    };

    const emitter = (intervalMs, makeParticle) => {
        let playing = false, tAccum = 0;
        return {
            play(){ playing = true; },
            stop(){ playing = false; },
            update(dt){ if (!playing) return; tAccum += dt; while (tAccum >= intervalMs){ tAccum -= intervalMs; const p = makeParticle(); particles.push(p); root.addChild(p.node); } }
        };
    };

    const particleEffect = (x=0,y=0, spriteFn=() => circle(10, sk.color(255,0,0)), num=10) => {
        for (let i=0;i<num;i++){
            const d = 3 + Math.random()*5; const node = circle(d, sk.color(255*Math.random(),255*Math.random(),255*Math.random()));
            node.x = x; node.y = y; const vx = (Math.random()*2-1)*2, vy = (Math.random()*2-1)*2; node.alpha = 1;
            particles.push({ node, vx, vy, life: 0.8 + Math.random()*0.5 }); root.addChild(node);
        }
    };

    const shake = (n, magnitude=16, angular=false) => {
        if (shakingSprites.includes(n)) return; shakingSprites.push(n);
        n._shake = { counter:1, numberOfShakes:10, startX:n.x, startY:n.y, startA:n.rotation, magnitude };
        n.updateShake = () => {
            const s = n._shake; const unit = s.magnitude / s.numberOfShakes;
            if (s.counter < s.numberOfShakes){
                if (!angular){ n.x = s.startX + (Math.random()*2-1) * s.magnitude; n.y = s.startY + (Math.random()*2-1) * s.magnitude; }
                else { n.rotation = s.magnitude * (s.counter % 2 ? 1 : -1); }
                s.magnitude -= unit; s.counter += 1;
            } else {
                n.x = s.startX; n.y = s.startY; n.rotation = s.startA; shakingSprites.splice(shakingSprites.indexOf(n),1); delete n._shake;
            }
        };
    };

    const progressBar = () => {
        const bar = { back:null, front:null, label:null, maxW: CANVAS_WIDTH*0.5, initialized:false, assets:null };
        return {
            create(canvasOrNull, assets){
                if (this.initialized) return; this.assets = assets; this.initialized = true;
                this.back  = rectangle(this.maxW, 32, sk.color(80)); this.front = rectangle(this.maxW, 32, sk.color(0,200,255));
                this.back.x = (CANVAS_WIDTH - this.maxW)/2; this.back.y = (CANVAS_HEIGHT)/2 - 16;
                this.front.x = this.back.x; this.front.y = this.back.y; this.front.width = 0;
                this.label = text("0%", 18, "sans-serif", sk.color(255)); this.label.x = this.back.x + 12; this.label.y = this.back.y + 6;
                root.add(this.back, this.front, this.label);
            },
            update(){ if (!this.assets) return; const ratio = (this.assets.loaded + 1) / this.assets.toLoad; this.front.width = this.maxW*ratio; this.label._text.content = `${Math.floor(ratio*100)} %`; },
            remove(){ if (this.back){ const p = this.back.parent; p && p.remove(this.back, this.front, this.label); }
            }
        };
    };

    // --------------------------------------------
    // Rendering
    // --------------------------------------------
    const drawNode = (n, parentAlpha=1) => {
        if (!n.visible) return;

        // Fetch lazily; p5 sets drawingContext after createCanvas
        const dc = sk.drawingContext;
        if (!dc) return;

        dc.save();

        // Local transform (post-multiply order in p5)
        sk.translate(n.x + n.width*n.pivotX, n.y + n.height*n.pivotY);
        sk.rotate(n.rotation);
        sk.scale(n.scaleX, n.scaleY);

        // State
        const currentAlpha = Math.max(0, Math.min(1, n.alpha * parentAlpha));
        dc.globalAlpha = currentAlpha;
        if (n.shadow){
            dc.shadowColor   = n.shadowColor;
            dc.shadowOffsetX = pixelToWorld(n.shadowOffsetX);
            dc.shadowOffsetY = pixelToWorld(n.shadowOffsetY);
            dc.shadowBlur    = pixelToWorld(n.shadowBlur);
        }
        if (typeof n.blendMode === 'string') dc.globalCompositeOperation = n.blendMode;

        // Sprite animation step (time-based)
        if (n.playing && n.frames && n.frames.length > 1){
            const stepMs = 1000 / (n.fps || 12);
            n._elapsedMs += _dtMs;
            while (n._elapsedMs >= stepMs){
                n._elapsedMs -= stepMs;
                const seq = n._seq || { start:0, end:n.frames.length-1 };
                let next = n._currentFrame + 1;
                if (next > seq.end){ if (n.loop) next = seq.start; else { n.playing = false; break; } }
                n._applyFrame && n._applyFrame(next);
                n._currentFrame = next;
            }
        }

        // Render self + children (with optional mask)
        if (n._render){
            if (n.mask){
                dc.save();
                dc.beginPath();
                if (n._circular){
                    const cx = n.radius + (-n.diameter*n.pivotX);
                    const cy = n.radius + (-n.diameter*n.pivotY);
                    dc.arc(cx, cy, n.radius, 0, Math.PI*2);
                } else {
                    dc.rect(-n.width*n.pivotX, -n.height*n.pivotY, n.width, n.height);
                }
                dc.clip();
                n._render(dc);
                n.children.forEach(c => drawNode(c, currentAlpha));
                dc.restore();
            } else {
                n._render(dc);
                n.children.forEach(c => drawNode(c, currentAlpha));
            }
        } else {
            n.children.forEach(c => drawNode(c, currentAlpha));
        }

        dc.restore();
    };

    let _lastMs = (typeof performance !== 'undefined' ? performance.now() : 0);
    let _dtMs = 16.7;

    const render = () => {
        const now = (typeof performance !== 'undefined' ? performance.now() : _lastMs + 16.7);
        _dtMs = now - _lastMs; _lastMs = now;

        sk.resetMatrix();
        sk.clear();
        sk.applyMatrix(...M2D.toArgs(COMPOSITE));
        drawNode(root, 1);

        // updates
        shakingSprites.forEach(s => s.updateShake && s.updateShake());
        for (let i = particles.length - 1; i >= 0; i--){
            const p = particles[i];
            p.life -= _dtMs/1000;
            p.node.x += p.vx; p.node.y += p.vy;
            p.node.alpha *= 0.96;
            if (p.life <= 0 || p.node.alpha <= 0.03){ const par = p.node.parent; par && par.removeChild(p.node); particles.splice(i,1); }
        }
    };

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------
    return {
        root,
        render,
        rectangle, circle, line, text, sprite, group,
        grid, filmstrip, tilingSprite,
        makeInteractive, updateInteractive, updateDragAndDrop,
        emitter, particleEffect, shake,
        progressBar: progressBar(),
        pixelToWorld,
        COMPOSITE,
        _internals: { buttons, draggableSprites, shakingSprites, particles }
    };
};

export default createScenegraph;
