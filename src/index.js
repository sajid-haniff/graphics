import * as p5 from './lib/p5';
import demos from './demos';
import {unionFindDemo} from "./algorithm/union-find/uf-tester";

/*
const demos = {
    'createTriangleCirclesDemo': () => import('./geometric/triangle-circles'),
    'createInCirclesDemo': () => import('./geometric/incircle-excircle'),
    'createPolygonDemo': () => import('./geometric/polygon-demo')
    // Add more demos here as needed
};*/

const demoName = 'fractalTreeDemo';

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

            sk.setup = sketch.setup;
            sk.draw = sketch.display;
        });
    } catch (error) {
        console.error(`Error loading demo ${demoName}:`, error);
    }
};

runDemo(demoName);
