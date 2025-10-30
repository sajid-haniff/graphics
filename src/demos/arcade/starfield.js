// Velocity-aware parallax starfield (device-space).
// API:
//   const sf = createStarfield(sk, width, height, { layers })
//   sf.update(dtSec, velWuPerFrame, worldToPixel)  // pass ship velocity (WU/frame) and converter
//   sf.draw()                                      // call in device-space BEFORE applyMatrix(...COMPOSITE)

const defaultLayers = [
    // depth, count, sizePx, alpha, trailPx
    { depth: 0.15, count:  90, size: [1, 2], alpha: 0.75, trail: [  0,  6] }, // far (tiny twinkles)
    { depth: 0.35, count: 120, size: [1, 2], alpha: 0.85, trail: [  0, 10] },
    { depth: 0.65, count: 110, size: [2, 3], alpha: 0.95, trail: [  0, 16] },
    { depth: 1.00, count:  80, size: [2, 4], alpha: 1.00, trail: [  2, 22] }, // near (longer streaks)
];

const rand = (a,b) => a + Math.random()*(b-a);
const randi = (a,b) => Math.floor(rand(a,b+1));
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

export const createStarfield = (sk, W, H, opts = {}) => {
    const L = (opts.layers && opts.layers.length) ? opts.layers : defaultLayers;
    const layers = L.map(l => ({
        ...l,
        stars: Array.from({ length: l.count }, () => ({
            x: Math.random()*W,
            y: Math.random()*H,
            s: randi(l.size[0], l.size[1]),
            tw: Math.random()*6.283 + 0.5,     // twinkle phase
            ta: rand(0.35, 1.0) * (l.alpha ?? 1)
        }))
    }));

    // Smoothed pixel velocity for nicer trails
    let vpx = { x: 0, y: 0 };

    // dt in seconds, vel is ship velocity in world units per frame,
    // worldToPixel is a function: wu -> px (use pixelToWorld inverse via 1/pixelToWorld(1))
    const update = (dt, velWU, worldToPixel) => {
        const wuToPx = (n) => {
            // pixelToWorld returns WU per px; worldToPixel ≈ px per WU
            // The caller passes a closure that converts 1 wu to ~pixels.
            return (worldToPixel ? worldToPixel(n) : n*20); // fallback guess
        };

        // Convert velocity to pixel/frame, then ease
        const targetPxX = wuToPx(velWU[0] || 0);
        const targetPxY = wuToPx(velWU[1] || 0);

        // Low-pass filter for smoothness
        vpx.x += (targetPxX - vpx.x) * clamp(1 - Math.pow(0.02, dt*60), 0, 1);
        vpx.y += (targetPxY - vpx.y) * clamp(1 - Math.pow(0.02, dt*60), 0, 1);

        // Update star positions with wrap and parallax
        for (const layer of layers) {
            const par = layer.depth;               // lower = farther = slower
            const dx = -vpx.x * par;               // move opposite to ship to simulate scrolling
            const dy =  vpx.y * par * 0.6;         // slight vertical bias feels nice

            for (const st of layer.stars) {
                st.x = (st.x + dx) % W; if (st.x < 0) st.x += W;
                st.y = (st.y + dy) % H; if (st.y < 0) st.y += H;

                // tiny twinkle
                st.tw += dt * rand(2.0, 4.5) * (0.5 + 0.5*par);
            }
        }
    };

    const draw = () => {
        // device-space points & trails
        sk.push();
        sk.noStroke();

        for (const layer of layers) {
            const [trailMin, trailMax] = layer.trail || [0,0];
            // trail length scales with current speed magnitude (in px)
            const sp = Math.hypot(vpx.x, vpx.y);
            const trailLen = clamp(trailMin + sp * 0.06, trailMin, trailMax);

            for (const st of layer.stars) {
                // twinkle alpha
                const tw = (Math.sin(st.tw) * 0.5 + 0.5);
                const a  = clamp(layer.alpha * st.ta * (0.65 + 0.35*tw), 0, 1);

                // streak direction opposite velocity
                const vx = -vpx.x * layer.depth;
                const vy =  vpx.y * layer.depth * 0.6;
                const vlen = Math.hypot(vx, vy) || 1;
                const ux = vx / vlen, uy = vy / vlen;

                const x2 = st.x + ux * trailLen;
                const y2 = st.y + uy * trailLen;

                // core dot
                sk.fill(255, 255, 255, 255 * a);
                sk.rect(st.x, st.y, st.s, st.s);

                // faint tail (two passes for a neon-ish feel)
                if (trailLen > 0.5) {
                    sk.stroke(255, 255, 255, 180 * a);
                    sk.strokeWeight(1);
                    sk.line(st.x, st.y, x2, y2);

                    sk.stroke(255, 170, 255, 110 * a);
                    sk.strokeWeight(1);
                    sk.line(st.x, st.y, x2*0.98 + st.x*0.02, y2*0.98 + st.y*0.02);
                }
            }
        }

        sk.pop();
    };

    // Optional: on resize
    const resize = (w, h) => {
        W = w; H = h;
        for (const layer of layers) {
            for (const st of layer.stars) {
                st.x = (st.x % W + W) % W;
                st.y = (st.y % H + H) % H;
            }
        }
    };

    return { update, draw, resize };
};
