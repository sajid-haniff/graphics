import {unionFindDemo} from "./algorithm/union-find/uf-tester";
import {createGridDemo} from "./logo-arts/illusion";
import {createFractalCircleDemo} from "./recursion/circle_recursion";

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
    'createStarfieldDemo': () => import('./space/starfield2'),

    // Other demos...
};

export default demos;
