import { editDistance } from './min-edit';

export const createMinEditDemo = (sk) => {
    return {
        setup() {
            sk.noLoop();
            console.log("Min Edit Distance Demo Initialized.");
        },
        display() {
            const word1 = "sunny";
            const word2 = "snowy";
            const distance = editDistance(word1, word2);

            console.log(`Edit distance between "${word1}" and "${word2}" is:`, distance);
        }
    };
};