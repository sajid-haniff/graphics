export const KERNELS = {
    identity: {
        name: "Identity",
        matrix: [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0]
        ],
        divisor: 1
    },
    boxBlur: {
        name: "Box Blur",
        matrix: [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1]
        ],
        divisor: 9
    },
    gaussianBlur: {
        name: "Gaussian Blur 3x3",
        matrix: [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ],
        divisor: 16
    },
    sharpen: {
        name: "Sharpen",
        matrix: [
            [ 0, -1,  0],
            [-1,  5, -1],
            [ 0, -1,  0]
        ],
        divisor: 1
    },
    edgeDetect: {
        name: "Edge Detect",
        matrix: [
            [-1, -1, -1],
            [-1,  8, -1],
            [-1, -1, -1]
        ],
        divisor: 1
    },
    emboss: {
        name: "Emboss",
        matrix: [
            [-2, -1, 0],
            [-1,  1, 1],
            [ 0,  1, 2]
        ],
        divisor: 1,
        offset: 128
    },
    sobelX: {
        name: "Sobel X",
        matrix: [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ],
        divisor: 1,
        offset: 128
    },
    sobelY: {
        name: "Sobel Y",
        matrix: [
            [-1, -2, -1],
            [ 0,  0,  0],
            [ 1,  2,  1]
        ],
        divisor: 1,
        offset: 128
    },
    laplacian: {
        name: "Laplacian",
        matrix: [
            [ 0, -1,  0],
            [-1,  4, -1],
            [ 0, -1,  0]
        ],
        divisor: 1
    }
};

export const clamp = (value, min = 0, max = 255) =>
    Math.max(min, Math.min(max, value));

export const createImageBuffer = (sk, width, height) => {
    const image = sk.createImage(width, height);
    image.loadPixels();
    return image;
};

const pixelIndex = (x, y, width) => (y * width + x) * 4;

const validateKernel = (matrix) => {
    const size = matrix.length;

    if (size === 0 || size % 2 === 0) {
        throw new Error("Convolution kernels must have an odd size.");
    }

    for (let y = 0; y < size; y += 1) {
        if (!Array.isArray(matrix[y]) || matrix[y].length !== size) {
            throw new Error("Convolution kernels must be square.");
        }
    }
};

const kernelDivisor = (matrix, divisor) => {
    if (divisor !== undefined && divisor !== null) return divisor || 1;

    let sum = 0;
    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            sum += matrix[y][x];
        }
    }

    return sum || 1;
};

// A convolution kernel samples the source pixels around one destination pixel.
// Each neighboring color is multiplied by the matching kernel weight, summed,
// normalized, then written into the output image.
export const applyKernel = (
    sourcePixels,
    targetPixels,
    width,
    height,
    x,
    y,
    matrix,
    divisor = 1,
    offset = 0
) => {
    const center = Math.floor(matrix.length / 2);
    const targetIndex = pixelIndex(x, y, width);
    let r = 0;
    let g = 0;
    let b = 0;

    for (let ky = 0; ky < matrix.length; ky += 1) {
        const sampleY = clamp(y + ky - center, 0, height - 1);
        const row = matrix[ky];

        for (let kx = 0; kx < row.length; kx += 1) {
            const sampleX = clamp(x + kx - center, 0, width - 1);
            const sourceIndex = pixelIndex(sampleX, sampleY, width);
            const weight = row[kx];

            r += sourcePixels[sourceIndex] * weight;
            g += sourcePixels[sourceIndex + 1] * weight;
            b += sourcePixels[sourceIndex + 2] * weight;
        }
    }

    const centerIndex = pixelIndex(x, y, width);

    targetPixels[targetIndex] = clamp((r / divisor) + offset);
    targetPixels[targetIndex + 1] = clamp((g / divisor) + offset);
    targetPixels[targetIndex + 2] = clamp((b / divisor) + offset);
    targetPixels[targetIndex + 3] = sourcePixels[centerIndex + 3];
};

export const applyConvolution = (sk, sourceImage, kernel, targetImage = null) => {
    const matrix = kernel.matrix || kernel;
    validateKernel(matrix);

    const divisor = kernelDivisor(matrix, kernel.divisor);
    const offset = kernel.offset || 0;
    const output = targetImage &&
        targetImage.width === sourceImage.width &&
        targetImage.height === sourceImage.height
        ? targetImage
        : createImageBuffer(sk, sourceImage.width, sourceImage.height);

    sourceImage.loadPixels();
    output.loadPixels();

    // Edge samples are clamped to the image bounds so every output pixel can use
    // the same kernel shape, including pixels on the border.
    for (let y = 0; y < sourceImage.height; y += 1) {
        for (let x = 0; x < sourceImage.width; x += 1) {
            applyKernel(
                sourceImage.pixels,
                output.pixels,
                sourceImage.width,
                sourceImage.height,
                x,
                y,
                matrix,
                divisor,
                offset
            );
        }
    }

    output.updatePixels();
    return output;
};
