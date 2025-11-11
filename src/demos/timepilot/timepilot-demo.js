// Time Pilot → p5 (sk) framework port skeleton
// Style: functional, closures, no classes. Uses project utilities: createGraphicsContext2, M2D, V.

import { createGraphicsContext2 } from "../../graphics_context2";
import { M2D } from "../../lib/esm/M2D";
import { V } from "../../lib/esm/V";

// --------------------------------------------
// Constants (pared down from original TimePilot.CONSTANTS)
// --------------------------------------------
const CONSTS = {
    player: {
        width: 32,
        height: 32,
        hitRadius: 8,
        rotationFrameCount: 16, // 360 / 22.5
        projectile: { velocity: 7, size: 4 },
        velocity: 5,
    },
    enemy: {
        width: 32,
        height: 32,
        hitRadius: 8,
        velocity: 3,
        turnLimiter: 25,
        spawnLimit: 10,
        projectile: { velocity: 5, size: 6 },
    },
    arena: {
        spawningRadius: 450,
        despawnRadius: 500,
        backgroundColor: "#003366",
    },
};

// --------------------------------------------
// Tiny tick scheduler (maps engine/Ticker)
// --------------------------------------------
const createScheduler = () => {
    let frame = 0;
    let running = false;
    const schedule = [];

    const add = (fn, nthFrame = 1) => {
        schedule.push({ fn, nth: Math.max(1, nthFrame) });
        return schedule.length - 1;
    };

    const remove = (id) => {
        if (schedule[id]) schedule[id] = null;
    };

    const step = () => {
        frame++;
        for (let i = 0; i < schedule.length; i++) {
            const it = schedule[i];
            if (it && frame % it.nth === 0) it.fn(frame);
        }
    };

    return { add, remove, step, getTicks: () => frame, isRunning: () => running, _setRunning: (v) => (running = v) };
};

// --------------------------------------------
// Helpers (subset of engine/helpers)
// --------------------------------------------
const rotateTo = (destDeg, currentDeg, stepDeg) => {
    // Signed smallest-angle direction using atan2(sinΔ, cosΔ)
    const rad = Math.atan2(Math.sin((destDeg - currentDeg) * Math.PI / 180), Math.cos((destDeg - currentDeg) * Math.PI / 180));
    let next = currentDeg + (rad > 0 ? stepDeg : rad < 0 ? -stepDeg : 0);
    if (next >= 360) next -= 360; if (next < 0) next += 360;
    return next;
};

const findHeading = (target, origin = { posX: 0, posY: 0 }) => {
    // World is Y-up; convert to degrees [0,360)
    const deg = Math.atan2(target.posX - origin.posX, target.posY - origin.posY) * (180 / Math.PI);
    return deg > 0 ? 360 - deg : Math.abs(deg);
};

const detectCollision = (a, b) => {
    const dx = a.posX - b.posX; const dy = a.posY - b.posY; const dist = a.radius + b.radius;
    return dx * dx + dy * dy <= dist * dist;
};

const detectAreaExit = (center, p, r) => {
    const dx = center.posX - p.posX; const dy = center.posY - p.posY;
    return dx * dx + dy * dy >= r * r;
};

