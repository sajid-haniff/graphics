// src/adv-game-design/library/scenegraph-physics.js
// Lightweight 2D physics utilities for scenegraph nodes.
//
//  - attachBody(node, options) -> body
//  - updatePhysics(dt)
//  - removeBody(bodyOrNode), clearBodies()
//  - Helpers: applyForwardForce, applyForwardImpulse, setForwardSpeed,
//             applyQuadraticDrag, confineBodyToAABB, aabbOverlap
//
// This does NOT modify scenegraph.js. It operates on nodes created by
// createScenegraph (or any object with x, y, rotation, width, height).

import { V } from "../../lib/esm/V";

const bodies = [];

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------

const toVec = (v, fallbackX = 0, fallbackY = 0) => {
    if (!v) return V.create(fallbackX, fallbackY);
    if (Array.isArray(v)) return V.create(v[0], v[1]);
    return V.create(v[0], v[1]);
};

const clampSpeed = (vel, maxSpeed) => {
    if (!vel) return V.zero();
    if (maxSpeed === Infinity || maxSpeed <= 0) return vel;
    const lenSq = V.lengthSq(vel);
    const maxSq = maxSpeed * maxSpeed;
    if (lenSq > maxSq && lenSq > 0) {
        const scale = maxSpeed / Math.sqrt(lenSq);
        return V.scale(vel, scale);
    }
    return vel;
};

// Forward direction helper for Y-up world:
// 0 rad = pointing up; dir = [sin(a), cos(a)].
const forwardDirFromAngle = (angleRad) => {
    const s = Math.sin(angleRad);
    const c = Math.cos(angleRad);
    return V.create(s, c);
};

// ------------------------------------------------------------
// Body creation / core API
// ------------------------------------------------------------

export const attachBody = (node, {
    position         = null,
    velocity         = null,
    acceleration     = null,
    force            = null,
    angle            = (node && node.rotation) || 0,
    angularVelocity  = 0,
    torque           = 0,
    mass             = 1,
    fixedRotation    = false,
    linearDamping    = 0.98,
    angularDamping   = 0.98,
    maxSpeed         = Infinity,
    gravity          = null
} = {}) => {
    const invMass = mass > 0 ? 1 / mass : 0;

    let pos   = toVec(position, node ? node.x || 0 : 0, node ? node.y || 0 : 0);
    let vel   = toVec(velocity, 0, 0);
    let acc   = toVec(acceleration, 0, 0);
    let forceAccum  = toVec(force, 0, 0);
    let bodyAngle   = angle;
    let angVel      = angularVelocity;
    let torqueAccum = torque;
    const gravityVec = gravity ? toVec(gravity, 0, 0) : V.zero();

    const applyForce = (f) => {
        if (!f) return;
        forceAccum = V.add(forceAccum, toVec(f, 0, 0));
    };

    const applyImpulse = (impulse) => {
        if (invMass === 0) return;
        const j = toVec(impulse, 0, 0);
        vel = V.add(vel, V.scale(j, invMass));
    };

    const applyTorque = (t) => {
        if (invMass === 0 || fixedRotation) return;
        torqueAccum += t;
    };

    const applyAngularImpulse = (j) => {
        if (invMass === 0 || fixedRotation) return;
        angVel += j * invMass;
    };

    const setVelocity = (v) => {
        vel = toVec(v, 0, 0);
    };

    const addVelocity = (dv) => {
        vel = V.add(vel, toVec(dv, 0, 0));
    };

    const setPosition = (p) => {
        pos = toVec(p, 0, 0);
        if (node) {
            node.x = pos[0];
            node.y = pos[1];
        }
    };

    const setAngle = (a) => {
        bodyAngle = a;
        if (node) node.rotation = bodyAngle;
    };

    const step = (dt) => {
        if (dt <= 0) return;

        if (invMass === 0) {
            // Static body: sync position/angle from node, clear forces.
            if (node) {
                pos[0] = node.x || 0;
                pos[1] = node.y || 0;
                bodyAngle = node.rotation || 0;
            }
            forceAccum  = V.zero();
            torqueAccum = 0;
            return;
        }

        // Total force = accumulated forces + gravity
        const totalForce = V.add(forceAccum, gravityVec);

        // a = F/m
        acc = V.scale(totalForce, invMass);

        // Semi-implicit Euler:
        vel = V.add(vel, V.scale(acc, dt));
        vel = clampSpeed(vel, maxSpeed);
        vel = V.scale(vel, linearDamping);
        pos = V.add(pos, V.scale(vel, dt));

        if (!fixedRotation) {
            const angularAcc = torqueAccum * invMass;
            angVel += angularAcc * dt;
            angVel *= angularDamping;
            bodyAngle += angVel * dt;
        }

        if (node) {
            node.x = pos[0];
            node.y = pos[1];
            node.rotation = bodyAngle;
        }

        forceAccum  = V.zero();
        torqueAccum = 0;
    };

    const getState = () => ({
        position: V.clone(pos),
        velocity: V.clone(vel),
        acceleration: V.clone(acc),
        force: V.clone(forceAccum),
        angle: bodyAngle,
        angularVelocity: angVel,
        mass,
        invMass,
        fixedRotation,
        maxSpeed,
        linearDamping,
        angularDamping,
        gravity: V.clone(gravityVec)
    });

    const body = {
        node,

        mass,
        invMass,
        fixedRotation,
        maxSpeed,
        linearDamping,
        angularDamping,

        get position() { return V.clone(pos); },
        set position(p) { setPosition(p); },

        get velocity() { return V.clone(vel); },
        set velocity(v) { setVelocity(v); },

        get angle() { return bodyAngle; },
        set angle(a) { setAngle(a); },

        get angularVelocity() { return angVel; },
        set angularVelocity(w) { angVel = w; },

        applyForce,
        applyImpulse,
        applyTorque,
        applyAngularImpulse,
        setVelocity,
        addVelocity,
        setPosition,
        setAngle,
        step,
        getState
    };

    bodies.push(body);
    return body;
};

