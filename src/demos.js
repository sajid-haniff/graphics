import {unionFindDemo} from "./algorithm/union-find/uf-tester";

const demos = {
    'createTriangleCirclesDemo': () => import('./geometric/triangle-circles'),
    'createInCirclesDemo': () => import('./geometric/incircle-excircle'),
    'createPolygonDemo': () => import('./geometric/polygon-demo'),
    'unionFindDemo': () => import('./algorithm/union-find/uf-tester')
};

export default demos;
