/**
 * Recursively sorts a subarray using the QuickSort algorithm.
 *
 * @param {Array} arr - The array to be sorted.
 * @param {number} [low=0] - The starting index of the subarray to be sorted.
 * @param {number} [high=arr.length-1] - The ending index of the subarray to be sorted.
 * @return {Array} - The sorted array.
 */
export const quick_sort = (arr, low = 0, high = arr.length - 1) => {

    if( low < high )
    {
        let pivot_pos = partition(arr, low, high);
        quick_sort(arr, low, pivot_pos-1);
        quick_sort(arr, pivot_pos+1, high)
    }

    return arr;
}

/**
 * Partitions an array around a pivot, chosen from the middle of the segment
 * defined by indices `low` and `high`. Elements less than the pivot are moved
 * before it, and elements greater than or equal to the pivot are moved after it.
 *
 * @param {Array} arr - The array to be partitioned.
 * @param {number} low - The lower index of the segment to be partitioned.
 * @param {number} high - The upper index of the segment to be partitioned.
 * @returns {number} The final position of the pivot in the array.
 */
export const partition = (arr, low, high) => {
    // Error checking
    if (!Array.isArray(arr)) {
        throw new TypeError('First argument must be an array');
    }
    if (!Number.isInteger(low) || !Number.isInteger(high)) {
        throw new TypeError('Low and high must be integers');
    }
    if (low < 0 || high >= arr.length || low > high) {
        throw new RangeError('Invalid low or high');
    }

    const mid = Math.floor((low + high) / 2);

    // Swap the first element with the pivot
    [arr[low], arr[mid]] = [arr[mid], arr[low]];
    const pivot = arr[low];

    let lastSmall = low;

    // Partition elements around the pivot
    for (let i = low + 1; i <= high; i++) {
        if (arr[i] < pivot) {
            lastSmall++;
            [arr[lastSmall], arr[i]] = [arr[i], arr[lastSmall]];
        }
    }

    // Move pivot to its final place
    [arr[low], arr[lastSmall]] = [arr[lastSmall], arr[low]];

    return lastSmall;
};

