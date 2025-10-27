// ============================================================================
// Neon stroke helpers — bulletproof color + pixelToWorld handling
// Exports: neonPoly, neonLine, neonDot
// ============================================================================

// Detect a p5.Color (has levels[])
const isP5Color = (c) => !!(c && typeof c === 'object' && Array.isArray(c.levels));

// Convert any input to a real p5.Color, with a safe fallback
const toColor = (sk, c, fallback = '#7df') => {
    try {
        if (isP5Color(c)) return c;
        if (c == null) return sk.color(fallback);             // undefined/null
        if (typeof c === 'string') return sk.color(c);        // '#fff', 'rgb(...)', etc.
        if (Array.isArray(c)) return sk.color(...c);          // [r,g,b,(a)]
        if (typeof c === 'number') return sk.color(c);        // grayscale
        // Any other object → try p5.color, fallback on error
        return sk.color(c);
    } catch (_) {
        return sk.color(fallback);
    }
};

// Accept either a function pixelToWorld(px) or a numeric world stroke size
const worldStroke = (pixelToWorld, strokePx, fallbackWorld = 0.06) => {
    if (typeof pixelToWorld === 'function') return pixelToWorld(strokePx);
    if (typeof pixelToWorld === 'number' && isFinite(pixelToWorld)) return pixelToWorld;
    return fallbackWorld;
};

export const neonPoly = (sk, verts, color, pixelToWorld, strokePx = 1.5, closed = true) => {
    if (!verts || verts.length === 0) return;

    const c = toColor(sk, color);

    // Outer glow
    sk.push();
    sk.noFill();
    sk.stroke(sk.red(c), sk.green(c), sk.blue(c), 90);
    sk.strokeWeight(worldStroke(pixelToWorld, strokePx * 3, 0.12));
    sk.beginShape();
    for (let i = 0; i < verts.length; i++) sk.vertex(verts[i].x, verts[i].y);
    if (closed) sk.endShape(sk.CLOSE); else sk.endShape();
    sk.pop();

    // Core pass
    sk.push();
    sk.noFill();
    sk.stroke(sk.red(c), sk.green(c), sk.blue(c), 220);
    sk.strokeWeight(worldStroke(pixelToWorld, strokePx, 0.04));
    sk.beginShape();
    for (let i = 0; i < verts.length; i++) sk.vertex(verts[i].x, verts[i].y);
    if (closed) sk.endShape(sk.CLOSE); else sk.endShape();
    sk.pop();
};

export const neonLine = (sk, a, b, color, pixelToWorld, strokePx = 1.5) => {
    const c = toColor(sk, color);

    sk.push();
    // Glow
    sk.stroke(sk.red(c), sk.green(c), sk.blue(c), 90);
    sk.strokeWeight(worldStroke(pixelToWorld, strokePx * 3, 0.12));
    sk.line(a.x, a.y, b.x, b.y);

    // Core
    sk.stroke(sk.red(c), sk.green(c), sk.blue(c), 220);
    sk.strokeWeight(worldStroke(pixelToWorld, strokePx, 0.04));
    sk.line(a.x, a.y, b.x, b.y);
    sk.pop();
};

// Render a glowing dot at point p ({x,y})
// sizePx: nominal diameter in pixels (used if pixelToWorld is a function)
// If pixelToWorld is a number, it's treated as world-size directly.
export const neonDot = (sk, p, color, pixelToWorld, sizePx = 3) => {
    const c = toColor(sk, color);

    // Convert diameter to world units
    const dWorld = worldStroke(pixelToWorld, sizePx, 0.12);
    const rGlow  = dWorld * 0.75; // glow radius
    const rCore  = dWorld * 0.33; // core radius

    sk.push();
    sk.noStroke();

    // Glow
    sk.fill(sk.red(c), sk.green(c), sk.blue(c), 90);
    sk.ellipse(p.x, p.y, rGlow * 2, rGlow * 2);

    // Core
    sk.fill(sk.red(c), sk.green(c), sk.blue(c), 220);
    sk.ellipse(p.x, p.y, rCore * 2, rCore * 2);

    sk.pop();
};
