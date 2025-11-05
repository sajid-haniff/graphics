// Funky Alien Swarm: a handful of “orbs” that subtly steer toward the ship.
// Exports: createSwarm(sk, THEME, pixelToWorld, win, count)

import { V } from '../../lib/esm/V';
import { randRange, wrap } from './utils';
import { neonPoly } from './neon';

const makeOrbVerts = (r) => {
    const n = 10;
    const pts = [];
    for (let i=0;i<n;i++){
        const t = (i/n)*Math.PI*2;
        const rr = r*(1+randRange(-0.15,0.15));
        pts.push({ x: Math.cos(t)*rr, y: Math.sin(t)*rr });
    }
    return pts;
};

export const createSwarm = (sk, THEME, pixelToWorld, win, count = 5) => {
    const members = [];
    for (let i=0;i<count;i++){
        const r = randRange(0.4, 0.7);
        const pos = V.create(randRange(win.left, win.right), randRange(win.bottom, win.top));
        const vel = V.create(randRange(-0.06,0.06), randRange(-0.06,0.06));
        members.push({
            r,
            verts: makeOrbVerts(r),
            pos,
            vel,
        });
    }

    const radius = (m) => m.r * 1.0;
    const position = (m) => m.pos;

    const update = (getShipPos) => {
        const ship = getShipPos?.();
        for (const m of members) {
            // cohesion toward ship
            if (ship) {
                const dx = ship[0] - m.pos[0];
                const dy = ship[1] - m.pos[1];
                const len = Math.hypot(dx,dy) || 1;
                const ax = (dx/len)*0.006;
                const ay = (dy/len)*0.006;
                m.vel[0] = m.vel[0]*0.98 + ax;
                m.vel[1] = m.vel[1]*0.98 + ay;
                // speed limit
                const sp = Math.hypot(m.vel[0], m.vel[1]);
                const max = 0.14;
                if (sp>max){ m.vel[0]*=max/sp; m.vel[1]*=max/sp; }
            }

            // drift + wrap
            V.set(m.pos, wrap(m.pos[0] + m.vel[0], win.left, win.right),
                wrap(m.pos[1] + m.vel[1], win.bottom, win.top));
        }
    };

    const draw = () => {
        for (const m of members){
            sk.push();
            sk.translate(m.pos[0], m.pos[1]);
            neonPoly(sk, m.verts, THEME.bullet, pixelToWorld, 1.2, true);
            sk.pop();
        }
    };

    // flatten API for quadtree: iterate like other arrays
    const asColliders = () => members.map(m => ({
        position: m.pos,
        radius: m.r
    }));

    // for removals on hit
    const removeMember = (obj) => {
        const idx = members.indexOf(obj);
        if (idx>=0) members.splice(idx,1);
    };

    return { update, draw, asColliders, members, removeMember };
};