// --------------------------------------------
// Factories
// --------------------------------------------
const createPlayer = (sk) => {
    const rotStep = 360 / CONSTS.player.rotationFrameCount; // 22.5
    const state = {
        isAlive: true,
        deathTick: 0,
        isShooting: false,
        heading: 90,
        newHeading: false,
        pos: V.create(0, 0),
        lives: 3,
        score: 0,
    };

    const set = (k, v) => (state[k] = v, v);
    const get = (k) => (k ? state[k] : state);

    const reposition = () => {
        if (!state.isAlive) return;
        const h = state.heading * Math.PI / 180;
        // World Y-up: x += sin, y += cos (player velocity forward)
        state.pos = V.add(state.pos, V.create(Math.sin(h) * CONSTS.player.velocity, Math.cos(h) * CONSTS.player.velocity));
    };

    const rotate = () => {
        if (state.isAlive && state.newHeading !== false) state.heading = rotateTo(state.newHeading, state.heading, rotStep);
    };

    const render = (ctx) => {
        // Draw a simple triangle ship centered at origin in world space
        sk.push();
        sk.rotate(-state.heading * Math.PI / 180); // negate due to final Y flip
        sk.noFill();
        sk.stroke(255);
        sk.beginShape();
        sk.vertex(0, CONSTS.player.height * 0.5);
        sk.vertex(CONSTS.player.width * 0.35, -CONSTS.player.height * 0.5);
        sk.vertex(-CONSTS.player.width * 0.35, -CONSTS.player.height * 0.5);
        sk.endShape(sk.CLOSE);
        sk.pop();
    };

    const kill = (tick) => { state.isAlive = false; state.deathTick = tick; };

    const startShooting = () => { state.isShooting = true; };
    const stopShooting  = () => { state.isShooting = false; };

    return { set, get, reposition, rotate, render, kill, startShooting, stopShooting };
};

const createBulletFactory = () => {
    const list = [];
    const create = (origin, headingDeg, size, velocity) => {
        list.push({ pos: V.clone(origin), heading: headingDeg, size, velocity, remove: false });
    };
    const reposition = (arenaCenter) => {
        for (let i = 0; i < list.length; i++) {
            const b = list[i];
            const rad = b.heading * Math.PI / 180;
            b.pos = V.add(b.pos, V.create(Math.sin(rad) * b.velocity, Math.cos(rad) * b.velocity));
            if (detectAreaExit(arenaCenter, { posX: b.pos[0], posY: b.pos[1] }, CONSTS.arena.despawnRadius)) b.remove = true;
        }
    };
    const cleanup = () => {
        for (let i = list.length - 1; i >= 0; i--) if (list[i].remove) list.splice(i, 1);
    };
    const render = (sk, pixelToWorld) => {
        for (const b of list) {
            sk.push();
            sk.translate(b.pos[0], b.pos[1]);
            sk.noStroke();
            sk.fill(255);
            const s = pixelToWorld(b.size);
            sk.rect(-s * 0.5, -s * 0.5, s, s);
            sk.pop();
        }
    };
    return { list, create, reposition, cleanup, render };
};

const createEnemyFactory = () => {
    const list = [];
    const create = (pos, heading) => { list.push({ pos: V.clone(pos), heading, alive: true, deathTick: 0, remove: false }); };

    const reposition = (player, arenaCenter, tick) => {
        for (const e of list) {
            if (!e.alive) continue;
            const rad = e.heading * Math.PI / 180;
            e.pos = V.add(e.pos, V.create(Math.sin(rad) * CONSTS.enemy.velocity, Math.cos(rad) * CONSTS.enemy.velocity));
            if (detectAreaExit(arenaCenter, { posX: e.pos[0], posY: e.pos[1] }, CONSTS.arena.despawnRadius)) e.remove = true;
            if (tick % CONSTS.enemy.turnLimiter === 0) {
                const turnTo = Math.floor(findHeading({ posX: player.pos[0], posY: player.pos[1] }, { posX: e.pos[0], posY: e.pos[1] }) / 22.5) * 22.5;
                e.heading = rotateTo(turnTo, e.heading, 22.5);
            }
        }
    };

    const detectCollisionWithPlayer = (player) => {
        const a = { posX: player.pos[0], posY: player.pos[1], radius: CONSTS.player.hitRadius };
        for (const e of list) {
            if (!e.alive) continue;
            const b = { posX: e.pos[0], posY: e.pos[1], radius: CONSTS.enemy.hitRadius };
            if (detectCollision(a, b)) { e.alive = false; e.deathTick = 0; player.isAlive = false; }
        }
    };

    const cleanup = () => { for (let i = list.length - 1; i >= 0; i--) if (list[i].remove) list.splice(i, 1); };

    const render = (sk) => {
        sk.noFill(); sk.stroke(200);
        for (const e of list) {
            sk.push();
            sk.translate(e.pos[0], e.pos[1]);
            sk.rotate(-e.heading * Math.PI / 180);
            sk.rect(-CONSTS.enemy.width * 0.4, -CONSTS.enemy.height * 0.4, CONSTS.enemy.width * 0.8, CONSTS.enemy.height * 0.8);
            sk.pop();
        }
    };

    const getCount = () => list.length;

    return { list, create, reposition, detectCollisionWithPlayer, cleanup, render, getCount };
};

