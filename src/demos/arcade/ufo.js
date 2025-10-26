// UFO (saucer) — moves across screen, gently bobs, fires at intervals.
// variant: 'large' | 'small' (small moves faster, scores more, fires toward ship)
import { V } from '../../lib/esm/V';
import { neonPoly } from './neon';
import { createBullet } from './bullet';

export const createUFO = (sk, THEME, pixelToWorld, win, bullets, sfx, {
  variant = 'large',
  startX = win.left - 1.5,           // spawn off-screen left by default
  startY = 0,
  dir    = +1,                        // +1 → left→right, -1 → right→left
} = {}) => {
  const pos = V.create(startX, startY);
  const vel = V.create(dir * (variant === 'small' ? 0.10 : 0.07), 0.0);
  const wobbleAmp = 0.40;            // world units
  const wobbleSpd = 0.07;            // radians/frame
  let t = 0;                         // wobble phase
  let alive = true;

  const score = variant === 'small' ? 1000 : 200;
  const bulletSpeed = variant === 'small' ? 0.60 : 0.50;
  const fireInterval = variant === 'small' ? 70 : 110; // frames
  let fireTimer = 0;

  // simple 80s saucer outline (Y-up canonical)
  const P = [
    { x: -1.8, y:  0.0 },
    { x: -1.0, y:  0.9 },
    { x:  1.0, y:  0.9 },
    { x:  1.8, y:  0.0 },
    { x:  1.0, y: -0.3 },
    { x: -1.0, y: -0.3 },
  ];

  // start saucer loop
  const loopInst = sfx?.loop(variant === 'small' ? 'ssaucer' : 'lsaucer', { volume: 0.28 });

  const wrap = (v, min, max) => (v > max ? min : (v < min ? max : v));

  const fireAt = (targetPos) => {
    // small targets the ship, large fires roughly forward
    let dirVec;
    if (variant === 'small' && targetPos) {
      const d = V.sub(targetPos, pos);
      dirVec = V.normalize(d);
    } else {
      dirVec = V.normalize(V.create(dir, (Math.random() - 0.5) * 0.5));
    }
    bullets.push(createBullet(sk, V.clone(pos), dirVec, THEME, pixelToWorld, win, bulletSpeed, 90));
    sfx?.play('sfire');
  };

  const update = (getShipPos) => {
    if (!alive) return;

    // bobbing vertical motion
    t += wobbleSpd;
    const wobbleY = Math.sin(t) * wobbleAmp;

    // move horizontally + bob
    V.set(pos, pos[0] + vel[0], pos[1] + vel[1]);
    pos[1] += wobbleY * 0.02; // gentle drift

    // world wrap
    pos[0] = wrap(pos[0], win.left - 2, win.right + 2);
    pos[1] = wrap(pos[1], win.bottom + 1.5, win.top - 1.5);

    // fire
    fireTimer++;
    if (fireTimer >= fireInterval) {
      const target = getShipPos ? getShipPos() : null;
      fireAt(target);
      fireTimer = 0;
    }
  };

  const draw = () => {
    if (!alive) return;
    // tiny sparkle
    sk.push();
    sk.translate(pos[0], pos[1]);
    neonPoly(sk, P, THEME.ufo, pixelToWorld, 1.6, true);
    sk.pop();
  };

  const destroy = () => {
    if (!alive) return;
    alive = false;
    loopInst?.stop();
    sfx?.playRandom(['explode1','explode2','explode3'], { volume: 0.8 });
  };

  const isAlive = () => alive;
  const position = () => pos;
  const radius = () => 1.6; // approx for collisions

  return { update, draw, destroy, isAlive, position, radius, score };
};
