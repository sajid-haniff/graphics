// src/adv-game-design/library/scenegraph-keyboard.js
// Minimal, p5-friendly keyboard helper.
//
// - Wraps action → key mapping.
// - Uses sk.keyIsDown(keyCode) for continuous state.
// - For one-shot actions, you use p5's keyPressed and call keyboard.matches.
//
// Example:
//   const keyboard = createKeyboard(sk, {
//     rotateLeft:  [sk.LEFT_ARROW, 'a'],
//     rotateRight: [sk.RIGHT_ARROW, 'd'],
//     thrust:      [sk.UP_ARROW,   'w'],
//     fire:        ' ',
//   });
//
//   // in display():
//   if (keyboard.isDown('rotateLeft'))  ...
//
//   // in keyPressed():
//   if (keyboard.matches('fire', sk.keyCode)) spawnBullet();

const toCodes = (sk, keySpec) => {
    if (keySpec == null) return [];
    if (Array.isArray(keySpec)) {
        return keySpec.flatMap((k) => toCodes(sk, k));
    }
    if (typeof keySpec === "number") return [keySpec];
    if (typeof keySpec === "string") {
        // Single character → charCode
        if (keySpec.length === 1) {
            return [keySpec.toUpperCase().charCodeAt(0)];
        }
        // For named keys like "ArrowLeft" we don't guess;
        // user should pass sk.LEFT_ARROW etc. in bindings.
        return [];
    }
    return [];
};

export const createKeyboard = (sk, initialBindings = {}) => {
    // action -> [keyCodes]
    const bindings = {};

    const bind = (action, spec) => {
        bindings[action] = toCodes(sk, spec);
    };

    // Initialize any provided bindings
    Object.keys(initialBindings).forEach((action) => {
        bind(action, initialBindings[action]);
    });

    const codesFor = (actionOrSpec) => {
        if (typeof actionOrSpec === "string" && bindings[actionOrSpec]) {
            return bindings[actionOrSpec];
        }
        // Treat it as a direct key spec (code, char, array)
        return toCodes(sk, actionOrSpec);
    };

    // Continuous: held down
    const isDown = (actionOrSpec) => {
        const codes = codesFor(actionOrSpec);
        return codes.some((code) => sk.keyIsDown(code));
    };

    // Edge: in keyPressed(), check if this event matches an action
    const matches = (actionOrSpec, keyCode) => {
        const codes = codesFor(actionOrSpec);
        return codes.includes(keyCode);
    };

    return {
        bind,
        isDown,
        matches,
    };
};

export default createKeyboard;
