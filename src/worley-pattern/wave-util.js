export const waveColor = (x, a, b, e) =>
    x < 0 ? b : Math.pow(x / a, e) + b;
