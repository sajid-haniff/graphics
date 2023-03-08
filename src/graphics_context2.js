import * as vec3 from "./lib/esm/vec3";

export const createGraphicsContext2 = (window, viewport, WIDHT = 400, HEIGHT= 400, sk) => {

    /** global current position **/
    let CP = vec3.fromValues(0.0, 0.0, 1.0 );

    let CD = 0.0;

    const turn = (angle) => { CD += angle };

    const turnTo = (angle) => { CD = angle };

    const forward = (dist, isVisible = true) => {

        const RadPerDegree = 0.017453393;
        let x = CP[0] + dist * Math.cos(RadPerDegree * CD);
        let y = CP[1] + dist * Math.sin(RadPerDegree * CD);

        if(isVisible)
            lineTo(x, y, sk);
        else
            moveTo(x, y);
    }

    const moveTo = (x, y) => {
        CP = vec3.fromValues(x, y, 1.0);
    }

   const lineTo = (x, y, sk) => {

        sk.line(CP[0], CP[1], x, y);
        CP = vec3.fromValues(x, y, 1.0);
    }

    const moveRel = (dx, dy) => {
        CP = vec3.fromValues(CP[0] + dx, CP[1] + dy, 1);
    }

    const lineRel = (dx, dy, sk) => {

        let end = vec3.fromValues(CP[0] + dx, CP[1] + dy, 1);
        sk.line(CP[0], CP[1], end[0], end[1]);

        CP = end;
    }

    const mouseToWindowCoordinates = (sk) => {

        const currentTransformationMatrix   = sk.drawingContext.getTransform();
        const deviceToWindow = currentTransformationMatrix.invertSelf();
        const point = new DOMPoint(sk.mouseX, sk.mouseY);
        return point.matrixTransform(deviceToWindow);
    }

    /* Viewport Transformation */

    const {left: win_left,  right: win_right,  top: win_top,  bottom: win_bottom} = window;
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

    const {left: x_min,  right: x_max,  top: y_max,  bottom: y_min} = window;

    const code = (x, y) =>  {
        return ((x < x_min) << 3) | ((x > x_max) << 2) | ((y < y_min) << 1) | (y > y_max);
    }

    const clip_draw = (xP, yP, xQ, yQ) => {

        let cP = code(xP, yP);
        let cQ = code(xQ, yQ);

        while (cP | cQ) {
            if( cP & cQ ) return

            let dx = xQ - xP;
            let dy = yQ - yP;

            if (cP) {
                if (cP & 8) yP += (x_min-xP)*dy/dx, xP=x_min; else
                if (cP & 4) yP += (x_max-xP)*dy/dx, xP=x_max; else
                if (cP & 2) xP += (y_min-yP)*dx/dy, yP=y_min; else
                if (cP & 1) xP += (y_max-yP)*dx/dy, yP=y_max;
                cP = code(xP, yP);
            } else
            {
                if (cQ & 8) yQ += (x_min-xQ)*dy/dx, xQ=x_min; else
                if (cQ & 4) yQ += (x_max-xQ)*dy/dx, xQ=x_max; else
                if (cQ & 2) xQ += (y_min-yQ)*dx/dy, yQ=y_min; else
                if (cQ & 1) xQ += (y_max-yQ)*dx/dy, yQ=y_max;
                cQ = code(xQ, yQ);
            }
        }

        sk.stroke(1);
        sk.strokeWeight(2);
        sk.fill(227);
        sk.ellipse(xP, yP, 8, 8);
        sk.ellipse(xQ, yQ, 8, 8);

        moveTo(xP, yP);
        lineTo(xQ, yQ, sk)
    }

    return {
        viewport: { sx, sy, tx, ty },

        clip_draw,
        moveTo,
        lineTo: (x, y) => lineTo(x, y, sk),

        moveRel,
        lineRel: (dx, dy) => lineRel(dx, dy, sk),
        //clip: (xP, yP, xQ, yQ) => clip_draw(xP, yP, xQ, yQ)

        turn,
        turnTo,
        forward
    }
}
