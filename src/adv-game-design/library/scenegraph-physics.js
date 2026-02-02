// src/adv-game-design/library/scenegraph-physics.js
// Lightweight 2D physics utilities for scenegraph nodes.
//
//  - attachBody(node, options) -> body
//  - updatePhysics(dt)
//  - removeBody(bodyOrNode), clearBodies()
//  - Helpers: applyForwardForce, applyForwardImpulse, confineBodyToAABB, aabbOverlap
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

/**
 * Attach a physics "body" to a scenegraph node.
 *
 * Options:
 *  - position:   initial position (vec2 or [x,y]); defaults to node.x/node.y
 *  - velocity:   initial velocity (vec2 or [x,y])
 *  - acceleration: initial acceleration (vec2 or [x,y])
 *  - force:      initial force accumulator (vec2)
 *  - angle:      initial angle (radians), defaults to node.rotation || 0
 *  - angularVelocity: initial angular velocity (rad/s)
 *  - torque:     initial torque accumulator
 *  - mass:       scalar; mass <= 0 => static body (invMass = 0)
 *  - fixedRotation: if true, ignores torque/angularVelocity
 *  - linearDamping: 0..1 (1 = no damping)
 *  - angularDamping: 0..1
 *  - maxSpeed:   cap on linear speed (Infinity = uncapped)
 *  - gravity:    per-body gravity vector (vec2)
 */
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

    // ------------ public-ish operations (closures) ------------

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
        // v += a * dt
        vel = V.add(vel, V.scale(acc, dt));
        // Limit speed
        vel = clampSpeed(vel, maxSpeed);
        // Apply linear damping
        vel = V.scale(vel, linearDamping);
        // p += v * dt
        pos = V.add(pos, V.scale(vel, dt));

        // Angular integration (if allowed)
        if (!fixedRotation) {
            const angularAcc = torqueAccum * invMass;
            angVel += angularAcc * dt;
            angVel *= angularDamping;
            bodyAngle += angVel * dt;
        }

        // Sync back to node
        if (node) {
            node.x = pos[0];
            node.y = pos[1];
            node.rotation = bodyAngle;
        }

        // Clear force/torque for next frame
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

        // scalar props
        mass,
        invMass,
        fixedRotation,
        maxSpeed,
        linearDamping,
        angularDamping,

        // live accessors
        get position() { return V.clone(pos); },
        set position(p) { setPosition(p); },

        get velocity() { return V.clone(vel); },
        set velocity(v) { setVelocity(v); },

        get angle() { return bodyAngle; },
        set angle(a) { setAngle(a); },

        get angularVelocity() { return angVel; },
        set angularVelocity(w) { angVel = w; },

        // methods
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

/**
 * Step all registered bodies forward in time by dt (seconds).
 * Call once per frame from your demo, before sg.render().
 */
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

/**
 * Apply a force in the node's forward direction (based on its rotation).
 * magnitude: scalar.
 */
export const applyForwardForce = (body, magnitude = 1) => {
    if (!body) return;
    const dir = forwardDirFromAngle(body.angle);
    body.applyForce(V.scale(dir, magnitude));
};

/**
 * Apply an impulse (instant velocity change) in the node's forward direction.
 */
export const applyForwardImpulse = (body, magnitude = 1) => {
    if (!body) return;
    const dir = forwardDirFromAngle(body.angle);
    body.applyImpulse(V.scale(dir, magnitude));
};

/**
 * Set the body's velocity to point forward with a given speed.
 */
export const setForwardSpeed = (body, speed = 0) => {
    if (!body) return;
    const dir = forwardDirFromAngle(body.angle);
    body.velocity = V.scale(dir, speed);
};

// ------------------------------------------------------------
// Bounds + simple collision helpers
// ------------------------------------------------------------

/**
 * Confine a body to an axis-aligned box.
 * bounds: { left, right, bottom, top }
 * bounce: coefficient of restitution (0 = stick, 1 = perfectly elastic)
 */
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

/**
 * Simple AABB overlap test between two scenegraph nodes.
 * Uses node.x/node.y as center, node.width/height, pivot assumed at 0.5/0.5.
 */
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
