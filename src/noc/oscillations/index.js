import * as p5 from '../../lib/p5';
import {sketchBuilder} from './angular_motion'

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
        sketch.display();
    }
}

const P5 = new p5(p);
