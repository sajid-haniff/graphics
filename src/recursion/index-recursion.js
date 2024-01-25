import * as p5 from './lib/p5';
import {circleRecursionBuilder} from "./recursion/circle_recursion";

let p = (sk) => {

    let sketch = circleRecursionBuilder(sk);

    sk.preload = () => {

    }

    sk.setup = () => {
        sketch.setup();
    }

    sk.draw = () =>{
        sketch.display();
    }
}

const P5 = new p5(p);
