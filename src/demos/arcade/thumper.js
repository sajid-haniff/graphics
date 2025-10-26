// Thumper — alternating low/high beat whose tempo tightens with intensity (0..1).
// Call update() every frame; it self-plays via SFX.
export const createThumper = (sfx, {
    minBeat = 0.18,  // seconds (fastest)
    maxBeat = 0.55,  // seconds (slowest)
    startIntensity = 0.25
} = {}) => {
    let intensity = startIntensity;   // 0..1
    let timer = 0;
    let lo = true;

    const setIntensity = (v) => { intensity = Math.max(0, Math.min(1, v)); };
    const currentBeat = () => maxBeat + (minBeat - maxBeat) * intensity;

    const update = (dtSec) => {
        timer += dtSec;
        if (timer >= currentBeat()) {
            if (lo) sfx?.play('thumplo'); else sfx?.play('thumphi');
            lo = !lo;
            timer = 0;
        }
    };

    return { update, setIntensity };
};
