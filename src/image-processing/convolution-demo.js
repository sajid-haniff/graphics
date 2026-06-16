import { KERNELS, applyConvolution } from "./convolution";

/**
 * Filter order is part of the demo controls: number keys 1-9 map directly to
 * this array. Keep this list in sync with the instruction text rendered below.
 */
const FILTERS = [
    KERNELS.identity,
    KERNELS.boxBlur,
    KERNELS.gaussianBlur,
    KERNELS.sharpen,
    KERNELS.edgeDetect,
    KERNELS.emboss,
    KERNELS.sobelX,
    KERNELS.sobelY,
    KERNELS.laplacian
];

const IMAGE_SOURCE = "images/tiger.png";

/**
 * Compute an image rectangle that fits inside a fixed panel while preserving
 * the source aspect ratio. The original and filtered views use the same fitted
 * size so visual differences come from the filter, not stretching.
 */
const fitRect = (sourceWidth, sourceHeight, maxWidth, maxHeight) => {
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return { width, height };
};

/**
 * Draw the active kernel as a small matrix.
 *
 * This is intentionally a simple device-space overlay, matching the rest of the
 * demo UI rather than introducing scenegraph or world-transform machinery.
 */
const drawKernel = (sk, kernel, x, y) => {
    const matrix = kernel.matrix;
    const cellW = 44;
    const cellH = 26;

    sk.textSize(13);
    sk.textAlign(sk.CENTER, sk.CENTER);

    for (let row = 0; row < matrix.length; row += 1) {
        for (let col = 0; col < matrix[row].length; col += 1) {
            const px = x + col * cellW;
            const py = y + row * cellH;

            sk.fill(38);
            sk.stroke(86);
            sk.rect(px, py, cellW, cellH);

            sk.noStroke();
            sk.fill(235);
            sk.text(matrix[row][col], px + cellW / 2, py + cellH / 2);
        }
    }
};

/**
 * Create a p5 demo that shows an original image beside a manually convolved
 * output image.
 *
 * The demo uses only device-space rendering: image pixels and UI labels are
 * easier to compare when p5's default top-left coordinate system is left intact.
 * `src/index.js` can be switched to this factory for manual testing, but the
 * permanent integration point is the dynamic registry in `src/demos.js`.
 */
export const createConvolutionDemo = (sk, CANVAS_WIDTH = 960, CANVAS_HEIGHT = 540) => {
    let sourceImage = null;
    let filteredImage = null;
    let selectedIndex = 0;
    let loading = true;
    let loadError = "";

    const selectedKernel = () => FILTERS[selectedIndex];

    /**
     * Recompute only when the source image arrives or the selected filter
     * changes. Convolution touches every pixel, so doing this work every frame
     * would obscure the implementation with unnecessary performance cost.
     */
    const recompute = () => {
        if (!sourceImage) return;
        filteredImage = applyConvolution(sk, sourceImage, selectedKernel(), filteredImage);
    };

    const selectFilter = (index) => {
        if (index < 0 || index >= FILTERS.length || index === selectedIndex) return;
        selectedIndex = index;
        recompute();
    };

    const drawStatus = (message) => {
        sk.background(24);
        sk.resetMatrix();
        sk.fill(245);
        sk.noStroke();
        sk.textAlign(sk.CENTER, sk.CENTER);
        sk.textSize(18);
        sk.text(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    };

    const drawLabels = (leftX, rightX, imageY, imageW, imageH) => {
        sk.noStroke();
        sk.fill(245);
        sk.textAlign(sk.LEFT, sk.BOTTOM);
        sk.textSize(16);
        sk.text("Original", leftX, imageY - 10);
        sk.text(selectedKernel().name, rightX, imageY - 10);

        sk.noFill();
        sk.stroke(70);
        sk.rect(leftX, imageY, imageW, imageH);
        sk.rect(rightX, imageY, imageW, imageH);
    };

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            // Keep canvas pixels and CSS pixels aligned so visual comparisons and
            // text placement are stable on high-DPI displays.
            sk.pixelDensity?.(1);

            sk.loadImage(
                IMAGE_SOURCE,
                (image) => {
                    sourceImage = image;
                    loading = false;
                    recompute();
                },
                () => {
                    loading = false;
                    loadError = `Failed to load ${IMAGE_SOURCE}`;
                }
            );
        },

        display() {
            if (loading) {
                drawStatus("Loading image...");
                return;
            }

            if (loadError) {
                drawStatus(loadError);
                return;
            }

            sk.background(18);
            // No world transform is used in this demo; reset defensively before
            // drawing the image pair and explanatory UI.
            sk.resetMatrix();

            const margin = 32;
            const gap = 28;
            const panelW = (CANVAS_WIDTH - margin * 2 - gap) / 2;
            const imageBoxH = 320;
            const imageY = 72;
            const fitted = fitRect(sourceImage.width, sourceImage.height, panelW, imageBoxH);
            const leftX = margin + (panelW - fitted.width) / 2;
            const rightPanelX = margin + panelW + gap;
            const rightX = rightPanelX + (panelW - fitted.width) / 2;

            drawLabels(leftX, rightX, imageY, fitted.width, fitted.height);

            sk.noStroke();
            sk.image(sourceImage, leftX, imageY, fitted.width, fitted.height);
            if (filteredImage) {
                sk.image(filteredImage, rightX, imageY, fitted.width, fitted.height);
            }

            sk.fill(245);
            sk.noStroke();
            sk.textAlign(sk.LEFT, sk.TOP);
            sk.textSize(20);
            sk.text("Image Convolution", margin, 24);

            sk.textSize(14);
            sk.fill(210);
            sk.text("1 identity   2 box blur   3 gaussian   4 sharpen   5 edge   6 emboss   7 sobel X   8 sobel Y   9 laplacian", margin, CANVAS_HEIGHT - 34);

            sk.fill(245);
            sk.textSize(15);
            sk.text(`Active filter: ${selectedIndex + 1}. ${selectedKernel().name}`, margin, 420);

            sk.fill(210);
            sk.textSize(13);
            sk.text("Kernel", margin, 450);
            drawKernel(sk, selectedKernel(), margin, 474);
        },

        keyPressed(key) {
            const number = Number(key);
            if (number >= 1 && number <= FILTERS.length) {
                selectFilter(number - 1);
            }
        }
    };
};

export default createConvolutionDemo;
