import {unionFindDemo} from "./algorithm/union-find/uf-tester";
import {createGridDemo} from "./logo-arts/illusion";
import {createFractalCircleDemo} from "./recursion/circle_recursion";
import {createRippleWaterDemo} from "./demos/wave/ripples";
import createAustraliaMapCSPDemo from "./ai/csp/australia-map";

const demos = {
    'createTriangleCirclesDemo': () => import('./geometric/triangle-circles'),
    'createInCirclesDemo': () => import('./geometric/incircle-excircle'),
    'createPolygonDemo': () => import('./geometric/polygon-demo'),
    'unionFindDemo': () => import('./algorithm/union-find/uf-tester'),
    'createSineWaveDemo': () => import('./noc/oscillations/sineWave'),
    'createLogoDemo': () => import('./logo-arts/elastic'),
    'createHexagonLogoDemo': () => import('./logo-arts/hexagon-logo-demo'),
    'createCurvedGridDemo': () => import('./logo-arts/curved-grid'),
    'createGridDemo': () => import('./logo-arts/illusion'),
    'createFractalCircleDemo': () => import('./recursion/circle_recursion'),
    'fractalTreeDemo': () => import('./recursion/fractal-tree-demo'),
    'createSeekDemo': () => import('./path/createSeekDemo'),
    'simulateSpringSystem': () => import('./physics/kinematics/spring-simulation.js'),
    'createMinEditDemo': () => import('./algorithm/dynamic/min-edit-demo.js'),
    'createLoadImagesDemo': () => import('./adv-game-design/loadImagesDemo'),
    'createWorleyDemo': () => import('./worley-pattern/worley-demo'),
    'createStarfieldDemo': () => import('./space/starfield3'),
    'createMatrixRainDemo': () => import('./noc/visuals/matrix-rain'),
    'createFlowFieldDemo': () => import('./noc/fields/flow-field'),
    'knightsTourDemo': () => import('./recursion/knights/knight-tour-demo'),
    'createRippleWaterDemo': () => import('./demos/wave/ripples'),
    'createAsteroidsDemo': () => import('./demos/arcade/asteroids-demo'),
    'createAustraliaMapCSPDemo': () => import('./ai/csp/australia-map.js'),
    'createEightQueensCSPDemo': () => import('./ai/csp/queens8-demo.js'),
    'createSudokuCSPDemo': () => import('./ai/csp/sudoku-demo.js'),
    'createCrosswordCSPDemo': () => import('./ai/csp/crossword-demo.js'),
    'createRiverCrossingCSPDemo': () => import('./ai/csp/river-crossing-demo.js'),
    'createSearchMazeDemo': () => import('./ai/search/maze-demo.js'),
};

export default demos;
