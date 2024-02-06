import * as p5 from '../../../lib/p5';
import {sketchBuilder} from './forces_angular'

let p = (sk) => {

    let sketch = sketchBuilder(sk);

    sk.preload = () => {

    }

    sk.setup = () => {

        sketch.setup();
    }

    sk.draw = () => {

        sketch.display();
    }
}

const P5 = new p5(p);
