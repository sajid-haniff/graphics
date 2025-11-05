// Simple background thumper (lo/hi alternating).
// Factory style; uses your Howler SFX wrapper instance.
// Speed ramps up (interval shrinks) over time and a bit faster when action is hot.

export const createThumper = (sk, sfx) => {
    // seconds between beats (starts slow, accelerates)
    let beat = 0.60;           // start interval (s)
    const MIN  = 0.15;         // floor interval (s)
    const DEC  = 0.00022;      // natural acceleration per frame (~13/sec @60fps)
    const EXTRA_HOT = 0.00055; // added accel when action is hot

    let t = 0;                 // accumulator (s)
    let lo = true;             // alternate lo/hi
    let enabled = true;

    // callers can nudge intensity (e.g., low rock count → faster beats)
    let hotness = 0;           // 0..1

    const setHotness = (h) => { hotness = Math.max(0, Math.min(1, h || 0)); };
    const setEnabled = (v) => { enabled = !!v; };
    const reset = () => { beat = 0.60; t = 0; lo = true; };

    const update = (dt, context = {}) => {
        if (!enabled) return;

        // gentle ramp
        beat = Math.max(MIN, beat - DEC);

        // dynamic push when things are spicy
        // (e.g., pass { rocksLeft, bullets } in context)
        const extra = (hotness > 0 ? EXTRA_HOT * hotness : 0);
        beat = Math.max(MIN, beat - extra);

        t += dt;
        if (t >= beat) {
            (lo ? sfx?.play('thumplo') : sfx?.play('thumphi'));
            lo = !lo;
            t = 0;
        }
    };

    return { update, reset, setEnabled, setHotness };
};
