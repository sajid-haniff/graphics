import {createGraphicsContext} from "../graphics_context";
import {createPQ} from "./heap"

export const heapTester = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

    return {

        preload: () => {

        },
        setup: () => {

            sk.noCanvas();

            // Initialize an empty priority queue with a capacity of 5
            const pq = createPQ({capacity: 5});

            // Test isEmpty on an empty queue
            console.log(pq.isEmpty() === true, 'Priority Queue should be empty.');

            // Insert elements
            pq.insert(5);
            pq.insert(2);
            pq.insert(9);

            // Test isEmpty on a non-empty queue
            console.log(pq.isEmpty() === false, 'Priority Queue should not be empty.');

            // Test the order of elements
            console.log(pq.delMax() === 9, 'delMax should return the largest element.');
            console.log(pq.delMax() === 5, 'delMax should return the second largest element.');
            console.log(pq.delMax() === 2, 'delMax should return the smallest element.');

            // Test isEmpty after removing all elements
            console.log(pq.isEmpty() === true, 'Priority Queue should be empty after removing all elements.');

            // Test isBinaryHeap on an empty queue
            console.log(pq.isBinaryHeap() === true, 'An empty Priority Queue should be a valid binary heap.');

            // Initialize with an array
            pq.initializeWithArray([1, 9, 5, 2, 7]);

            // Test the order of elements after initializing with an array
            console.log(pq.delMax() === 9, 'delMax should return the largest element after initializing with an array.');
            console.log(pq.delMax() === 7, 'delMax should return the second largest element after initializing with an array.');
            console.log(pq.delMax() === 5, 'delMax should return the third largest element after initializing with an array.');
            console.log(pq.delMax() === 2, 'delMax should return the second smallest element after initializing with an array.');
            console.log(pq.delMax() === 1, 'delMax should return the smallest element after initializing with an array.');

            // Test isBinaryHeap on a queue that has had all elements removed
            console.log(pq.isBinaryHeap() === true, 'A Priority Queue that has had all elements removed should be a valid binary heap.');

            // Print Priority Queue
            pq.initializeWithArray([1, 9, 5, 2, 7]);
            console.log('Printing Priority Queue:');
            pq.printPriorityQueue();
            
        }
    }
}
