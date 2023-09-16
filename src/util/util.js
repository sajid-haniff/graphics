export const compare = {
    LESS_THAN: -1,
    BIGGER_THAN: 1,
    EQUALS: 0
};

export const DOES_NOT_EXIST = -1;



export const lesserEquals = (a, b, compareFn) => {
    const comp = compareFn(a, b);
    return comp === Compare.LESS_THAN || comp === Compare.EQUALS;
};

export const biggerEquals = (a, b, compareFn) => {
    const comp = compareFn(a, b);
    return comp === Compare.BIGGER_THAN || comp === Compare.EQUALS;
};

export const defaultCompare = (a, b) => {
    if (a === b) {
        return Compare.EQUALS;
    }
    return a < b ? Compare.LESS_THAN : Compare.BIGGER_THAN;
};

export const defaultEquals = (a, b) => a === b;

export const defaultToString = (item) => {
    if (item === null) {
        return 'NULL';
    } else if (item === undefined) {
        return 'UNDEFINED';
    } else if (typeof item === 'string' || item instanceof String) {
        return `${item}`;
    }
    return item.toString();
};

export const swap = (array, a, b) => {
    [array[a], array[b]] = [array[b], array[a]];
};

export const reverseCompare = (compareFn) => (a, b) => compareFn(b, a);

export const defaultDiff = (a, b) => Number(a) - Number(b);