const createPropFactory = () => {
    const list = [];
    const create = (pos) => list.push({ pos: V.clone(pos), layer: 1, remove: false, relativeVelocity: 0.5, reversed: false, size: 24 });
    const reposition = (playerHeadingDeg) => {
        for (const p of list) {
            const h = ((p.reversed ? (playerHeadingDeg + 180) % 360 : playerHeadingDeg)) * Math.PI / 180;
            const speed = CONSTS.player.velocity * p.relativeVelocity;
            p.pos = V.add(p.pos, V.create(Math.sin(h) * speed, Math.cos(h) * speed));
        }
    };
    const cleanup = () => { for (let i = list.length - 1; i >= 0; i--) if (list[i].remove) list.splice(i, 1); };
    const render = (sk, layer = 0) => {
        for (const p of list) {
            if (layer && p.layer !== layer) continue;
            sk.push();
            sk.translate(p.pos[0], p.pos[1]);
            sk.noStroke(); sk.fill(255, 255, 255, 64);
            sk.ellipse(0, 0, p.size, p.size * 0.6);
            sk.pop();
        }
    };
    const getCount = () => list.length;
    return { list, create, reposition, cleanup, render, getCount };
};

// --------------------------------------------
// Spawning helpers
// --------------------------------------------
const getSpawnCoords = (player) => {
    const arc = 80; const r = CONSTS.arena.spawningRadius;
    const heading = (player.heading - arc / 2) + Math.floor(Math.random() * arc);
    const rad = heading * Math.PI / 180;
    return V.create(player.pos[0] + Math.sin(rad) * r, player.pos[1] + Math.cos(rad) * r);
};

// --------------------------------------------
// Controller (minimal; maps to ControllerInterface)
// --------------------------------------------
const createController = (player, togglePause, restart) => {
    const state = { shootingDown: false };
    const onKeyDown = (e) => {
        switch (e.keyCode) {
            case 37: // left
            case 65: player.set("newHeading", 270); break;
            case 38: // up
            case 87: player.set("newHeading", 0); break;
            case 39: // right
            case 68: player.set("newHeading", 90); break;
            case 40: // down
            case 83: player.set("newHeading", 180); break;
            case 32: player.startShooting(); state.shootingDown = true; break;
            case 80: togglePause(); break; // P
            case 82: restart(); break; // R
        }
    };
    const onKeyUp = (e) => {
        switch (e.keyCode) {
            case 37: case 38: case 39: case 40: case 65: case 68: case 83: case 87:
                player.set("newHeading", false); break;
            case 32: player.stopShooting(); state.shootingDown = false; break;
        }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return { dispose: () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); } };
};

