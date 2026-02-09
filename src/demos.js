import {unionFindDemo} from "./algorithm/union-find/uf-tester";
import {createGridDemo} from "./logo-arts/illusion";
import {createFractalCircleDemo} from "./recursion/circle_recursion";
import {createRippleWaterDemo} from "./demos/wave/ripples";
import createAustraliaMapCSPDemo from "./ai/csp/australia-map";
import {createTimePilotDemo} from "./demos/timepilot/timepilot-demo";
import {createScenegraphSpaceshipSpriteDemo} from "./adv-game-design/scenegraph-spaceship-sprite-demo";


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
    'createTimePilotDemo': () => import('./demos/timepilot/timepilot-demo.js'),
    'createScenegraphDemo': () => import('./adv-game-design/scene-graph-demo.js'),
    'createScenegraphHierarchyDemo': () => import('./adv-game-design/scenegraph-hierarchy-demo'),
    'createScenegraphNestedBoxesDemo': () => import('./adv-game-design/scenegraph-nested-boxes-demo'),
    'createScenegraphAllSpritesDemo': () => import('./adv-game-design/scenegraph-all-sprites-demo'),
    'createScenegraphSteeringDemo': () => import('./adv-game-design/scenegraph-steering-demo'),
    'createScenegraphAccelFrictionDemo': () => import('./adv-game-design/scenegraph-accel-friction-demo'),
    'createScenegraphTilingMaskedAnimDemo': () => import('./adv-game-design/scenegraph-tiling-masked-anim-demo'),
    'createRotatingSquaresDemo': () => import('./adv-game-design/rotating-squares'),
    'createLunarLanderDemo': () => import('./adv-game-design/lunar-lander'),
    'createSpaceshipAtlasDemo': () => import('./adv-game-design/loadSpaceshipAtlasDemo'),
    'createScenegraphSpaceshipSpriteDemo': () => import('./adv-game-design/scenegraph-spaceship-sprite-demo'),
    'createScenegraphBehaviorsSpaceshipDemo': () => import('./adv-game-design/scenegraph-behaviors-spaceship-demo'),
    'createScenegraphInteractiveDemo': () => import('./adv-game-design/scenegraph-interactive-demo'),
    'createScenegraphKeyboardAsteroidsDemo': () => import('./adv-game-design/createKeyboardShipDemo'),
    'createScenegraphButtonAtlasDemo': () => import('./adv-game-design/scenegraph-button-atlas-demo'),
    'createScenegraphFractalUIDemo': () => import('./adv-game-design/scenegraph-fractal-ui-demo'),
    'createScenegraphPhysicsThrustDemo': () => import('./adv-game-design/scenegraph-physics-thrust-demo'),


};

export default demos;
