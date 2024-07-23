import * as p5 from '../lib/p5';

const runDemo = (demoFunction, CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600) => {
    let p = (sk) => {
        let sketch = demoFunction(sk, CANVAS_WIDTH, CANVAS_HEIGHT);

        sk.setup = () => {
            sketch.setup();
        }

        sk.draw = () => {
            sketch.display();
        }
    }

    new p5(p);
}

export default runDemo;
