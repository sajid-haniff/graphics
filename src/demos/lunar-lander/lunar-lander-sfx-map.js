// SFX registry for the lunar-lander arcade demo.
// Mirrors the shape of src/demos/arcade/sfx-map.js.
// Files live in dist/lunar-lander-audio/ — served at /lunar-lander-audio/ by webpack-dev-server.
export const LUNAR_SFX_FILES = {
    engine:    { src: 'engine.mp3',    volume: 0.30, loop: true },
    booster:   { src: 'booster.mp3',   volume: 0.40 },          // RCS / rotation-thruster pulse
    landing1:  { src: 'landing1.mp3',  volume: 0.65 },          // random pick on safe touchdown
    landing2:  { src: 'landing2.mp3',  volume: 0.65 },
    crash1:    { src: 'crash1.mp3',    volume: 0.70, max: 1 },  // random pick on crash
    crash2:    { src: 'crash2.mp3',    volume: 0.70, max: 1 },
    confetti1: { src: 'confetti1.mp3', volume: 0.50 },          // bonus stinger, high-precision landing
    confetti2: { src: 'confetti2.mp3', volume: 0.50 },
    // TODO(Decision F): baby.mp3 — trigger condition undecided; wired up once confirmed
    theme:     { src: 'theme.mp3',     volume: 0.25, loop: true },
};
