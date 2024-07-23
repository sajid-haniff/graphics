import {createGraphicsContext2} from "../../../graphics_context2";
import {createVehicle} from "./vehicle";
import {createAttractor} from "./attractor";

export const sketchBuilder = (sk, CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400) => {

   let vehicles = [];
   let attractor;

    /* setup drawing area */
    let win  = { left: -100, right: 100, top: 100, bottom: -100}
    let view = { left:   0, right:  1, top:  1, bottom:   0}

    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    return {

        setup: () => {

            const canvas = sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.id('canvas');
            sk.background(40);

            for (let i = 0; i < 1; i++) {
               vehicles.push(createVehicle(sk, sk.random(-100,100), sk.random(-100,100), sk.random(1, 2)));
            }
            attractor = createAttractor(sk, CANVAS_WIDTH, CANVAS_HEIGHT)

        },
        display: () => {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(51);
            attractor.display();

            for (let i = 0; i < vehicles.length; i++) {
                let force = attractor.attract(vehicles[i]);
                vehicles[i].applyForce(force);

                vehicles[i].update();
                vehicles[i].display();
            }
        }
    }
}
