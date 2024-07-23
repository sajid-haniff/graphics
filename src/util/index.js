import * as p5 from '../lib/p5';

const demos = {
    'excircle': () => import('./excircle'),
    'ninePointCircle': () => import('./ninePointCircle'),
    'incircle': () => import('./incircle')
    // Add more demos here as needed
};

const demoName = 'excircle'; // Specify the default demo or change it as needed

const runDemo = async (demoName) => {
    if (!demos[demoName]) {
        console.error(`Demo ${demoName} not found`);
        return;
    }

    const { default: demoFunction } = await demos[demoName]();

    let p = (sk) => {
        let sketch = demoFunction(sk);

        sk.setup = () => {
            sketch.setup();
        }

        sk.draw = () => {
            sketch.display();
        }
    }

    new p5(p);
}

runDemo(demoName);
