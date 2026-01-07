import * as p5 from './lib/p5';
import demos from './demos';
import {unionFindDemo} from "./algorithm/union-find/uf-tester";
import createSudokuCSPDemo from "./ai/csp/sudoku-demo";

/*
const demos = {
    'createTriangleCirclesDemo': () => import('./geometric/triangle-circles'),
    'createInCirclesDemo': () => import('./geometric/incircle-excircle'),
    'createPolygonDemo': () => import('./geometric/polygon-demo')
    // Add more demos here as needed
};*/

//const demoName = 'simulateSpringSystem';
//const demoName = 'createMinEditDemo';
//const demoName = 'createSeekDemo';
//const demoName = 'createLoadImagesDemo';
//const demoName = 'createWorleyDemo';
//const demoName = 'createStarfieldDemo';
//const demoName = 'createMatrixRainDemo';
//const demoName = 'createFlowFieldDemo';
//const demoName = 'knightsTourDemo';
//const demoName = 'createRippleWaterDemo';
//const demoName = 'createStarfieldDemo'
//const demoName = 'createLoadImagesDemo'
//const demoName = 'createAsteroidsDemo';
//const demoName = 'createAsteroidsTest';
//const demoName = 'createAustraliaMapCSPDemo';
//const demoName = 'createEightQueensCSPDemo';
//const demoName = 'createSearchMazeDemo';
//const demoName = 'createTimePilotDemo';
//const demoName = 'createLunarLanderDemo';

const demoName = 'createScenegraphSpaceshipSpriteDemo'


const runDemo = async (demoName) => {
    try {
        // Dynamically import the module corresponding to the demoName
        // and extract the exported function using a computed property name.
        //
        // - `await demos[demoName]();` dynamically imports the module.
        //   For example, if demoName is 'createTriangleCirclesDemo', this will import from './geometric/triangle-circles'.
        //
        // - `const { [demoName]: demoFunction } = module;` uses object destructuring with a computed property name to extract
        //   the function named `demoName` from the imported module.
        //   For instance, if demoName is 'createTriangleCirclesDemo', it is equivalent to:
        //   const demoFunction = module.createTriangleCirclesDemo;
        //
        // This syntax allows us to dynamically determine which property to extract based on the value of demoName.
        const { [demoName]: demoFunction } = await demos[demoName]();

        //const module = await demos[demoName]();
        //const demoFunction = module[demoName];

        if (typeof demoFunction !== 'function') {
            throw new Error(`Demo ${demoName} is not a valid function`);
        }

        new p5((sk) => {
            const sketch = demoFunction(sk);

            //sk.setup = sketch.setup;
            //sk.draw = sketch.display;
            //sk.mousePressed = sketch.mousePressed;
            //sk.keyPressed = sketch.keyPressed;

            // Always assign functions; call through only if provided
            sk.setup        = () => sketch.setup?.();
            sk.draw         = () => sketch.display?.();
            sk.mousePressed = (...a) => sketch.mousePressed?.(...a);

            // Forward both key events to one handler if present
            const onKey = () => { sketch.keyPressed?.(sk.key); return false; };
            sk.keyPressed = onKey;
            sk.keyTyped   = onKey;
        });
    } catch (error) {
        console.error(`Error loading demo ${demoName}:`, error);
    }
};

runDemo(demoName);
