'use strict';

/**
 * Creates a Priority Queue with a binary heap
 *
 * @param {Object} params - The parameters for creating the Priority Queue.
 * @param {number} params.capacity - The initial capacity of the Priority Queue. Default is 15.
 * @param {Function} params.comparator - The comparator function used to order elements. Default is null, which means elements are ordered using the '<' operator.
 *
 * @returns {Object} The created Priority Queue.
 */
export const createPQ = ({capacity = 15, comparator} = {}) => {
    // The Priority Queue array
    const pq = new Array(capacity + 1);
    // The number of elements in the Priority Queue
    let size = 0;

    /**
     * Checks if an element at index i is less than an element at index j.
     *
     * @param {number} i - The index of the first element.
     * @param {number} j - The index of the second element.
     *
     * @returns {boolean} true if the element at index i is less than the element at index j, otherwise false.
     */
    const less = (i, j) => comparator == null ? pq[i] < pq[j] : comparator(pq[i], pq[j]) < 0;

    /**
     * Swaps the elements at the given indices.
     *
     * @param {number} i - The index of the first element.
     * @param {number} j - The index of the second element.
     */
    const exch = (i, j) => {
        [pq[i], pq[j]] = [pq[j], pq[i]];
    };

    /**
     * Checks if the Priority Queue is empty.
     *
     * @returns {boolean} true if the Priority Queue is empty, otherwise false.
     */
    const isEmpty = () => size === 0;


    /**
     * The "swim" operation for a binary heap.
     *
     * This function is used to restore the heap invariant after an element is inserted
     * at the end of the heap. It does this by "swimming" the element up the heap until
     * it's no longer larger than its parent.
     *
     * @param {number} k - The index of the heap element to swim.
     */
    const swim = k => {
        let parent = Math.floor(k / 2);
        while (k > 1 && less(parent, k)) {
            exch(parent, k);
            k = parent;
            parent = Math.floor(k / 2);
        }
    }

    /**
     * The "sink" operation for a binary heap.
     *
     * This function is used to restore the heap invariant after the root of the heap
     * is removed. It does this by "sinking" the root down the heap until it's no longer
     * smaller than either of its children.
     *
     * @param {number} k - The index of the heap element to sink.
     */
    const sink = k => {
        while (2 * k <= size) {
            let j = 2 * k;
            if (j < size && less(j, j + 1)) j++;
            if (!less(k, j)) break;
            exch(k, j);
            k = j;
        }
    }

    /**
     * Resize the underlying array to have the given capacity.
     *
     * @param  capacity The new capacity of the underlying array.
     */
    const resize = (capacity) => {

        let temp = new Array(capacity);

        // Copy elements from the old array to the new array using destructuring
        [...temp] = pq;

        // Update the reference of pq to point to the new array
        pq = temp;
    }

    /**
     * Adds a new key to this priority queue.
     *
     * @param  x the new key to add to this priority queue
     */
    const insert = x => {

        // double size of array if necessary
        if (size === pq.length - 1) resize(2 * pq.length);

        // add x, and percolate it up to maintain heap invariant
        pq[++size] = x;
        swim(size);
    }

    const initializeWithArray = arr => {
        arr.forEach(element => insert(element));
    }

    const isBinaryHeap = (i = 1) => {
        const left = 2 * i;
        const right = 2 * i + 1;

        // If current node is less than its left child or right child, then it's not a max heap
        if ((left < pq.length && less(i, left)) || (right < pq.length && less(i, right))) {
            return false;
        }

        // Recur for left and right children if they exist
        return (left >= pq.length || isBinaryHeap(left)) && (right >= pq.length || isBinaryHeap(right));
    }

    /**
     * Removes and returns the largest key on this priority queue.
     *
     * @throws Error if this priority queue is empty
     */
    const delMax = () => {

        let max = pq[1];
        [pq[1], pq[size]] = [pq[size], pq[1]]; // swap using destructuring
        size--; // decrease the size of the queue
        sink(1); // sink the item at index 1 to its rightful position

        return max;
    }

    const printPriorityQueue = (index = 1, depth = 0) => {

        if (index < pq.length) {
            const indent = ' '.repeat(depth * 4);

            console.log(`${indent}Node ${index}: ${pq[index]}`);
            console.log(`${indent}Left:`);
            printPriorityQueue(2 * index, depth + 1);
            console.log(`${indent}Right:`);
            printPriorityQueue(2 * index + 1, depth + 1);
        }
    }

    return {
        isEmpty,
        insert,
        delMax,
        isBinaryHeap,
        printPriorityQueue,
        initializeWithArray,
    };
}
