import {createGraphicsContext} from "../graphics_context";
import {shuffle} from "../algorithm/fischer_yates"


export const regexTester = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {
    /* setup drawing area */
    let win = {left: -100, right: 100, top: 100, bottom: -100}
    let view = {left: 0.5, right: 1, top: 0.5, bottom: 0}

    const {sx, sy, tx, ty} = createGraphicsContext(win, view, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Variable for array of lines
    let lines;
    // Variable where we'll join all the text together
    let txt;

    return {

        preload: () => {
            lines = sk.loadStrings('http://localhost:8081/spam.txt');
        },
        setup: () => {

            sk.noCanvas();
            // join() joins the elements of an array
            // Here we pass in a line break to retain formatting
            //txt = sk.join(lines, '<br/>');
            //let par = sk.createP(txt);
            //par.id('text');

            const array = [];
            for (let i = 1; i <= 50; i++) {
                array.push(i);
            }
            console.log(shuffle(array))


        }
    }
}
