// Screen-space camera shake (device pixels), factory style.
// Use: const shake = createCameraShake(sk)
//      shake.kick(ampPx, durationSec)
//      shake.setContinuous(px)   // e.g., speed-based micro-shake
//      shake.update(dtSec)
//      const [dx,dy] = shake.offset()  // translate by this BEFORE applyMatrix(...COMPOSITE)

export const createCameraShake = (sk) => {
    let t = 0;           // seconds remaining for transient shake
    let base = 0;        // base amplitude for transient portion
    let amp = 0;         // current frame amplitude in pixels
    let seed = Math.random() * 1234.567;

    let continuous = 0;  // pixels (live input e.g. speed)

    const kick = (pixels = 8, seconds = 0.25) => {
        base = Math.max(base, pixels);
        t = Math.max(t, seconds);
    };

    const setContinuous = (px = 0) => { continuous = Math.max(0, px || 0); };

    const update = (dt) => {
        if (t > 0) {
            t = Math.max(0, t - dt);
            base *= 0.92;          // decay
            if (t === 0) base = 0; // snap to zero
        }
        amp = base + continuous;
    };

    const offset = () => {
        if (amp <= 0) return [0, 0];
        seed += 1.113; // advance
        const n1 = Math.sin(seed * 0.37) + Math.sin(seed * 1.11) * 0.5;
        const n2 = Math.cos(seed * 0.29) + Math.sin(seed * 0.97) * 0.5;
        return [n1 * amp, n2 * amp];
    };

    return { kick, setContinuous, update, offset };
};