// --------------------------------------------
// Main exported demo factory
// --------------------------------------------
export const createTimePilotDemo = (sk, CANVAS_WIDTH = 720, CANVAS_HEIGHT = 480) => {
    // World (Y-up) and view
    const win  = { left: -200, right: 200, bottom: -150, top: 150 };
    const view = { left: 0, right: 1, bottom: 0, top: 1 };

    // Viewport params & composite matrix
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const { sx, sy, tx, ty } = ctx.viewport;

    const REFLECT_Y = M2D.fromValues(1, 0, 0, -1, 0, CANVAS_HEIGHT);
    const DEVICE    = M2D.fromValues(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
    const WORLD     = M2D.fromValues(sx, 0, 0, sy, tx, ty);
    const COMPOSITE = M2D.multiply(M2D.multiply(REFLECT_Y, DEVICE), WORLD);
    const pixelToWorld = M2D.makePixelToWorld(COMPOSITE);

    // Game state
    const game = { paused: false };
    const gameTicker = createScheduler();
    const renderTicker = createScheduler();

    const player = createPlayer(sk);
    const bullets = createBulletFactory();
    const enemies = createEnemyFactory();
    const props   = createPropFactory();

    // Controller
    let controller = null;
    const togglePause = () => { game.paused = !game.paused; };
    const restart = () => { // minimal reset
        enemies.list.length = 0;
        bullets.list.length = 0;
        props.list.length = 0;
        player.set("isAlive", true); player.set("pos", V.create(0,0)); player.set("heading", 90); player.set("newHeading", false);
    };

    // Spawn some clouds initially
    for (let i = 0; i < 20; i++) {
        props.create(V.create((Math.random() - 0.5) * (win.right - win.left), (Math.random() - 0.5) * (win.top - win.bottom)));
    }

    // Game-tick schedules (approx mapping to original)
    gameTicker.add(() => {
        if (game.paused) return;
        player.reposition();
        enemies.reposition(player.get(), { posX: 0, posY: 0 }, gameTicker.getTicks());
        bullets.reposition({ posX: 0, posY: 0 });
        props.reposition(player.get("heading"));

        // Spawn enemies
        if (enemies.getCount() < CONSTS.enemy.spawnLimit && gameTicker.getTicks() % (200 + Math.floor(Math.random() * 200)) === 0) {
            const spawn = getSpawnCoords(player.get());
            const heading = findHeading({ posX: player.get().pos[0], posY: player.get().pos[1] }, { posX: spawn[0], posY: spawn[1] });
            enemies.create(spawn, heading);
        }
    }, 1);

    gameTicker.add(() => { if (!game.paused) player.rotate(); }, 3);

    gameTicker.add(() => {
        if (game.paused) return;
        if (player.get("isShooting")) {
            bullets.create(V.clone(player.get().pos), player.get("heading"), CONSTS.player.projectile.size, CONSTS.player.projectile.velocity);
        }
    }, 5);

    gameTicker.add(() => { if (!game.paused) enemies.detectCollisionWithPlayer(player.get()); }, 1);
    gameTicker.add(() => { if (!game.paused) { enemies.cleanup(); bullets.cleanup(); props.cleanup(); } }, 1);

    // Render schedule (driven by draw())
    renderTicker.add(() => {
        // device-space clear
        sk.resetMatrix();
        sk.background(CONSTS.arena.backgroundColor);

        // world-space pass
        sk.resetMatrix();
        sk.applyMatrix(...M2D.toArgs(COMPOSITE));

        // Layer 1 props
        props.render(sk, 1);

        // enemies & bullets & player at origin (player drawn at world origin)
        bullets.render(sk, pixelToWorld);

        sk.push();
        // translate world so player is at (0,0) in device → emulate original camera
        sk.translate(-player.get().pos[0], -player.get().pos[1]);
        enemies.render(sk);
        sk.pop();

        // player at origin
        player.render();

        // layer 2 props
        props.render(sk, 2);

        // HUD in device space
        sk.resetMatrix();
        sk.fill(255);
        sk.textSize(14);
        sk.text(`Score: ${player.get("score")}`, 10, 20);
        if (game.paused) { sk.textSize(24); sk.text("Paused (P)", CANVAS_WIDTH/2 - 60, 40); }
    }, 1);

    // p5 hooks
    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            controller = createController({
                set: player.set,
                startShooting: player.startShooting,
                stopShooting: player.stopShooting,
            }, togglePause, restart);
            gameTicker._setRunning(true);
            renderTicker._setRunning(true);
        },
        display() {
            // advance game logic by one frame, then render
            if (gameTicker.isRunning()) gameTicker.step();
            if (renderTicker.isRunning()) renderTicker.step();
        },
        dispose() { controller?.dispose?.(); }
    };
};
