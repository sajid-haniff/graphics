import * as p5 from './lib/p5';
import {rosetteBuilder} from './rosette_builder'

let p = (sk) => {

    let rosette;

    sk.setup = () =>{

        const width = 400;
        const height = 400;

        //  sk.pixelDensity(1);
        const canvas = sk.createCanvas(width,height);
        canvas.id('canvas');
        sk.background(40);

        rosette = rosetteBuilder(5, sk);
    }

    sk.draw = () =>{

        /*onst width = 400;
        const height = 400;

        let win = {
            left:   -10,
            right:   10,
            top:     10,
            bottom: -10
        }

        let viewport = {
            left:   0,
            right:   1,
            top:    1,
            bottom: 0
        }

        let tmp1 = (win.right - win.left);
        let tmp2 = (win.top - win.bottom);

        let sx = (viewport.right - viewport.left) / tmp1;
        let sy = (viewport.top - viewport.bottom) / tmp2;

        let tx = (viewport.left * win.right - viewport.right * win.left) / tmp1;
        let ty = (viewport.bottom * win.top - viewport.top * win.bottom) / tmp2;

        sk.drawingContext.transform(1, 0, 0, -1, 0, height);
        sk.drawingContext.transform(width, 0, 0, height,0, 0);
        sk.drawingContext.transform(sx, 0, 0, sy, tx, ty);

         */

        rosette.draw(sk);
    }




}

const P5 = new p5(p);
