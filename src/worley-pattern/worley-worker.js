const waveColor = (x, a, b, e) =>
    x < 0 ? b : Math.pow(x / a, e) + b;

onmessage = (e) => {
    const { width, height, frameIndex, points } = e.data;

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
            frameWave[index + 0] = waveColor(noise, 40, 32, 2.2);
            frameWave[index + 1] = waveColor(noise, 30, 55, 3.34);
            frameWave[index + 2] = waveColor(noise, 30, 68, 3.55);
            frameWave[index + 3] = 255;
        }
    }

    postMessage({ frameIndex, frameWave }, [frameWave.buffer]);
};
