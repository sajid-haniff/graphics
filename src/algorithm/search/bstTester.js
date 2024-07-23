import {createBinarySearchTree} from "./bst"

export const bstTester = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

    return {

        preload: () => {

        },
        setup: () => {

            sk.noCanvas();

            // Initialize an empty priority queue with a capacity of 5
            const bst = createBinarySearchTree();

            bst.insert(8);
            bst.insert(3);
            bst.insert(10);
            bst.insert(1);
            bst.insert(6);
            bst.insert(14);
            bst.insert(9);

            /*
            ASCII Diagram of the BST Structure:

            8
           / \
          3   10
         / \    \
        1   6    14
                /
               9
             */

            let result = [];
            bst.traverse(key => result.push(key), 'preOrder');
            console.log("Pre-order traversal results:", result);  // Expected output: [8, 3, 1, 6, 10, 14, 9]

            result = [];
            bst.traverse(key => result.push(key), 'inOrder');
            console.log("In-order traversal results:", result);  // Expected output: [8, 3, 1, 6, 10, 14, 9]

            result = [];
            bst.traverse(key => result.push(key), 'postOrder');
            console.log("post-order traversal results:", result);  // Expected output: [8, 3, 1, 6, 10, 14, 9]

        }
    }
}
