import * as p5 from '../../lib/p5';
import {sketchBuilder2} from './csClipDemo'

let p = (sk) => {

    let sketch = sketchBuilder2(sk);


    sk.setup = () => {
        sketch.setup();
    }

    sk.draw = () =>{

        sketch.display();
    }
}

const P5 = new p5(p);
