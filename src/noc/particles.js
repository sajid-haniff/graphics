import {createGraphicsContext} from "./graphics_context";
import * as p5 from './lib/p5';

export const sketchBuilder = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

    /* setup drawing area */
    let win  = { left: -100, right: 100, top: 100, bottom: -100}
    let view = { left:   0, right:  1, top:  1, bottom:   0}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    let position     = sk.createVector(-80, 100);
    let velocity     = sk.createVector(0, 0);
    let acceleration = sk.createVector(0, 0);
    let top_speed = 10;
    let mass = 1;


    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');

            sk.pixelDensity(1);
            sk.background(40);
        },
        update: () => {

            velocity.add(acceleration);
            velocity.limit(top_speed);
            position.add(velocity);
        },
        applyForce: (force) => {

            let f = p5.Vector.div(force, mass);
            acceleration.add(f);
        },
        display: () => {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            //console.log(sk.drawingContext.getTransform());

            //const {a: a, b: b, c: c, d: d, e: e, f: f}  = sk.drawingContext.getTransform();
            //console.log(`${a} ${b} ${c} ${d} ${e} ${f}`);
            //let current = mat3.fromValues(a, b, 0, c, d, 0, e, f, 1);
            //let inv = mat3.invert(current, current);
            //console.log(current);
            //let mouse = vec3.fromValues(sk.mouseX, sk.mouseY, 1);
            //console.log(vec3.transformMat3(mouse, mouse, inv));
            //console.log(sk.mouseX + " "  + sk.mouseY);

            sk.stroke(1);
            sk.strokeWeight(2);
            sk.fill(127);
            sk.ellipse(position.x, position.y, 48, 48);
        },
        checkEdges: () => {

            if (position.x > win.right)
            {
                position.x = win.right;
                velocity.x *= -1;
            }
            else if (position.x < win.left)
            {
                velocity.x *= -1;
                position.x = win.left;
            }
            if (position.y > win.top)
            {
                velocity.y *= -1;
                position.y = win.top;
            }
            if (position.y < win.bottom)
            {
                velocity.y *= -1;
                position.y = win.bottom;
            }
        }
    }
}
