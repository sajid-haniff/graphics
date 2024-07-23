import * as p5 from '../../lib/p5';
import {bstTester} from "./bstTester";

let p = (sk) => {

    let sketch = bstTester(sk);

    sk.preload = () => {
        sketch.preload();
    }

    sk.setup = () => {
        sketch.setup();
    }

    sk.draw = () =>{
    }
}

const P5 = new p5(p);
