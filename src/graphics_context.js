import * as vec3 from "./lib/esm/vec3";

/** global current position **/
export var CP = vec3.fromValues(0.0, 0.0, 1.0 );

export const moveTo = (x, y) => {
    CP = vec3.fromValues(x, y, 1.0);
}

export const lineTo = (x, y, sk) => {

    sk.line(CP[0], CP[1], x, y);
    CP = vec3.fromValues(x, y, 1.0);
}

/**
 * Relative move
 *
 * @param {dx} X displacement
 * @param {dy} Y displacement
 *
 */
export const moveRel = (dx, dy) => {

    CP = vec3.fromValues(CP[0] + dx, CP[1] + dy, 1);
}

export const lineRel = (dx, dy, sk) => {

    let end = vec3.fromValues(CP[0] + dx, CP[1] + dy, 1);
    sk.line(CP[0], CP[1], end[0], end[1]);

    CP = end;
}

export const mouseToWindowCoordinates = (sk) => {

    const currentTransformationMatrix   = sk.drawingContext.getTransform();
    const deviceToWindow = currentTransformationMatrix.invertSelf();
    const point = new DOMPoint(sk.mouseX, sk.mouseY);
    return point.matrixTransform(deviceToWindow);

}




export const createGraphicsContext = (window, viewport, WIDHT = 400, HEIGHT= 400) => {

    /* destructure */
    const {left: win_left,  right: win_right,  top: win_top,  bottom: win_bottom} = window;
    const {left: view_left, right: view_right, top: view_top, bottom: view_bottom} = viewport;

    let tmp1 = (win_right - win_left);
    let tmp2 = (win_top - win_bottom);

    let sx = (view_right - view_left) / tmp1;
    let sy = (view_top - view_bottom) / tmp2;

    let tx = (view_left * win_right - view_right * win_left) / tmp1;
    let ty = (view_bottom * win_top - view_top * win_bottom) / tmp2;

    //console.log(win_left +' '+win_right);

    return {
        sx,
        sy,
        tx,
        ty
    }
}
