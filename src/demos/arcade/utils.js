export const rotatePoint = (p, center, angle) => ({
    x: (p.x - center.x) * Math.cos(angle) - (p.y - center.y) * Math.sin(angle) + center.x,
    y: (p.x - center.x) * Math.sin(angle) + (p.y - center.y) * Math.cos(angle) + center.y
});

export const skKeyMap = (sk) => ({
    left: () => sk.keyIsDown(sk.LEFT_ARROW) || sk.keyIsDown(65),
    right: () => sk.keyIsDown(sk.RIGHT_ARROW) || sk.keyIsDown(68),
    forward: () => sk.keyIsDown(sk.UP_ARROW) || sk.keyIsDown(87),
    fire: () => sk.keyIsDown(32)
});

export const randomAsteroidShape = (sk, radius) => {
    const count = Math.max(Math.floor(radius / 5), 5);
    const points = [];
    for (let i = 0; i < count; i++) {
        const angle = (sk.TWO_PI / count) * i;
        const r = radius * (1 + sk.random(-0.3, 0.3));
        points.push({
            x: -Math.sin(angle) * r,
            y: -Math.cos(angle) * r
        });
    }
    return points;
};
