export const createStack = () => {
    let items = [];

    const push = (element) => items.push(element);

    const pop = () => {
        if (isEmpty()) {
            return 'Underflow';
        }
        return items.pop();
    };

    const peek = () => items[items.length - 1];

    const isEmpty = () => items.length === 0;

    const size = () => items.length;

    const clear = () => {
        items = [];
    };

    const toString = () => items.join(' ');

    return {
        push,
        pop,
        peek,
        isEmpty,
        size,
        clear,
        toString,
    };
};


