import * as p5 from './lib/p5';
import {heapTester} from "./algorithm/heapTester";

let p = (sk) => {

    let sketch = heapTester(sk);

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