// ------------------------------------------------------------
// Main update loop
// ------------------------------------------------------------

export const updatePhysics = (dt) => {
    for (let i = 0; i < bodies.length; i += 1) {
        bodies[i].step(dt);
    }
};

export const removeBody = (bodyOrNode) => {
    const i = bodies.findIndex(
        (b) => b === bodyOrNode || b.node === bodyOrNode
    );
    if (i >= 0) bodies.splice(i, 1);
};

export const clearBodies = () => {
    bodies.length = 0;
};

export const getBodies = () => bodies.slice();

// ------------------------------------------------------------
// Directional helpers (Y-up forward thrust)
// ------------------------------------------------------------

export const applyForwardForce = (body, magnitude = 1) => {
    if (!body) return;
    const dir = forwardDirFromAngle(body.angle);
    body.applyForce(V.scale(dir, magnitude));
};

export const applyForwardImpulse = (body, magnitude = 1) => {
    if (!body) return;
    const dir = forwardDirFromAngle(body.angle);
    body.applyImpulse(V.scale(dir, magnitude));
};

export const setForwardSpeed = (body, speed = 0) => {
    if (!body) return;
    const dir = forwardDirFromAngle(body.angle);
    body.velocity = V.scale(dir, speed);
};

// ------------------------------------------------------------
// Drag / resistance helpers
// ------------------------------------------------------------

/**
 * Apply quadratic drag (air resistance) to the body:
 *   F_drag = -k * |v|^2 * v_hat
 * k is a scalar drag coefficient; larger k = stronger drag.
 */
export const applyQuadraticDrag = (body, k = 0.5) => {
    if (!body || typeof body.applyForce !== "function") return;
    const v = body.velocity;
    const speed = V.length(v);
    if (speed < 1e-6) return;

    const mag = k * speed * speed;
    const dragDir = V.scale(v, -1 / speed); // -v_hat
    const F = V.scale(dragDir, mag);
    body.applyForce(F);
};

// ------------------------------------------------------------
// Bounds + simple collision helpers
// ------------------------------------------------------------

export const confineBodyToAABB = (body, bounds, bounce = 0) => {
    if (!body || !body.node || !bounds) return;

    const n = body.node;
    const pos = body.position;
    const vel = body.velocity;

    let px = pos[0];
    let py = pos[1];
    let vx = vel[0];
    let vy = vel[1];

    const halfW = (n.width || 0) * (n.scaleX || 1) * 0.5;
    const halfH = (n.height || 0) * (n.scaleY || 1) * 0.5;

    if (px - halfW < bounds.left) {
        px = bounds.left + halfW;
        vx = -vx * bounce;
    } else if (px + halfW > bounds.right) {
        px = bounds.right - halfW;
        vx = -vx * bounce;
    }

    if (py - halfH < bounds.bottom) {
        py = bounds.bottom + halfH;
        vy = -vy * bounce;
    } else if (py + halfH > bounds.top) {
        py = bounds.top - halfH;
        vy = -vy * bounce;
    }

    body.position = V.create(px, py);
    body.velocity = V.create(vx, vy);
};

export const aabbOverlap = (nodeA, nodeB, padding = 0) => {
    if (!nodeA || !nodeB) return false;

    const ax = nodeA.x || 0;
    const ay = nodeA.y || 0;
    const aw = (nodeA.width || 0) * (nodeA.scaleX || 1);
    const ah = (nodeA.height || 0) * (nodeA.scaleY || 1);

    const bx = nodeB.x || 0;
    const by = nodeB.y || 0;
    const bw = (nodeB.width || 0) * (nodeB.scaleX || 1);
    const bh = (nodeB.height || 0) * (nodeB.scaleY || 1);

    const aLeft   = ax - aw * 0.5 - padding;
    const aRight  = ax + aw * 0.5 + padding;
    const aBottom = ay - ah * 0.5 - padding;
    const aTop    = ay + ah * 0.5 + padding;

    const bLeft   = bx - bw * 0.5 - padding;
    const bRight  = bx + bw * 0.5 + padding;
    const bBottom = by - bh * 0.5 - padding;
    const bTop    = by + bh * 0.5 + padding;

    return !(
        aRight < bLeft  ||
        aLeft  > bRight ||
        aTop   < bBottom||
        aBottom> bTop
    );
};
