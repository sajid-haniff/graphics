import * as p5 from './lib/p5';



let p = (sk) => {

    let X = [];
    let Y = [];

    let rad = Math.PI / 180 * 20;
    let theta = 0;
    let radius = 9.0;

    sk.setup = () =>{

        const width = 400;
        const height = 400;

      //  sk.pixelDensity(1);
        const canvas = sk.createCanvas(width,height);
        canvas.id('canvas');
        sk.background(40);

        for(let i=0; i<18; i++)
        {
            X[i] = radius * Math.cos(theta);
            Y[i] = radius * Math.sin(theta);

            console.log(i + " " + X[i] + " " + Y[i]);

            theta += rad;
        }
    }

    sk.draw = () =>{

        const width = 400;
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

       // let txx = sk.drawingContext.getTransform();
       // console.log(txx);

       // sk.circle(0,0,5);

        /*
        sk.drawingContext.beginPath();
        sk.drawingContext.moveTo(-4,-4);
        sk.drawingContext.lineTo(4,-4);
        sk.drawingContext.lineTo(0,4);
        sk.drawingContext.lineTo(-4, -4);
        sk.drawingContext.fillStyle = "red";
        sk.drawingContext.fill();
*/




        sk.stroke(255,204,0);
        sk.strokeWeight(0.1);

        for (let i = 0; i < 18; i++)
        {
            for (let j = i + 1; j < 18; j++)
            {
                sk.line(X[i],Y[i], X[j],Y[j]);
            }
        }

        sk.stroke(255,0,0);
        sk.strokeWeight(0.1);

        for (let i = 0; i < 18; i++)
        {
            sk.circle(X[i],Y[i],0.2);
        }
    }




}

const P5 = new p5(p);
