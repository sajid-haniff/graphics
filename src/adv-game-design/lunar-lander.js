// src/adv-game-design/scenegraph-lunar-lander-hierarchical-demo.js
// Hierarchical Lunar Lander to exercise the scenegraph.
// All p5 APIs through `sk`. World Y-up. Single COMPOSITE pass via sg.render().
// Keys: [UP]=thrust, [A/D]=rotate body, [L]=toggle landing gear deploy, [R]=reset.

import { createScenegraph } from "./library/scenegraph";

export const createLunarLanderDemo = (sk, CANVAS_WIDTH = 1000, CANVAS_HEIGHT = 640) => {
    // World window (Y-up)
    const win = { left: -18, right: 18, bottom: -9, top: 9 };

    // Scenegraph
    const sg = createScenegraph(sk, CANVAS_WIDTH, CANVAS_HEIGHT, win);
    const px = sg.pixelToWorld;

    // -------------------------------------------------------------
    // WORLD / BACKDROP
    // -------------------------------------------------------------
    const world = sg.group(); world.layer = 0;

    const groundY = -6.8;
    const horizon  = sg.line(win.left, groundY, win.right, groundY, sk.color(120), 2);
    const padW = 6, padH = 0.35, padX = -padW * 0.5;
    const pad = sg.rectangle(padW, padH, sk.color(35, 180, 120), sk.color(255), 2);
    pad.x = padX; pad.y = groundY;

    // A few “craters” to decorate (circles with stroke only)
    const crater = (cx, cy, d) => {
        const c = sg.circle(d, null, sk.color(80), 2);
        c.x = cx - d * 0.5; c.y = cy - d * 0.5; c.alpha = 0.7;
        return c;
    };

    world.add(horizon, pad,
        crater(-12, groundY + 0.2, 2.2),
        crater(  4, groundY + 0.1, 1.6),
        crater( 10, groundY + 0.15, 2.8)
    );

    // -------------------------------------------------------------
    // LANDER HIERARCHY
    // -------------------------------------------------------------
    // Top-level lander transform (position/rotation in world)
    const lander = sg.group();
    lander.layer = 10;
    lander.width = 4.4;              // approximate enclosure for convenience
    lander.height = 5.6;
    lander.pivotX = 0.5;             // rotate about center
    lander.pivotY = 0.5;

    // BODY — a chassis group so doors/legs/engines can attach to it
    const chassis = sg.group();           // local TL = top-left of the lander body envelope
    chassis.width = 3.6; chassis.height = 4.2;
    chassis.pivotX = 0; chassis.pivotY = 0;
    chassis.x = (lander.width - chassis.width) * 0.5; // center chassis inside lander envelope
    chassis.y = (lander.height - chassis.height) * 0.5;

    // Main hull
    const hull = sg.rectangle(chassis.width, chassis.height, sk.color(225), sk.color(40), 2);

    // Cockpit window
    const windowW = 1.2, windowH = 0.6;
    const windowRect = sg.rectangle(windowW, windowH, sk.color(60, 160, 255), sk.color(255), 2);
    windowRect.x = chassis.width * 0.5 - windowW * 0.5;
    windowRect.y = chassis.height * 0.65;

    // NAV BEACONS (blink) — two small circles mounted at top corners
    const beacon = (x, y, col) => {
        const b = sg.circle(0.28, col, sk.color(255), 1.5);
        b.pivotX = 0.5; b.pivotY = 0.5;
        b.x = x - b.halfWidth; b.y = y - b.halfHeight;
        return b;
    };
    const beaconL = beacon(0.25, chassis.height - 0.25, sk.color(255, 90, 90));
    const beaconR = beacon(chassis.width - 0.25, chassis.height - 0.25, sk.color(90, 255, 120));

    // DOOR — a rectangle that rotates about a left hinge
    const doorW = 1.6, doorH = 1.2;
    const door = sg.group();
    door.width = doorW; door.height = doorH; door.pivotX = 0; door.pivotY = 0.5; // hinge at left middle
    door.x = chassis.width * 0.5 - 0.1; door.y = 1.1;  // hinge point near center
    const doorPanel = sg.rectangle(doorW, doorH, sk.color(200), sk.color(60), 2);
    doorPanel.x = 0; doorPanel.y = -doorH * 0.5; // align relative to hinge pivot
    door.add(doorPanel);

    // ANTENNA MAST — rotates, with a spinning dish child
    const mast = sg.group();
    mast.width = 0.2; mast.height = 1.4;
    mast.pivotX = 0.5; mast.pivotY = 0;     // rotate at base
    mast.x = chassis.width * 0.15 - mast.width * 0.5;
    mast.y = chassis.height - 0.2;

    const mastPole = sg.rectangle(0.18, 1.2, sk.color(160), sk.color(60), 1.5);
    mastPole.x = -mastPole.width * 0.5; mastPole.y = 0;

    const dish = sg.group();
    dish.width = 0.9; dish.height = 0.4;
    dish.pivotX = 0.5; dish.pivotY = 0.5;
    dish.x = -0.05; dish.y = 1.1;

    const dishPlate = sg.circle(0.9, sk.color(230), sk.color(60), 1.5);
    dishPlate.x = -dishPlate.halfWidth; dishPlate.y = -dishPlate.halfHeight;

    const dishStem = sg.rectangle(0.08, 0.45, sk.color(160), sk.color(60), 1);
    dishStem.x = -dishStem.halfWidth; dishStem.y = -dishStem.halfHeight - 0.1;

    dish.add(dishPlate, dishStem);
    mast.add(mastPole, dish);

    // MAIN ENGINE — a gimbaled bell under the chassis
    const engineMount = sg.group();
    engineMount.width = 1.0; engineMount.height = 0.6;
    engineMount.pivotX = 0.5; engineMount.pivotY = 0;     // gimbal at top center
    engineMount.x = chassis.width * 0.5 - engineMount.halfWidth;
    engineMount.y = 0.05; // just beneath bottom of hull (we'll place under hull later)

    const bell = sg.rectangle(0.9, 0.6, sk.color(180), sk.color(60), 1.5);
    bell.pivotX = 0.5; bell.pivotY = 0; bell.x = engineMount.halfWidth - bell.halfWidth; bell.y = 0;

    // exhaust flame group (scaled on Y for intensity)
    const flame = sg.group();
    flame.width = 0.5; flame.height = 1.0; flame.pivotX = 0.5; flame.pivotY = 1; // attach to nozzle exit
    flame.x = engineMount.halfWidth - flame.halfWidth; flame.y = -0.02;

    const flameCore = sg.rectangle(0.18, 0.9, sk.color(255, 200, 90), sk.color(255), 1);
    flameCore.x = flame.halfWidth - flameCore.halfWidth; flameCore.y = -flame.height; flameCore.alpha = 0.0;

    const flameGlow = sg.rectangle(0.5, 0.6, sk.color(255, 140, 0, 160), null, 0);
    flameGlow.x = 0; flameGlow.y = -flame.height; flameGlow.alpha = 0.0;

    flame.add(flameGlow, flameCore);
    engineMount.add(bell, flame);

    // SIDE THRUSTERS — small pods with their own flames
    const makePod = (sideSign) => {
        const pod = sg.group();
        pod.width = 0.9; pod.height = 0.6; pod.pivotX = 0.5; pod.pivotY = 0.5;
        pod.x = chassis.width * (sideSign > 0 ? 1 : 0) - pod.halfWidth;
        pod.y = 2.4;

        const shell = sg.rectangle(pod.width, pod.height, sk.color(200), sk.color(60), 1.5);
        shell.x = 0; shell.y = 0;

        const flameG = sg.group();
        flameG.width = 0.4; flameG.height = 0.7; flameG.pivotX = sideSign > 0 ? 0 : 1; flameG.pivotY = 0.5;
        flameG.x = sideSign > 0 ? pod.width : -flameG.width; flameG.y = pod.halfHeight - flameG.halfHeight;

        const glow = sg.rectangle(flameG.width, flameG.height, sk.color(255, 120, 0, 150), null, 0);
        glow.x = 0; glow.y = 0; glow.alpha = 0.0;

        const core = sg.rectangle(0.12, 0.46, sk.color(255, 220, 140), sk.color(255), 1);
        core.x = (flameG.width - core.width) * 0.5; core.y = (flameG.height - core.height) * 0.5; core.alpha = 0.0;

        flameG.add(glow, core);
        pod.add(shell, flameG);

        return { pod, flameG, glow, core };
    };
    const leftPod  = makePod(-1);
    const rightPod = makePod(+1);

    // LANDING GEAR — two symmetric legs, each a hinge group with a shock sub-group and footpad
    const makeLeg = (sideSign) => {
        const hinge = sg.group();                // rotates to deploy
        hinge.width = 0.2; hinge.height = 0.2;
        hinge.pivotX = 0.5; hinge.pivotY = 0.5;
        hinge.x = chassis.width * 0.5 + sideSign * 1.1 - hinge.halfWidth;
        hinge.y = 0.25;

        // Upper strut (rotates with hinge)
        const upper = sg.rectangle(0.18, 1.5, sk.color(190), sk.color(60), 1.5);
        upper.x = -upper.halfWidth; upper.y = -0.2;

        // Shock group (slides inside upper)
        const shock = sg.group();
        shock.width = 0.18; shock.height = 1.1; shock.pivotX = 0.5; shock.pivotY = 0; // slides downward on land
        shock.x = -shock.halfWidth; shock.y = -0.2;

        const shockTube = sg.rectangle(0.14, 1.1, sk.color(160), sk.color(60), 1);
        shockTube.x = -shockTube.halfWidth + shock.halfWidth; shockTube.y = 0;

        // Lower strut (attached at end of shock)
        const lower = sg.rectangle(0.16, 1.4, sk.color(170), sk.color(60), 1.5);
        lower.x = -lower.halfWidth + shock.halfWidth; lower.y = -1.2;

        // Footpad (rotates slightly for contact)
        const foot = sg.group();
        foot.width = 1.0; foot.height = 0.28; foot.pivotX = 0.5; foot.pivotY = 1; // hinge at top
        foot.x = shock.halfWidth - foot.halfWidth; foot.y = -1.35;

        const padRect = sg.rectangle(foot.width, foot.height, sk.color(120), sk.color(255), 1.5);
        padRect.x = 0; padRect.y = -foot.height;

        foot.add(padRect);
        shock.add(shockTube, lower, foot);
        hinge.add(upper, shock);

        return { hinge, shock, foot };
    };
    const legL = makeLeg(-1);
    const legR = makeLeg(+1);

    // Assemble CHASSIS and attach to LANDER
    chassis.add(hull, windowRect, beaconL, beaconR, door, mast,
        engineMount, leftPod.pod, rightPod.pod, legL.hinge, legR.hinge);
    lander.add(chassis);
    sg.root.add(world, lander);

    // -------------------------------------------------------------
    // STATE & HELPERS
    // -------------------------------------------------------------
    let t = 0;
    let deploy = 0;           // 0..1 landing gear/door deployment
    let thrust = 0;           // 0..1 main engine throttle
    let bodyRotation = 0;     // lander.rotation adjustment by keys

    const ease = (x) => x * x * (3 - 2 * x); // smoothstep for nicer motion
    const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

    const key = (code) => sk.keyIsDown(code);

    const reset = () => {
        thrust = 0;
        deploy = 0;
        bodyRotation = 0;
        lander.rotation = 0;
        // center above pad
        const cx = padX + padW * 0.5;
        const cy = groundY + 4.0;
        lander.x = cx - lander.halfWidth;
        lander.y = cy - lander.halfHeight;
    };

    reset();

    // -------------------------------------------------------------
    // UPDATE (purely to exercise hierarchy; no full physics)
    // -------------------------------------------------------------
    const update = () => {
        t += 1 / 60;

        // Controls
        if (key(sk.UP_ARROW))    thrust = clamp(thrust + 0.04, 0, 1); else thrust *= 0.9;
        if (key(sk.LEFT_ARROW))  bodyRotation += 0.03;
        if (key(sk.RIGHT_ARROW)) bodyRotation -= 0.03;
        if (sk.keyIsPressed && (sk.key === 'l' || sk.key === 'L')) deploy = 1;
        if (sk.keyIsPressed && (sk.key === 'r' || sk.key === 'R')) reset();

        // Body pose
        lander.rotation = bodyRotation;

        // Antenna mast + dish motion
        mast.rotation = 0.15 * sk.sin(t * 0.7);         // slow sweep
        dish.rotation += 0.18;                           // constant spin

        // Door deploy (hinge on left)
        const d = ease(deploy);
        door.rotation = -sk.radians(90) * d;            // swings open 90°

        // Main engine gimbal + flame intensity
        engineMount.rotation = 0.15 * sk.sin(t * 2.0);  // oscillate to show hinge
        const flameOn = thrust > 0.02;
        const jitter = flameOn ? 0.15 + 0.1 * sk.sin(t * 30 + 5) : 0;
        flame.scaleY = 0.2 + thrust * (1.2 + jitter);
        flameCore.alpha = flameOn ? 1.0 : 0.0;
        flameGlow.alpha = flameOn ? 0.8 : 0.0;

        // Side pods fire opposite to gimbal direction (purely visual)
        const sidePower = 0.4 * sk.max(0, sk.sin(t * 2.0 + 1.2));
        const leftOn  = sidePower > 0.2;
        const rightOn = !leftOn;

        leftPod.glow.alpha  = leftOn  ? 0.7 : 0.0;
        leftPod.core.alpha  = leftOn  ? 1.0 : 0.0;
        rightPod.glow.alpha = rightOn ? 0.7 : 0.0;
        rightPod.core.alpha = rightOn ? 1.0 : 0.0;

        // Landing gear deploy
        const legAngle = sk.radians(70) * d;        // swing out
        legL.hinge.rotation =  legAngle;
        legR.hinge.rotation = -legAngle;

        // Shock extension (simulate compression/extension)
        const shockTravel = 0.5 * d * (1 + 0.2 * sk.sin(t * 6.0)); // 0..~0.6
        legL.shock.y = -0.2 - shockTravel;
        legR.shock.y = -0.2 - shockTravel;

        // Footpad auto-level a touch
        legL.foot.rotation = -0.08 * d;
        legR.foot.rotation =  0.08 * d;

        // Blinking beacons
        const blinkA = 0.65 + 0.35 * sk.sin(t * 6.0);
        const blinkB = 0.65 + 0.35 * sk.sin(t * 6.0 + Math.PI);
        beaconL.alpha = blinkA;
        beaconR.alpha = blinkB;

        // Gentle bob so hierarchy motion is obvious
        const baseY = groundY + 4.0 + 0.4 * sk.sin(t * 1.3);
        lander.y = baseY - lander.halfHeight;
    };

    // -------------------------------------------------------------
    // DEMO INTERFACE
    // -------------------------------------------------------------
    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            sk.background(10);
            sk.noStroke();
        },
        display() {
            update();

            // Device-space clear
            sk.background(12);

            // World pass (Y-up)
            sg.render();

            // HUD (device-space)
            sk.resetMatrix();
            sk.fill(255);
            sk.textSize(14);
            sk.text("Hierarchical Lunar Lander — Up: thrust, A/D or ←/→: rotate, L: deploy, R: reset", 10, 22);
            sk.text("Beacons blink, dish spins, mast sweeps, engine gimbals, legs deploy with shocks.", 10, 42);
        }
    };
};

export default createLunarLanderDemo;
