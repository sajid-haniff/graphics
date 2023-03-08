import * as p5 from './lib/p5';
import {sketchBuilder} from './noc/bouncing_ball_acceleration'

let p = (sk) => {

    let sketch = sketchBuilder(sk);

    sk.preload = () => {
        //sketch5.preload();
    }

    sk.setup = () => {
        sketch.setup();
        //sk.frameRate(1);
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

        sketch.update();
        sketch.checkEdges();
        sketch.display();
    }
}

const P5 = new p5(p);
