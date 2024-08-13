import * as vec3 from "./lib/esm/vec3";
import {ortho} from "./lib/esm/mat4";

export const createGraphicsContext2 = (window, viewport, WIDHT = 400, HEIGHT = 400, sk) => {

    /** global current position **/
    let CP = vec3.fromValues(0.0, 0.0, 1.0);

    /** global current direction **/
    let CD = 0.0;

    const turn = (angle) => {
        CD += angle
    };

    const turnTo = (angle) => {
        CD = angle
    };

    const forward = (dist, isVisible = true) => {

        const RadPerDegree = 0.017453393;
        let x = CP[0] + dist * Math.cos(RadPerDegree * CD);
        let y = CP[1] + dist * Math.sin(RadPerDegree * CD);

        if (isVisible)
            lineTo(x, y);
        else
            moveTo(x, y);
    }

    const moveTo = (x, y) => {
        CP = vec3.fromValues(x, y, 1.0);
    }

    const lineTo = (x, y) => {

        /* accept is true if line was clipped */
        const {accept, ...rest} = clip(CP[0], CP[1], x, y);
        const [xP, yP, xQ, yQ] = Object.values(rest);

        if (accept) {
            sk.line(xP, yP, xQ, yQ);
            CP = vec3.fromValues(x, y, 1.0);
        }
    }

    const moveRel = (dx, dy) => {
        CP = vec3.fromValues(CP[0] + dx, CP[1] + dy, 1);
    }

    //XXX - Add clipping - possibly also use moveTo, lineTo
    const lineRel = (dx, dy) => {

        let end = vec3.fromValues(CP[0] + dx, CP[1] + dy, 1);
        sk.line(CP[0], CP[1], end[0], end[1]);

        CP = end;
    }

    const mouseToWindowCoordinates = (sk) => {

        const currentTransformationMatrix = sk.drawingContext.getTransform();
        const deviceToWindow = currentTransformationMatrix.invertSelf();
        const point = new DOMPoint(sk.mouseX, sk.mouseY);
        return point.matrixTransform(deviceToWindow);
    }

    /* Viewport Transformation */

    const {left: win_left, right: win_right, top: win_top, bottom: win_bottom} = window;
    const {left: view_left, right: view_right, top: view_top, bottom: view_bottom} = viewport;

    let tmp1 = (win_right - win_left);
    let tmp2 = (win_top - win_bottom);

    let sx = (view_right - view_left) / tmp1;
    let sy = (view_top - view_bottom) / tmp2;

    let tx = (view_left * win_right - view_right * win_left) / tmp1;
    let ty = (view_bottom * win_top - view_top * win_bottom) / tmp2;

    /* ===================================================  */

    /* ================================ */
    /* Cohen Sutherland Line Clipper    */
    /* =================================*/
    /*                                  */
    /*    1001    |  0001    |  0101    */
    /*    --------+----------+--------- */
    /*    1000    |  0000    |  0100    */
    /*   ---------+----------+--------- */
    /*    1010    |  0010    |  0110    */
    /* ================================ */

    const {left: x_min, right: x_max, top: y_max, bottom: y_min} = window;

    const code = (x, y) => {
        return ((x < x_min) << 3) | ((x > x_max) << 2) | ((y < y_min) << 1) | (y > y_max);
    }


    const clip = (xP, yP, xQ, yQ) => {

        let cP = code(xP, yP);
        let cQ = code(xQ, yQ);

        while (cP | cQ) {
            if (cP & cQ) return {accept: false}

            let dx = xQ - xP;
            let dy = yQ - yP;

            if (cP) {
                if (cP & 8) yP += (x_min - xP) * dy / dx, xP = x_min; else if (cP & 4) yP += (x_max - xP) * dy / dx, xP = x_max; else if (cP & 2) xP += (y_min - yP) * dx / dy, yP = y_min; else if (cP & 1) xP += (y_max - yP) * dx / dy, yP = y_max;
                cP = code(xP, yP);
            } else {
                if (cQ & 8) yQ += (x_min - xQ) * dy / dx, xQ = x_min; else if (cQ & 4) yQ += (x_max - xQ) * dy / dx, xQ = x_max; else if (cQ & 2) xQ += (y_min - yQ) * dx / dy, yQ = y_min; else if (cQ & 1) xQ += (y_max - yQ) * dx / dy, yQ = y_max;
                cQ = code(xQ, yQ);
            }
        }

        drawEllipse(xP, yP);
        drawEllipse(xQ, yQ);

        return {
            xP,
            yP,
            xQ,
            yQ,
            accept: true
        }
    }

    const drawEllipse = (x, y) => {
        if (x === x_min || x === x_max || y === y_min || y === y_max) {
            sk.push();
            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(227);
            sk.ellipse(x, y, 8, 8);
            sk.pop();
        }
    };

    const polySpiral = (dist, angle, incr, n) => {

        for (let i = 0; i < n; i++) {

            forward(dist);
            turn(angle);
            dist += incr;
        }
    }

    const drawArc = (cX, cY, radius, startAngle, sweep) => {
        const n = 30;
        let angle = startAngle * sk.PI / 180;
        let angleInc = sweep * sk.PI / (180 * n);
        moveTo(cX + radius * Math.cos(angle), cY + radius * Math.sin(angle));
        for (let k = 0; k <= n; k++, angle += angleInc) {
            lineTo(cX + radius * Math.cos(angle), cY + radius * Math.sin(angle));
        }
    }

    const turtle = (n, angle, Fn) => {
        for (let i = 0; i < n; i++) {
            Fn();
            turn(angle);
        }
    }

    const makeNGon = (R, N) => {

        const deltaAngle = 2 * Math.PI / N;

        return Array.from({length: N}, (_, i) => {
            const angle = i * deltaAngle;
            return {x: R * Math.cos(angle), y: R * Math.sin(angle)};
        });
    };

    /* returns a unit vector from P -> Q */
    const createDirectionVector = (P, Q) => {

        let out = vec3.sub(vec3.create(), Q, P);
        return vec3.normalize(vec3.create(), out);
    }

    const affineCombination = (P, U, scale) => {
        return vec3.scaleAndAdd(vec3.create(), P, U, scale);
    }

    //const radsToDegs = rad => rad * 180 / Math.PI;
    const radsToDegs = (rad, normalize = false) => {
        return normalize === true ? ((rad * 180 / Math.PI) + 360) % 360 : rad * 180 / Math.PI;
    }

    const degsToRads = deg => (deg * Math.PI) / 180.0;

    const lerp = (a, b, t) => {

        let dir = vec3.sub(vec3.create(), b, a);
        return vec3.scaleAndAdd(vec3.create(), a, dir, t);
    }

    const bisector = (U, V, t) => {
        const bisector = vec3.lerp(vec3.create(), U, V, 0.5);
        return vec3.normalize(vec3.create(), bisector);
    }

    // 0 - colinear
    // -1 - clockwise
    // 1 - ccw
    const orientation = (p1, p2, p3) => {
        let val = (p2[1] - p1[1]) * (p3[0] - p2[0]) - (p2[0] - p1[0]) * (p3[1] - p2[1]);
        return val === 0 ? 0 : val > 0 ? -1 : 1;
    }

    // Function to calculate the center of the excircle
    const excircle = (A, B, C) => {
        // Calculate vectors a, b, and c
        const a = vec3.sub(vec3.create(), B, A); // Vector AB:
        const b = vec3.sub(vec3.create(), C, B); // Vector BC:
        const c = vec3.sub(vec3.create(), C, A); // Vector CA:

        // Calculate the perpendicular vector to a
        const a_perp = perp(vec3.create(), a); // Perpendicular to vector AB:

        // Calculate dot products
        const b_dot_c = vec3.dot(b, c); // Dot product of BC and CA:
        const a_perp_dot_c = vec3.dot(a_perp, c); // Dot product of a_perp and CA:

        // Calculate the scaled perpendicular vector
        const scaled_a_perp = vec3.scale(vec3.create(), a_perp, b_dot_c / a_perp_dot_c);

        // Add vectors a and scaled_a_perp
        const result = vec3.add(vec3.create(), a, scaled_a_perp);

        // Scale the result by 0.5
        const temp = vec3.scale(vec3.create(), result, 0.5);

        // Calculate the center of the excircle
        const center = vec3.add(vec3.create(), A, temp);

        // Calculate the radius of the excircle
        const radius = (vec3.length(a) / 2) * Math.sqrt((b_dot_c / a_perp_dot_c) ** 2 + 1);

        // Return the center and radius
        return {center, radius};
    };

    const incircle = (A, B, C) => {

        const a = vec3.sub(vec3.create(), B, A); // Vector a = B - A:
        const b = vec3.sub(vec3.create(), C, B); // Vector b = C - B:
        const c = vec3.sub(vec3.create(), C, A); // Vector c = C - A:

        const aNormalized = vec3.normalize(vec3.create(), a);
        const bNormalized = vec3.normalize(vec3.create(), b);
        const cNormalized = vec3.normalize(vec3.create(), c);

        const La = (vec3.length(a) + vec3.length(c) - vec3.length(b)) * 0.5;
        const Lb = (vec3.length(a) + vec3.length(b) - vec3.length(c)) * 0.5;

        const R = vec3.add(vec3.create(), A, vec3.scale(vec3.create(), aNormalized, La));
        const S = vec3.add(vec3.create(), B, vec3.scale(vec3.create(), bNormalized, Lb));
        const T = vec3.add(vec3.create(), A, vec3.scale(vec3.create(), cNormalized, La));

        return {R, S, T};

    }


    const perp2D = (v) => vec3.fromValues(-v[1], v[0], 0);

    const computeNinePointCircle = (A, B, C) => {
        // Create sides of the triangle
        const sideAB = createLine({type: 'points', p1: A, p2: B});
        const sideBC = createLine({type: 'points', p1: B, p2: C});
        const sideCA = createLine({type: 'points', p1: C, p2: A});

        // Compute midpoints of each side
        const midAB = sideAB.lerp(0.5);
        const midBC = sideBC.lerp(0.5);
        const midCA = sideCA.lerp(0.5);

        // Find altitudes (perpendiculars from each vertex to the opposite side)
        const perpBC = perp2D(vec3.sub(vec3.create(), C, B));
        const perpCA = perp2D(vec3.sub(vec3.create(), A, C));
        const perpAB = perp2D(vec3.sub(vec3.create(), B, A));

        const altitudeA = createLine({type: 'point-dir', p1: A, p2: perpBC});
        const altitudeB = createLine({type: 'point-dir', p1: B, p2: perpCA});
        const altitudeC = createLine({type: 'point-dir', p1: C, p2: perpAB});

        // Find feet of the altitudes
        const footA = altitudeA.intersect(sideBC).point;
        const footB = altitudeB.intersect(sideCA).point;
        const footC = altitudeC.intersect(sideAB).point;

        // Find orthocenter (intersection of altitudes)
        const orthocenter = altitudeA.intersect(altitudeC).point;

        // Compute midpoints from each vertex to the orthocenter
        const midAO = createLine({type: 'points', p1: A, p2: orthocenter}).lerp(0.5);
        const midBO = createLine({type: 'points', p1: B, p2: orthocenter}).lerp(0.5);
        const midCO = createLine({type: 'points', p1: C, p2: orthocenter}).lerp(0.5);

        const {center, radius} = excircle(midAB, midBC, midCA);

        const ccenter = center;
        const rradius = radius;

        // Return the structure
        return {
            midpoints: {midAB, midBC, midCA},
            feetOfAltitudes: {footA, footB, footC},
            midpointsToOrthocenter: {midAO, midBO, midCO},
            ninePointCircle: {ccenter, rradius}
        };
    };


    const arcTo = (P, Q, R) => {

        sk.stroke(255, 20, 12);
        sk.strokeWeight(2);

        /* normalized vector from P to Q */
        const U = createDirectionVector(P, CP);
        const V = createDirectionVector(P, Q);

        const U_dot_V = vec3.dot(U, V); // cosine of angle since U & V are normalized
        const tanHalfTheta = Math.sqrt((1 - U_dot_V) / (1 + U_dot_V)); // half angle
        const length = R / tanHalfTheta;

        const A = affineCombination(P, U, length);
        const B = affineCombination(P, V, length);

        const h = Math.sqrt(length ** 2 + R ** 2);

        let bisector = lerp(U, V, 0.5);
        bisector = vec3.normalize(vec3.create(), bisector);

        const C = affineCombination(P, bisector, h);

        moveTo(CP[0], CP[1]);
        //sk.ellipse(CP[0], CP[1], 8, 8);

        //sk.stroke(255, 20, 255);
        lineTo(A[0], A[1]);

        let a = vec3.subtract(vec3.create(), A, C);
        let b = vec3.subtract(vec3.create(), B, C);

        const getAngles = (a, b) => [
            radsToDegs(Math.atan2(a[1], a[0])),
            radsToDegs(Math.atan2(b[1], b[0])),
        ];

        const [COLLINEAR, CLOCKWISE, COUNTERCLOCKWISE] = [0, -1, 1];

        const orientationVal = orientation(CP, P, Q);

        if (orientationVal === COLLINEAR) return;

        /* arc will always be drawn ccw */
        /* determine startAngle, endAngle based on orientation */
        const [startAngle, endAngle] = getAngles(
            orientationVal === COUNTERCLOCKWISE ? a : b,
            orientationVal === COUNTERCLOCKWISE ? b : a);

        const sweepAngle = (endAngle < startAngle ? endAngle + 360 : endAngle) - startAngle;

        //console.log(startAngle);
        //console.log(endAngle);
        //console.log(sweepAngle);

        //sk.ellipse(C[0]+b[0], C[1]+b[1], 8, 8);
        //sk.ellipse(C[0]+a[0], C[1]+a[1], 2, 2);


        //sk.stroke(255, 20, 12);
        drawArc(C[0], C[1], R, startAngle, sweepAngle);
        //sk.stroke(255, 20, 255);
        if (orientationVal === CLOCKWISE) moveTo(B[0], B[1]);
        lineTo(Q[0], Q[1]);
    }

    const perp = (out, a) => {
        out[0] = -a[1];
        out[1] = a[0];
        out[2] = 0;
        return out;
    }

    const line = (line) => {

        const {initial, terminal} = line;
        const dir = createDirectionVector(initial, terminal);

        return {
            initial,
            dir
        }
    }

    const isBetweenZeroAndOne = (num) => num >= 0 && num <= 1;


    const intersect = (L1, L2) => {
        let A = L1.initial;
        let b = L1.dir;

        let C = L2.initial;
        let d = L2.dir;


        let c = vec3.sub(vec3.create(), C, A);
        let denom = vec3.dot(perp(d), b);

        let t = vec3.dot(perp(d), c) / denom;
        let u = vec3.dot(perp(b), c) / denom;

        if (isBetweenZeroAndOne(t) && isBetweenZeroAndOne(u)) {
            let intersection = affineCombination(A, b, t);
        }
    }

    /**
     * Factory function to create a line object with parametric representation.
     * Supports creation from either two points or a point and a direction vector.
     * @param {object} config - Configuration object for the line.
     * @param {string} config.type - Indicates how to interpret the parameters ('point-dir' or 'points').
     * @param {vec3} config.p1 - A point on the line or the start point of the line segment.
     * @param {vec3} config.p2 - Either the direction vector or the end point of the line segment.
     * @param {vec3} config.isSegment - Type of line - line segment or unbounded line
     * @returns {object} - The line object with properties and methods to interact with it.
     */
    const createLine = ({type, p1, p2}) => {

        const initializers = {
            'point-dir': () => ({point: vec3.clone(p1), dir: vec3.clone(p2)}),
            'points': () => {
                const dir = vec3.subtract(vec3.create(), p2, p1);
                return {point: vec3.clone(p1), dir};
            }
        };

        const {point, dir} = initializers[type]();

        const isBetweenZeroAndOne = (value) => value >= 0 && value <= 1;
        const perp = (v) => vec3.fromValues(-v[1], v[0], 0);

        const lerp = t => vec3.scaleAndAdd(vec3.create(), point, dir, t);

        const intersect = (L, isSegment = false) => {
            const A = point, b = dir;
            const C = L.point(), d = L.dir();

            const c = vec3.subtract(vec3.create(), C, A);
            const denom = vec3.dot(perp(d), b);

            if (denom === 0) {
                // Lines are parallel
                const collinear = vec3.dot(perp(b), c) === 0;
                if (!collinear) {
                    return {type: 'none'};
                }

                // Lines are collinear, check for overlap
                const t0 = vec3.dot(b, c) / vec3.dot(b, b);
                const t1 = vec3.dot(b, vec3.subtract(vec3.create(), vec3.add(vec3.create(), C, d), A)) / vec3.dot(b, b);

                if (t0 > t1) [t0, t1] = [t1, t0];

                if (t0 > 1 || t1 < 0) {
                    return {type: 'none'};
                }

                const overlapStart = Math.max(0, t0);
                const overlapEnd = Math.min(1, t1);

                return overlapStart === overlapEnd
                    ? {type: 'one', point: lerp(overlapStart)}
                    : {type: 'many', interval: [overlapStart, overlapEnd, lerp(overlapStart), lerp(overlapEnd)]};
            }

            const t = vec3.dot(perp(d), c) / denom;
            const u = vec3.dot(perp(b), c) / denom;

            if (isSegment && (!isBetweenZeroAndOne(t) || !isBetweenZeroAndOne(u))) {
                return {type: 'none'};
            }

            return {type: 'one', point: lerp(t)};
        };

        const draw = () => {
            const endPoint = type === 'point-dir' ? lerp(1) : vec3.clone(p2);
            moveTo(point[0], point[1]);
            lineTo(endPoint[0], endPoint[1]);
        };

        const perpAt = (t) => {
            const start = lerp(t);
            const perpDir = perp(dir);
            return createLine({type: 'point-dir', p1: start, p2: perpDir});
        }


        return {
            point: (() => vec3.clone(point))(),
            dir: (() => vec3.clone(dir))(),
            lerp,
            intersect,
            perpAt,
            draw
        };
    };


    /**
     * Creates a polygon object with vertices, edges, normals, and a draw method.
     * @param {Array} vertices - The list of vertices defining the polygon.
     * @param {Object} sk - The p5.js sketch object.
     * @returns {Object} The polygon object.
     */
    const createPolygon = (vertices) => {
        const edges = vertices.map((start, i) => {
            const end = vertices[(i + 1) % vertices.length];
            const direction = vec3.sub(vec3.create(), end, start);
            const normal = vec3.negate(vec3.create(), vec3.normalize(vec3.create(), perp2D(direction)));
            const translation = vec3.dot(normal, start);
            return {edge: {start, end, edgeVec: direction}, normal, translation};
        });

        const draw = () => {
            moveTo(vertices[0][0], vertices[0][1]);
            for (let i = 1; i < vertices.length; i++) {
                lineTo(vertices[i][0], vertices[i][1]);
            }
            lineTo(vertices[0][0], vertices[0][1]);
        };

        return {edges, draw};
    };

    const cyrusBeckClipper = (polygon) => {
        const {edges} = polygon;

        return (line) => {
            const p1 = line.point;
            const d = line.dir;
            let tE = 0.0;
            let tL = 1.0;

            for (const {edge: {start: p}, normal: n} of edges) {
                const w = vec3.subtract(vec3.create(), p, p1);
                const num = vec3.dot(n, w);
                const denom = vec3.dot(n, d);

                if (denom !== 0) {
                    const t = num / denom;
                    if (denom < 0) {
                        // Ray is entering the polygon
                        tE = Math.max(tE, t); // Update entry time to the maximum
                    } else {
                        // Ray is exiting the polygon
                        tL = Math.min(tL, t); // Update exit time to the minimum
                    }
                } else if (num < 0) {
                    // Line is parallel to the edge and outside the polygon
                    return null; // Parallel and outside window
                }
            }

            // If the entry time is less than or equal to the exit time, there is a visible part
            if (tE <= tL) {
                const newP1 = vec3.add(vec3.create(), p1, vec3.scale(vec3.create(), d, tE));
                const newP2 = vec3.add(vec3.create(), p1, vec3.scale(vec3.create(), d, tL));
                return createLine({type: 'points', p1: newP1, p2: newP2});
            }

            return null; // No visible part
        };
    };

    const cyrusBeckClipperNonConvex = (polygon) => {
        const {edges} = polygon;

        return (line) => {
            const {A, C} = line;

            for (const {edge: {start: p}, normal: n} of edges) {
                const w = vec3.subtract(vec3.create(), p, p1);
                const num = vec3.dot(n, w);
                const denom = vec3.dot(n, d);
            }

            for (const {edge: {start: p, edgeVec}} of edges) {
                // Perform intersection logic
                const b = vec3.subtract(vec3.create(), p, A);
                // const
                // const t = vec3.dot(perp2D(edgeVec), b) /
            }
        }


        return {
            viewport: {sx, sy, tx, ty},

            moveTo,
            lineTo,
            moveRel,
            lineRel,
            turn,
            turnTo,
            forward,
            polySpiral,
            drawArc,
            arcTo,
            excircle,
            incircle,
            createLine,
            createPolygon,
            cyrusBeckClipper,
            computeNinePointCircle
        }
    }
}
