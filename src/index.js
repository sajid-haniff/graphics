import * as p5 from './lib/p5';
//import {sketchBuilder} from './bouncing_ball_no_vectors'
//import {sketchBuilder} from './bouncing_ball_vector'
//import {sketchBuilder} from './bouncing_ball_acceleration'
//import {sketchBuilder} from './bouncing_ball_force'
import {circleRecursionBuilder} from './recursion/circle_recursion'
import {hTreeBuilder} from './recursion/htree'
import {brownianBuilder} from "./recursion/brownian";

let p = (sk) => {

    //let sketch = sketchBuilder(sk);
    let sketch1 = circleRecursionBuilder(sk);
    let sketch2 = hTreeBuilder(sk);
    let sketch3 = brownianBuilder(sk);

    sk.setup = () => {

        sketch1.setup();
        sketch2.setup();
        sketch3.setup();
        sk.frameRate(1);
    }

    sk.draw = () =>{

        //sketch.draw();

        /*
        let gravity = sk.createVector(0, -0.01);
        sketch.applyForce(gravity);

        if (sk.mouseIsPressed) {
            let wind = sk.createVector(0.1, 0);
            sketch.applyForce(wind);
        }



        sketch.update();
        sketch.checkEdges();
        sketch.display();
        */

        sketch1.display();
        sketch2.display();
        sketch3.display();

    }
}

const P5 = new p5(p);
