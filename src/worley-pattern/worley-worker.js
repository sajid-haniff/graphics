//const waveColor = (x, a, b, e) =>
//    x < 0 ? b : Math.pow(x / a, e) + b;

export const waveColor = (distanceSq, falloffRadiusSq, baseColor, exponent) =>
    distanceSq < 0
        ? baseColor
        : Math.pow(distanceSq / falloffRadiusSq, exponent) + baseColor;

/*
for each (x, y):
  find min distance to any point in `points`
  convert distance → brightness via waveColor()
  set RGBA values in `frameWave`
*/
onmessage = (e) => {
    const {width, height, frameIndex, points, hueShift} = e.data;

    const frameWave = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let minDistSq = Infinity;

            for (let i = 0; i < points.length; i++) {
                const dx = x - points[i].x;
                const dy = y - points[i].y;
                const dSq = dx * dx + dy * dy;
                if (dSq < minDistSq) minDistSq = dSq;
            }

            const noise = Math.sqrt(minDistSq);
            const index = (x + y * width) * 4;

            frameWave[index + 0] = waveColor(noise, 10,  80,  2.5);
            frameWave[index + 1] = waveColor(noise, 25,  140, 2.2);
            frameWave[index + 2] = waveColor(noise, 15,  120, 2.8);
            frameWave[index + 3] = 255;    // A: fully opaque
        }
    }
    console.log(`Generated frame ${frameIndex + 1} / ${120}`);
    postMessage({frameIndex, frameWave}, [frameWave.buffer]);
};
