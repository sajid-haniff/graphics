
export const shuffle = (array) => {
    for (let currentIndex = array.length - 1; currentIndex > 0; currentIndex--) {
        const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
};

export const quicksortPartition = (arr, low, high) => {
    const pivot = arr[high];
    let i = low;
    let j = high - 1;

    while (i <= j) {
        while (arr[i] < pivot && i <= j) {
            i++;
        }

        while (arr[j] > pivot && j >= i) {
            j--;
        }

        if (i <= j) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            i++;
            j--;
        }
    }

    [arr[i], arr[high]] = [arr[high], arr[i]];
    return i;
};

