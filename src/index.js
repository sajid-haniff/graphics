import * as p5 from './lib/p5';
//import {sketchBuilder} from './bouncing_ball_no_vectors'
//import {sketchBuilder} from './bouncing_ball_vector'
//import {sketchBuilder} from './bouncing_ball_acceleration'
//import {sketchBuilder} from './bouncing_ball_force'
import {circleRecursionBuilder} from './circle_recursion'

let p = (sk) => {

    //let sketch = sketchBuilder(sk);
    let sketch = circleRecursionBuilder(sk);

    sk.setup = () => {

        sketch.setup();
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

        sketch.display();

    }
}

const P5 = new p5(p);
