import * as p5 from '../../lib/p5';
import {sketchBuilder} from './bouncing_ball_acceleration'

let p = (sk) => {

    let sketch = sketchBuilder(sk);

    sk.preload = () => {

    }

    sk.setup = () => {

        sketch.setup();

        //sk.frameRate(1);
    }

    sk.draw = () => {

        sketch.update();
        sketch.checkEdges();
        sketch.display();
    }
}

const P5 = new p5(p);
